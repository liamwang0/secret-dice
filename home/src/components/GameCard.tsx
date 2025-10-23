import { formatEther } from 'viem';
import type { GameDetails } from '../types/game';
import { GameStatus, STATUS_LABELS } from '../types/game';
import '../styles/GameCard.css';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

type GameCardProps = {
  game: GameDetails;
  currentAccount?: string;
  entryFee?: bigint;
  rewardAmount?: bigint;
  onJoin(gameId: bigint): Promise<void>;
  onRoll(gameId: bigint): Promise<void>;
  onClaimReward(gameId: bigint): Promise<void>;
  onClaimRefund(gameId: bigint): Promise<void>;
  isProcessing: boolean;
  processingAction?: string;
};

function shortenAddress(address: string) {
  if (!address || address === ZERO_ADDRESS) {
    return '—';
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function GameCard({
  game,
  currentAccount,
  entryFee,
  rewardAmount,
  onJoin,
  onRoll,
  onClaimReward,
  onClaimRefund,
  isProcessing,
  processingAction,
}: GameCardProps) {
  const isPlayerOne = currentAccount && game.playerOne.toLowerCase() === currentAccount.toLowerCase();
  const isPlayerTwo = currentAccount && game.playerTwo.toLowerCase() === currentAccount.toLowerCase();
  const isParticipant = Boolean(isPlayerOne || isPlayerTwo);

  const playerIndex = isPlayerOne ? 0 : isPlayerTwo ? 1 : -1;

  const canJoin =
    game.status === GameStatus.WaitingForPlayers &&
    !isParticipant &&
    (game.playerOne === ZERO_ADDRESS || game.playerTwo === ZERO_ADDRESS);

  const canRoll =
    game.status === GameStatus.WaitingForRolls &&
    playerIndex >= 0 &&
    ((playerIndex === 0 && !game.playerOneRolled) || (playerIndex === 1 && !game.playerTwoRolled));

  const canClaimReward =
    game.status === GameStatus.Completed &&
    game.winner !== ZERO_ADDRESS &&
    currentAccount &&
    game.winner.toLowerCase() === currentAccount.toLowerCase() &&
    !game.rewardClaimed;

  const canClaimRefund =
    game.status === GameStatus.Completed &&
    game.winner === ZERO_ADDRESS &&
    playerIndex >= 0 &&
    ((playerIndex === 0 && !game.playerOneRefunded) || (playerIndex === 1 && !game.playerTwoRefunded));

  const actionLabel = processingAction ? `${processingAction}…` : 'Processing…';

  const potDisplay = formatEther(game.pot);
  const entryFeeDisplay = entryFee ? formatEther(entryFee) : undefined;
  const rewardDisplay = rewardAmount ? formatEther(rewardAmount) : undefined;

  const pendingReveal = game.status === GameStatus.AwaitingReveal || game.revealPending;
  const showResolvedRolls = game.status === GameStatus.Completed;

  const playerOneRollLabel = showResolvedRolls
    ? game.playerOneRoll.toString()
    : pendingReveal && game.playerOneRolled
      ? 'Decrypting…'
      : game.playerOneRolled
        ? 'Rolled'
        : '—';

  const playerTwoRollLabel = showResolvedRolls
    ? game.playerTwoRoll.toString()
    : pendingReveal && game.playerTwoRolled
      ? 'Decrypting…'
      : game.playerTwoRolled
        ? 'Rolled'
        : '—';

  const winnerLabel = game.status === GameStatus.Completed ? (game.winner === ZERO_ADDRESS ? 'Draw' : shortenAddress(game.winner)) : 'Pending';

  const noActionMessage = pendingReveal
    ? 'Waiting for secure decryption…'
    : 'No available actions for this game.';

  return (
    <div className="game-card">
      <div className="game-card-header">
        <div>
          <h3>Game #{game.id.toString()}</h3>
          <span className={`status status-${game.status}`}>{STATUS_LABELS[game.status]}</span>
        </div>
        <div className="game-card-pot">
          <span>Pot</span>
          <strong>{potDisplay} ETH</strong>
        </div>
      </div>

      <div className="game-card-section">
        <h4>Players</h4>
        <div className="player-row">
          <span>Player 1</span>
          <span>{shortenAddress(game.playerOne)}</span>
        </div>
        <div className="player-row">
          <span>Player 2</span>
          <span>{shortenAddress(game.playerTwo)}</span>
        </div>
      </div>

      <div className="game-card-section">
        <h4>Dice Results</h4>
        <div className="player-row">
          <span>Player 1 roll</span>
          <span>{playerOneRollLabel}</span>
        </div>
        <div className="player-row">
          <span>Player 2 roll</span>
          <span>{playerTwoRollLabel}</span>
        </div>
      </div>

      <div className="game-card-section">
        <h4>Summary</h4>
        <div className="player-row">
          <span>Winner</span>
          <span>{winnerLabel}</span>
        </div>
        {entryFeeDisplay && (
          <div className="player-row">
            <span>Entry fee</span>
            <span>{entryFeeDisplay} ETH</span>
          </div>
        )}
        {rewardDisplay && (
          <div className="player-row">
            <span>Reward</span>
            <span>{rewardDisplay} ETH</span>
          </div>
        )}
      </div>

      <div className="game-card-actions">
        {canJoin && (
          <button type="button" onClick={() => onJoin(game.id)} disabled={isProcessing}>
            {isProcessing ? actionLabel : 'Join Game'}
          </button>
        )}
        {canRoll && (
          <button type="button" onClick={() => onRoll(game.id)} disabled={isProcessing}>
            {isProcessing ? actionLabel : 'Roll Dice'}
          </button>
        )}
        {canClaimReward && (
          <button type="button" onClick={() => onClaimReward(game.id)} disabled={isProcessing}>
            {isProcessing ? actionLabel : 'Claim Reward'}
          </button>
        )}
        {canClaimRefund && (
          <button type="button" onClick={() => onClaimRefund(game.id)} disabled={isProcessing}>
            {isProcessing ? actionLabel : 'Claim Refund'}
          </button>
        )}
        {!canJoin && !canRoll && !canClaimReward && !canClaimRefund && (
          <p className="no-actions">{noActionMessage}</p>
        )}
      </div>
    </div>
  );
}
