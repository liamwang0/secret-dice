import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedSecretDice = await deploy("SecretDice", {
    from: deployer,
    log: true,
  });

  console.log(`SecretDice contract: `, deployedSecretDice.address);
};
export default func;
func.id = "deploy_secret_dice"; // id required to prevent reexecution
func.tags = ["SecretDice"];
