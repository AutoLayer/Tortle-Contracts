const { ethers } = require('hardhat')
// const { reset } = require('@nomicfoundation/hardhat-network-helpers')
const { getEvent } = require('./utils')
const { deployMainNet } = require('../scripts/lib/deployMainNet')

describe('Swap', function () {
    let deployer
    let nodes
    let tx
    let receipt
    const WFTM = "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83"
    const USDC = "0x04068da6c83afcfa0e13ba15a6696662335d5b75"
    const BOO = "0x841fad6eae12c286d1fd18d1d525dffa75c7effe"
    const amount = "10000000000000000000" // 10 Ether
    // this.timeout(300000)

    before(async () => {
        const accounts = await ethers.getSigners()
        deployer = accounts[0]
        const contractsAddresses = await deployMainNet({noWait: true})
        nodes = await ethers.getContractAt('Nodes', contractsAddresses.ProxyNodes)
        tx = await nodes.connect(deployer).addFundsForFTM(deployer.getAddress(), "1", { value: amount })
        receipt = await tx.wait()
        const addFundsEvent = getEvent(receipt, "AddFundsForFTM")
        console.log(addFundsEvent.args)
    })

    // beforeAll(async () => await reset())

    it('Swap Fantom to Token', async () => {
        const amountInEthers = ethers.utils.formatEther(amount)
        const amountWithoutFeeInEthers = amountInEthers - (amountInEthers * 0.005)
        const amountWithoutFeeInWei = ethers.utils.parseEther(amountWithoutFeeInEthers.toString())
        tx = await nodes.connect(deployer).swapTokens(deployer.getAddress(), "0", [WFTM, USDC], amountWithoutFeeInWei, "0", [])
        receipt = await tx.wait()
        const swapEvent = getEvent(receipt, "Swap")
        console.log(swapEvent.args)
    })
})