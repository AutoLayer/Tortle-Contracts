const { ethers } = require('hardhat')
const { getEvent } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { setUpTests } = require('../scripts/lib/setUpTests')

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

    beforeEach('BeforeEach', async function () {
        const setUp = await loadFixture(setUpTests)
        nodes = setUp.nodes
        deployer = setUp.deployer
    })

    it('Swap Fantom to Token', async () => {
        const amountInEthers = ethers.utils.formatEther(amount)
        const amountWithoutFeeInEthers = amountInEthers - (amountInEthers * 0.005)
        const amountWithoutFeeInWei = ethers.utils.parseEther(amountWithoutFeeInEthers.toString())
        tx = await nodes.connect(deployer).swapTokens(deployer.getAddress(), "0", [WFTM, USDC], amountWithoutFeeInWei, "0", [])
        console.log("tx", tx)
        receipt = await tx.wait()
        const swapEvent = getEvent(receipt, "Swap")
        console.log(swapEvent.args)
    })
})