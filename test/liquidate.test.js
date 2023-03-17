const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { assert } = require('chai')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM, USDC } = require('../config')

describe('Liquidate', function () {
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

    it('Liquidate', async () => {
        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)
        tx = await nodes.connect(deployer).liquidate(userAddress, [WFTM, USDC], amountWithoutFeeInWei, 0, amountWithoutFeeInWei, 0, [])
        receipt = await tx.wait()
        const liquidateEvent = getEvent(receipt, "Liquidate")
    
        assert.equal(liquidateEvent.args.tokenOutput.toLowerCase(), USDC, 'Token out is not correct.')
        assert.equal(liquidateEvent.args.amountOut.toString(), '4113737', 'Amount out is not correct.')
    })
})