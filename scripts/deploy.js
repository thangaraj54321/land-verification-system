const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts...");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying from:", deployer.address);

  // Deploy CertificateRegistry
  console.log("\nDeploying CertificateRegistry...");
  const CertificateRegistry = await hre.ethers.getContractFactory(
    "CertificateRegistry",
  );
  const certificateRegistry = await CertificateRegistry.deploy();
  await certificateRegistry.waitForDeployment();
  const certAddress = await certificateRegistry.getAddress();
  console.log("CertificateRegistry deployed to:", certAddress);

  // Deploy LandRegistry
  console.log("\nDeploying LandRegistry...");
  const LandRegistry = await hre.ethers.getContractFactory("LandRegistry");
  const landRegistry = await LandRegistry.deploy();
  await landRegistry.waitForDeployment();
  const landAddress = await landRegistry.getAddress();
  console.log("LandRegistry deployed to:", landAddress);

  // Save contract addresses to file
  const fs = require("fs");
  
  // Create config directory if it doesn't exist
  if (!fs.existsSync("./config")) {
    fs.mkdirSync("./config");
  }
  
  const config = {
    certificateRegistry: certAddress,
    landRegistry: landAddress,
    deployer: deployer.address,
    network: hre.network.name,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    "./config/contract-addresses.json",
    JSON.stringify(config, null, 2),
  );

  console.log("\n✓ Deployment complete!");
  console.log("Contract addresses saved to config/contract-addresses.json");

  // Verify contracts on Etherscan (if not local)
  if (hre.network.name !== "hardhat" && hre.network.name !== "ganache") {
    console.log("\nWaiting for block confirmation...");
    await certificateRegistry.deploymentTransaction().wait(6);
    await landRegistry.deploymentTransaction().wait(6);

    console.log("Verifying contracts on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: certAddress,
        constructorArguments: [],
      });
      console.log("CertificateRegistry verified!");

      await hre.run("verify:verify", {
        address: landAddress,
        constructorArguments: [],
      });
      console.log("LandRegistry verified!");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
