const { deployMainNet } = require('./deployMainnet')
const { impersonateAccount }  = require('@nomicfoundation/hardhat-network-helpers')
const { TEST_AMOUNT } = require('../../test/utils')

const setUpTests = async () => {
    const deployerAddress = "0x1a84F1f9CE6f4bF0FD2b1B4689Db53776e64bF1c"
    await impersonateAccount(deployerAddress)
    const deployer = await ethers.getSigner(deployerAddress)

    const contractsAddresses = await deployMainNet({noWait: true})
    nodes = await ethers.getContractAt('Nodes', contractsAddresses.ProxyNodes)

    await nodes.connect(deployer).addFundsForFTM(deployerAddress, "1", { value: TEST_AMOUNT })
    return { nodes, deployer }
}

module.exports = { setUpTests }