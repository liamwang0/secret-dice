// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title SecretDice
/// @notice Two-player dice game using Zama FHE-powered randomness
contract SecretDice is ZamaEthereumConfig {
    uint256 public constant ENTRY_FEE = 0.0001 ether;
    uint256 public constant REWARD_AMOUNT = ENTRY_FEE * 2;

    enum GameStatus {
        WaitingForPlayers,
        WaitingForRolls,
        AwaitingReveal,
        Completed
    }

    struct Game {
        address creator;
        address[2] players;
        bool[2] hasRolled;
        euint32[2] encryptedRolls;
        uint32[2] revealedRolls;
        GameStatus status;
        address winner;
        bool rewardClaimed;
        bool[2] drawRefundClaimed;
        bool decryptionPending;
        uint256 pendingRequestId;
    }

    struct GameView {
        GameStatus status;
        address creator;
        address playerOne;
        address playerTwo;
        bool playerOneRolled;
        bool playerTwoRolled;
        uint32 playerOneRevealed;
        uint32 playerTwoRevealed;
        address winner;
        bool rewardAlreadyClaimed;
        bool playerOneDrawRefunded;
        bool playerTwoDrawRefunded;
        bool revealPending;
    }

    uint256 public nextGameId;
    mapping(uint256 => Game) private games;
    mapping(uint256 => uint256) private requestToGame;

    bool private _claimLock;

    event GameCreated(uint256 indexed gameId, address indexed creator);
    event PlayerJoined(uint256 indexed gameId, address indexed player);
    event GameReady(uint256 indexed gameId, address indexed playerOne, address indexed playerTwo);
    event DiceRolled(uint256 indexed gameId, address indexed player);
    event RevealRequested(uint256 indexed gameId, uint256 requestId);
    event DiceRevealed(uint256 indexed gameId, uint32 playerOneValue, uint32 playerTwoValue);
    event GameResolved(
        uint256 indexed gameId,
        address indexed winner,
        uint32 playerOneValue,
        uint32 playerTwoValue
    );
    event RewardClaimed(uint256 indexed gameId, address indexed winner, uint256 amount);
    event DrawRefundClaimed(uint256 indexed gameId, address indexed player, uint256 amount);

    error GameDoesNotExist();
    error GameNotReady();
    error GameFull();
    error AlreadyJoined();
    error NotParticipant();
    error AlreadyRolled();
    error IncorrectEntryFee();
    error GameNotCompleted();
    error RewardAlreadyClaimed();
    error GameDrawn();
    error NotWinner();
    error RefundAlreadyClaimed();
    error InvalidPlayerIndex();
    error RevealInProgress();
    error UnknownDecryptionRequest();

    modifier gameExists(uint256 gameId) {
        if (gameId >= nextGameId) {
            revert GameDoesNotExist();
        }
        _;
    }

    modifier nonReentrant() {
        if (_claimLock) {
            revert("ReentrancyGuard: reentrant call");
        }
        _claimLock = true;
        _;
        _claimLock = false;
    }

    /// @notice Create a new dice game lobby
    /// @return gameId Identifier of the newly created game
    function createGame() external returns (uint256 gameId) {
        gameId = nextGameId;
        nextGameId += 1;

        Game storage game = games[gameId];
        game.creator = msg.sender;
        game.status = GameStatus.WaitingForPlayers;

        emit GameCreated(gameId, msg.sender);
    }

    /// @notice Join an existing game by paying the entry fee
    /// @param gameId Identifier of the game to join
    function joinGame(uint256 gameId) external payable gameExists(gameId) {
        Game storage game = games[gameId];

        if (msg.value != ENTRY_FEE) {
            revert IncorrectEntryFee();
        }

        if (game.status != GameStatus.WaitingForPlayers) {
            revert GameNotReady();
        }

        if (game.players[0] == msg.sender || game.players[1] == msg.sender) {
            revert AlreadyJoined();
        }

        if (game.players[0] == address(0)) {
            game.players[0] = msg.sender;
        } else if (game.players[1] == address(0)) {
            game.players[1] = msg.sender;
            game.status = GameStatus.WaitingForRolls;
            emit GameReady(gameId, game.players[0], game.players[1]);
        } else {
            revert GameFull();
        }

        emit PlayerJoined(gameId, msg.sender);
    }

    /// @notice Roll the dice for the calling player
    /// @param gameId Identifier of the game to roll in
    function rollDice(uint256 gameId) external gameExists(gameId) {
        Game storage game = games[gameId];

        if (game.status != GameStatus.WaitingForRolls) {
            revert GameNotReady();
        }

        uint256 playerIndex = _playerIndex(game, msg.sender);

        if (game.hasRolled[playerIndex]) {
            revert AlreadyRolled();
        }

        euint32 randomValue = FHE.randEuint32();
        euint32 diceRoll = FHE.add(FHE.rem(randomValue, 6), FHE.asEuint32(1));

        FHE.allowThis(diceRoll);
        FHE.allow(diceRoll, game.players[playerIndex]);

        address opponent = playerIndex == 0 ? game.players[1] : game.players[0];
        if (opponent != address(0)) {
            FHE.allow(diceRoll, opponent);
        }

        game.encryptedRolls[playerIndex] = diceRoll;
        game.hasRolled[playerIndex] = true;

        emit DiceRolled(gameId, msg.sender);

        if (game.hasRolled[0] && game.hasRolled[1]) {
            _initiateReveal(gameId);
        }
    }

    /// @notice Claim the accumulated reward when the caller wins the game
    /// @param gameId Identifier of the game to claim against
    function claimReward(uint256 gameId) external nonReentrant gameExists(gameId) {
        Game storage game = games[gameId];

        if (game.status != GameStatus.Completed) {
            revert GameNotCompleted();
        }

        if (game.rewardClaimed) {
            revert RewardAlreadyClaimed();
        }

        if (game.winner == address(0)) {
            revert GameDrawn();
        }

        if (msg.sender != game.winner) {
            revert NotWinner();
        }

        game.rewardClaimed = true;

        (bool success, ) = msg.sender.call{value: REWARD_AMOUNT}("");
        require(success, "Transfer failed");

        emit RewardClaimed(gameId, msg.sender, REWARD_AMOUNT);
    }

    /// @notice Claim a refund when the game ends in a draw
    /// @param gameId Identifier of the game
    function claimDrawRefund(uint256 gameId) external nonReentrant gameExists(gameId) {
        Game storage game = games[gameId];

        if (game.status != GameStatus.Completed) {
            revert GameNotCompleted();
        }

        if (game.winner != address(0)) {
            revert GameDrawn();
        }

        uint256 playerIndex = _playerIndex(game, msg.sender);

        if (game.drawRefundClaimed[playerIndex]) {
            revert RefundAlreadyClaimed();
        }

        game.drawRefundClaimed[playerIndex] = true;

        (bool success, ) = msg.sender.call{value: ENTRY_FEE}("");
        require(success, "Transfer failed");

        emit DrawRefundClaimed(gameId, msg.sender, ENTRY_FEE);
    }

    /// @notice Fetch human-readable information about a game
    function getGame(uint256 gameId) external view gameExists(gameId) returns (GameView memory viewData) {
        Game storage game = games[gameId];

        viewData.status = game.status;
        viewData.creator = game.creator;
        viewData.playerOne = game.players[0];
        viewData.playerTwo = game.players[1];
        viewData.playerOneRolled = game.hasRolled[0];
        viewData.playerTwoRolled = game.hasRolled[1];
        viewData.playerOneRevealed = game.revealedRolls[0];
        viewData.playerTwoRevealed = game.revealedRolls[1];
        viewData.winner = game.winner;
        viewData.rewardAlreadyClaimed = game.rewardClaimed;
        viewData.playerOneDrawRefunded = game.drawRefundClaimed[0];
        viewData.playerTwoDrawRefunded = game.drawRefundClaimed[1];
        viewData.revealPending = game.decryptionPending;
    }

    /// @notice Get the encrypted roll for a player index
    /// @param gameId Identifier of the game
    /// @param playerIndex Player position (0 or 1)
    function getEncryptedRoll(uint256 gameId, uint8 playerIndex)
        external
        view
        gameExists(gameId)
        returns (bytes32)
    {
        if (playerIndex > 1) {
            revert InvalidPlayerIndex();
        }

        Game storage game = games[gameId];
        return FHE.toBytes32(game.encryptedRolls[playerIndex]);
    }

    /// @notice Total ETH currently locked inside a game pot
    /// @param gameId Identifier of the game
    function getGamePot(uint256 gameId) external view gameExists(gameId) returns (uint256) {
        Game storage game = games[gameId];

        uint256 playerCount;
        if (game.players[0] != address(0)) {
            playerCount += 1;
        }
        if (game.players[1] != address(0)) {
            playerCount += 1;
        }

        if (game.status == GameStatus.Completed && game.winner != address(0) && game.rewardClaimed) {
            return 0;
        }

        if (game.status == GameStatus.Completed && game.winner == address(0)) {
            uint256 refundsClaimed;
            if (game.drawRefundClaimed[0]) {
                refundsClaimed += 1;
            }
            if (game.drawRefundClaimed[1]) {
                refundsClaimed += 1;
            }
            return (playerCount - refundsClaimed) * ENTRY_FEE;
        }

        return playerCount * ENTRY_FEE;
    }

    function _initiateReveal(uint256 gameId) private {
        Game storage game = games[gameId];

        if (game.decryptionPending) {
            revert RevealInProgress();
        }

        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(game.encryptedRolls[0]);
        handles[1] = FHE.toBytes32(game.encryptedRolls[1]);

        // uint256 requestId = FHE.requestDecryption(handles, this.onDiceDecrypted.selector);
        FHE.makePubliclyDecryptable(game.encryptedRolls[0]);
        FHE.makePubliclyDecryptable(game.encryptedRolls[1]);
        game.status = GameStatus.AwaitingReveal;
        game.decryptionPending = true;
        // game.pendingRequestId = requestId;
        // requestToGame[requestId] = gameId + 1;

        // emit RevealRequested(gameId, requestId);
    }

    function onDiceDecrypted(uint256 requestId, bytes memory cleartexts, bytes memory decryptionProof) public returns (bool) {
        uint256 stored = requestToGame[requestId];
        if (stored == 0) {
            revert UnknownDecryptionRequest();
        }

        unchecked {
            stored -= 1;
        }

        Game storage game = games[stored];
        if (!game.decryptionPending || game.pendingRequestId != requestId) {
            revert UnknownDecryptionRequest();
        }

        // FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        uint32[2] memory results = abi.decode(cleartexts, (uint32[2]));

        game.revealedRolls[0] = results[0];
        game.revealedRolls[1] = results[1];
        game.decryptionPending = false;
        game.pendingRequestId = 0;

        delete requestToGame[requestId];

        emit DiceRevealed(stored, results[0], results[1]);

        _finalizeGame(stored, game, results[0], results[1]);

        return true;
    }

    function _finalizeGame(uint256 gameId, Game storage game, uint32 playerOneRoll, uint32 playerTwoRoll) private {
        if (playerOneRoll > playerTwoRoll) {
            game.winner = game.players[0];
        } else if (playerTwoRoll > playerOneRoll) {
            game.winner = game.players[1];
        } else {
            game.winner = address(0);
        }

        game.status = GameStatus.Completed;

        emit GameResolved(gameId, game.winner, playerOneRoll, playerTwoRoll);
    }

    function _playerIndex(Game storage game, address player) private view returns (uint256) {
        if (game.players[0] == player) {
            return 0;
        }
        if (game.players[1] == player) {
            return 1;
        }
        revert NotParticipant();
    }

    receive() external payable {
        revert("Direct payments not accepted");
    }
}
