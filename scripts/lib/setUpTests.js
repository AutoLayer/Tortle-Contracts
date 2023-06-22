const { deployMainNet } = require('./deployMainnet')
const { impersonateAccount }  = require('@nomicfoundation/hardhat-network-helpers')
const { TEST_AMOUNT } = require('../../test/utils')
const { deployerAddress, userAddress } = require('../../config')

const setUpTests = async () => {
    await impersonateAccount(deployerAddress)
    const deployer = await ethers.getSigner(deployerAddress)

    const contractsAddresses = await deployMainNet({noWait: true, deployer})
    nodes = await ethers.getContractAt('Nodes', contractsAddresses.ProxyNodes)
    firstTypePerp = await ethers.getContractAt('FirstTypePerpetual', contractsAddresses.FirstTypePerpetual)

    await nodes.connect(deployer).addFundsForFTM(userAddress, "1", { value: TEST_AMOUNT })

    return { nodes, deployer, firstTypePerp }
}

module.exports = { setUpTests }