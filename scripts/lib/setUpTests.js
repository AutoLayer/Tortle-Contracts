const { deployMainNet } = require('./deployMainNet')
const { deployArbitrumMainNet } = require('./deployArbitrumMainNet')
const { impersonateAccount }  = require('@nomicfoundation/hardhat-network-helpers')
const { TEST_AMOUNT } = require('../../test/utils')
const { deployerAddress, userAddress } = require('../../config')

const setUpTests = async () => {
    const [account] = await ethers.getSigners()
    await account.sendTransaction({ to: deployerAddress, value: ethers.utils.parseEther('100') })

    await impersonateAccount(deployerAddress)
    const deployer = await ethers.getSigner(deployerAddress)

    const network = process.env.NETWORK
    let contractsAddresses
    if (network === 'Fantom') contractsAddresses = await deployMainNet({noWait: true, deployer})
    else contractsAddresses = await deployArbitrumMainNet({noWait: true, deployer})

    nodes = await ethers.getContractAt('Nodes', contractsAddresses.ProxyNodes)

    await nodes.connect(deployer).addFundsForFTM(userAddress, "1", { value: TEST_AMOUNT })

    return { network, nodes, deployer }
}

module.exports = { setUpTests }