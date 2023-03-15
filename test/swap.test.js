const { ethers } = require('hardhat')
const { TEST_AMOUNT, getEvent } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { assert } = require('chai')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM, USDC } = require('../config')

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
        tx = await nodes.connect(deployer).swapTokens(userAddress, "0", [WFTM, USDC], amountWithoutFeeInWei, "0", [])
        receipt = await tx.wait()
        const swapEvent = getEvent(receipt, "Swap")
        assert.equal(swapEvent.args.amountOut.toString(), '4113737', 'Amount out is not correct.')
    })
})