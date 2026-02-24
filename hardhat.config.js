require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    // Local development network
    hardhat: {
      chainId: 31337
    },
    // Testnet networks
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111
    },
    goerli: {
      url: process.env.GOERLI_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 5
    },
    // Local Ganache
    ganache: {
      url: "http://127.0.0.1:7545",
      chainId: 5777
    }
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      goerli: process.env.ETHERSCAN_API_KEY || ""
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD"
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
