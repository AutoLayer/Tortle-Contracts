require('@nomiclabs/hardhat-waffle')

task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners()

  for (const account of accounts) {
    console.log(account.address)
  }
})

module.exports = {
  solidity: {
    compilers: [
      { version: '0.8.13' },
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
      allowUnlimitedContractSize: true,
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      blockGasLimit: 100000000429729999990,
      allowUnlimitedContractSize: true,
    },
    testnet: {
      url: 'https://xapi.testnet.fantom.network/lachesis',
      allowUnlimitedContractSize: true,
      accounts: [],
    },
  },
}
