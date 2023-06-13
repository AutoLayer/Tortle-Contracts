const { deployMainNet } = require('./deployMainNet')
const { deployArbitrumMainNet } = require('./deployArbitrumMainNet')
const { impersonateAccount }  = require('@nomicfoundation/hardhat-network-helpers')
const { TEST_AMOUNT } = require('../../test/utils')
const { deployerAddress, userAddress } = require('../../config')

const setUpTests = async () => {
    await impersonateAccount(deployerAddress)
    const deployer = await ethers.getSigner(deployerAddress)

    let contractsAddresses
    if (process.env.NETWORK === 'Fantom') contractsAddresses = await deployMainNet({noWait: true, deployer})
    else contractsAddresses = await deployArbitrumMainNet({noWait: true, deployer})

    nodes = await ethers.getContractAt('Nodes', contractsAddresses.ProxyNodes)

    await nodes.connect(deployer).addFundsForFTM(userAddress, "1", { value: TEST_AMOUNT })

    return { nodes, deployer }
}

module.exports = { setUpTests }