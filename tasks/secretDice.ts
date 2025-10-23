import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

async function getSecretDice(hre: any) {
  const { deployments, ethers } = hre;
  const deployment = await deployments.get("SecretDice");
  return ethers.getContractAt("SecretDice", deployment.address);
}

task("dice:address", "Prints the SecretDice contract address").setAction(async (_args: TaskArguments, hre) => {
  const deployment = await hre.deployments.get("SecretDice");
  console.log(`SecretDice address: ${deployment.address}`);
});

task("dice:create", "Creates a new dice game lobby")
  .addOptionalParam("signer", "Signer index to use", "0")
  .setAction(async (taskArgs: TaskArguments, hre) => {
    const secretDice = await getSecretDice(hre);
    const signers = await hre.ethers.getSigners();
    const signer = signers[parseInt(taskArgs.signer ?? "0", 10)];

    const nextGameId = await secretDice.nextGameId();
    const tx = await secretDice.connect(signer).createGame();
    await tx.wait();

    console.log(`Created game with id ${nextGameId.toString()}`);
  });

task("dice:join", "Join a dice game")
  .addParam("id", "Game id")
  .addOptionalParam("signer", "Signer index to use", "0")
  .setAction(async (taskArgs: TaskArguments, hre) => {
    const secretDice = await getSecretDice(hre);
    const signers = await hre.ethers.getSigners();
    const signer = signers[parseInt(taskArgs.signer ?? "0", 10)];
    const gameId = BigInt(taskArgs.id);

    const entryFee = await secretDice.ENTRY_FEE();
    const tx = await secretDice.connect(signer).joinGame(gameId, { value: entryFee });
    await tx.wait();

    console.log(`Signer ${signer.address} joined game ${gameId.toString()}`);
  });

task("dice:roll", "Roll dice for a game")
  .addParam("id", "Game id")
  .addOptionalParam("signer", "Signer index to use", "0")
  .setAction(async (taskArgs: TaskArguments, hre) => {
    const secretDice = await getSecretDice(hre);
    const signers = await hre.ethers.getSigners();
    const signer = signers[parseInt(taskArgs.signer ?? "0", 10)];
    const gameId = BigInt(taskArgs.id);

    const tx = await secretDice.connect(signer).rollDice(gameId);
    await tx.wait();

    const gameInfo = await secretDice.getGame(gameId);
    console.log(`Game status: ${gameInfo.status} (${gameInfo.revealPending ? 'awaiting reveal' : 'updated'})`);
    console.log(
      `Player rolls: [${gameInfo.playerOneRevealed.toString()}, ${gameInfo.playerTwoRevealed.toString()}] (0 indicates pending reveal)`,
    );
  });

task("dice:claim", "Claim reward if caller won")
  .addParam("id", "Game id")
  .addOptionalParam("signer", "Signer index to use", "0")
  .setAction(async (taskArgs: TaskArguments, hre) => {
    const secretDice = await getSecretDice(hre);
    const signers = await hre.ethers.getSigners();
    const signer = signers[parseInt(taskArgs.signer ?? "0", 10)];
    const gameId = BigInt(taskArgs.id);

    const tx = await secretDice.connect(signer).claimReward(gameId);
    await tx.wait();

    console.log(`Signer ${signer.address} claimed reward for game ${gameId.toString()}`);
  });

task("dice:refund", "Claim draw refund")
  .addParam("id", "Game id")
  .addOptionalParam("signer", "Signer index to use", "0")
  .setAction(async (taskArgs: TaskArguments, hre) => {
    const secretDice = await getSecretDice(hre);
    const signers = await hre.ethers.getSigners();
    const signer = signers[parseInt(taskArgs.signer ?? "0", 10)];
    const gameId = BigInt(taskArgs.id);

    const tx = await secretDice.connect(signer).claimDrawRefund(gameId);
    await tx.wait();

    console.log(`Signer ${signer.address} claimed draw refund for game ${gameId.toString()}`);
  });

task("dice:info", "Display on-chain game information")
  .addParam("id", "Game id")
  .setAction(async (taskArgs: TaskArguments, hre) => {
    const secretDice = await getSecretDice(hre);
    const gameId = BigInt(taskArgs.id);
    const gameInfo = await secretDice.getGame(gameId);
    const pot = await secretDice.getGamePot(gameId);

    console.log(`Game ${gameId.toString()} status: ${gameInfo.status}`);
    console.log(`  creator: ${gameInfo.creator}`);
    console.log(`  playerOne: ${gameInfo.playerOne}`);
    console.log(`  playerTwo: ${gameInfo.playerTwo}`);
    console.log(`  playerOneRolled: ${gameInfo.playerOneRolled}`);
    console.log(`  playerTwoRolled: ${gameInfo.playerTwoRolled}`);
    console.log(`  playerOneRoll: ${gameInfo.playerOneRevealed}`);
    console.log(`  playerTwoRoll: ${gameInfo.playerTwoRevealed}`);
    console.log(`  winner: ${gameInfo.winner}`);
    console.log(`  rewardClaimed: ${gameInfo.rewardAlreadyClaimed}`);
    console.log(`  drawRefunds: [${gameInfo.playerOneDrawRefunded}, ${gameInfo.playerTwoDrawRefunded}]`);
    console.log(`  revealPending: ${gameInfo.revealPending}`);
    console.log(`  pot: ${pot}`);
  });
