require('hardhat-contract-sizer');
require('@nomiclabs/hardhat-waffle')
require('@nomiclabs/hardhat-ethers')
require('@openzeppelin/hardhat-upgrades')
require("@nomicfoundation/hardhat-verify");
require('dotenv').config()

task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners()

  for (const account of accounts) {
    console.log(account.address)
  }
})

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.13',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      { version: '0.8.11' },
      { version: '0.8.1' },
      { version: '0.6.0' },
      { version: '0.7.0' },
      {
        version: '0.6.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      { version: '0.5.0' },
    ],
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      forking: {
        enabled: true,
        // url: 'https://rpc.ftm.tools/',
        url: 'https://arb1.arbitrum.io/rpc',
        // blockNumber: 57558604,
        allowUnlimitedContractSize: true,
        accounts: [process.env.PRIVATE_KEY],
      }
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      blockGasLimit: 100000000429729999990,
      allowUnlimitedContractSize: true,
    },
    ftm: {
      url: 'https://rpc.ftm.tools/',
      allowUnlimitedContractSize: true,
      accounts: [process.env.PRIVATE_KEY],
    },
    testnet: {
      url: 'https://xapi.testnet.fantom.network/lachesis',
      allowUnlimitedContractSize: true,
      accounts: [process.env.PRIVATE_KEY],
    },
    arb: {
      url: 'https://arb1.arbitrum.io/rpc',
      allowUnlimitedContractSize: true,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      opera: `${process.env.FTMSCAN_API_KEY}`
    }
  }
}
