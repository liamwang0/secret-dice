const fs = require("fs");
const path = require("path");

function main() {
  const network = process.argv[2] ?? "sepolia";
  const deploymentPath = path.join(__dirname, "..", "deployments", network, "SecretDice.json");

  if (!fs.existsSync(deploymentPath)) {
    console.error(`Deployment file not found at ${deploymentPath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(deploymentPath, "utf8");
  const deployment = JSON.parse(fileContent);

  if (!deployment.address || !Array.isArray(deployment.abi)) {
    console.error("Deployment file is missing address or abi fields");
    process.exit(1);
  }

  const outputDir = path.join(__dirname, "..", "home", "src", "config", "generated");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, "secretDice.ts");
  const abiString = JSON.stringify(deployment.abi, null, 2);

  const content = `export const CONTRACT_ADDRESS: \`0x\${string}\` = '${deployment.address}';
export const CONTRACT_ABI = ${abiString} as const;
`;

  fs.writeFileSync(outputPath, content, "utf8");
  console.log(`Updated frontend contract config using ${network} deployment.`);
}

main();
