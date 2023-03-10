const { ethers } = require('hardhat')
const { TEST_AMOUNT, WFTM, USDC, getEvent } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { setUpTests } = require('../scripts/lib/setUpTests')

describe('Swap', function () {
    let deployer
    let nodes
    let tx
    let receipt
    // this.timeout(300000)

    beforeEach('BeforeEach', async function () {
        const setUp = await loadFixture(setUpTests)
        nodes = setUp.nodes
        deployer = setUp.deployer
    })

    it('Swap Fantom to Token', async () => {
        const amountInEthers = ethers.utils.formatEther(TEST_AMOUNT)
        const amountWithoutFeeInEthers = amountInEthers - (amountInEthers * 0.005)
        const amountWithoutFeeInWei = ethers.utils.parseEther(amountWithoutFeeInEthers.toString())
        tx = await nodes.connect(deployer).swapTokens(deployer.getAddress(), "0", [WFTM, USDC], amountWithoutFeeInWei, "0", [])
        console.log("tx", tx)
        receipt = await tx.wait()
        const swapEvent = getEvent(receipt, "Swap")
        console.log(swapEvent.args)
    })
})