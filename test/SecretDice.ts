import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { SecretDice, SecretDice__factory } from "../types";

enum GameStatus {
  WaitingForPlayers = 0,
  WaitingForRolls = 1,
  AwaitingReveal = 2,
  Completed = 3,
}

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("SecretDice")) as SecretDice__factory;
  const contract = (await factory.deploy()) as SecretDice;
  const address = await contract.getAddress();
  return { contract, address };
}

describe("SecretDice", function () {
  let signers: Signers;
  let contract: SecretDice;

  before(async function () {
    const available = await ethers.getSigners();
    signers = { deployer: available[0], alice: available[1], bob: available[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("SecretDice tests require the FHEVM mock environment");
      this.skip();
    }

    ({ contract } = await deployFixture());
  });

  it("requires the exact entry fee to join", async function () {
    const gameIdTx = await contract.connect(signers.deployer).createGame();
    await gameIdTx.wait();
    const gameId = (await contract.nextGameId()) - 1n;

    const entryFee = await contract.ENTRY_FEE();

    await expect(
      contract.connect(signers.alice).joinGame(gameId, { value: entryFee - 1n }),
    ).to.be.revertedWithCustomError(contract, "IncorrectEntryFee");
  });

  it("runs a complete game flow", async function () {
    const tx = await contract.connect(signers.deployer).createGame();
    const receipt = await tx.wait();
    const event = receipt!.logs.map((log) => contract.interface.parseLog(log)).find((parsed) => parsed?.name === "GameCreated");
    const gameId = event?.args?.gameId ?? (await contract.nextGameId()) - 1n;

    const entryFee = await contract.ENTRY_FEE();

    await contract.connect(signers.alice).joinGame(gameId, { value: entryFee });
    await contract.connect(signers.bob).joinGame(gameId, { value: entryFee });

    await contract.connect(signers.alice).rollDice(gameId);
    await contract.connect(signers.bob).rollDice(gameId);

    await fhevm.awaitDecryptionOracle();

    let game = await contract.getGame(gameId);

    if (Number(game.status) === GameStatus.AwaitingReveal) {
      for (let i = 0; i < 3 && Number(game.status) !== GameStatus.Completed; i += 1) {
        await ethers.provider.send("evm_mine", []);
        game = await contract.getGame(gameId);
      }
    }

    expect(Number(game.status)).to.equal(GameStatus.Completed);

    const playerOneRoll = BigInt(game.playerOneRevealed);
    const playerTwoRoll = BigInt(game.playerTwoRevealed);

    expect(playerOneRoll).to.be.gte(1n);
    expect(playerOneRoll).to.be.lte(6n);
    expect(playerTwoRoll).to.be.gte(1n);
    expect(playerTwoRoll).to.be.lte(6n);

    const contractAddress = await contract.getAddress();
    const contractBalance = await ethers.provider.getBalance(contractAddress);
    expect(contractBalance).to.equal(entryFee * 2n);

    if (game.winner !== ethers.ZeroAddress) {
      const winnerSigner = game.winner === signers.alice.address ? signers.alice : signers.bob;
      const txClaim = await contract.connect(winnerSigner).claimReward(gameId);
      await txClaim.wait();

      const updatedGame = await contract.getGame(gameId);
      expect(updatedGame.rewardAlreadyClaimed).to.equal(true);
      const balanceAfterClaim = await ethers.provider.getBalance(contractAddress);
      expect(balanceAfterClaim).to.equal(0n);
    } else {
      const txRefundAlice = await contract.connect(signers.alice).claimDrawRefund(gameId);
      await txRefundAlice.wait();

      const txRefundBob = await contract.connect(signers.bob).claimDrawRefund(gameId);
      await txRefundBob.wait();

      const balanceAfterRefunds = await ethers.provider.getBalance(contractAddress);
      expect(balanceAfterRefunds).to.equal(0n);
    }
  });
});
