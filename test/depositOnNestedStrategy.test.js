const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { assert } = require('chai')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM, BOO, BOOYearnVault /*, XBOOReaperVault*/ } = require('../config')
const { swapFunction } = require('./functions')

describe('Deposit On Nested Strategy', function () {
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

    it('Deposit on Nested Strategy', async () => {
        const provider = '0'
        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)

        const swapAmountOut = await swapFunction(deployer, userAddress, WFTM, amountWithoutFeeInWei, BOO)

        tx = await nodes.connect(deployer).depositOnNestedStrategy(userAddress, BOO, BOOYearnVault, swapAmountOut, provider)
        receipt = await tx.wait()
        const depositOnNestedStrategyEvent = getEvent(receipt, "DepositOnNestedStrategy")

        assert.equal(depositOnNestedStrategyEvent.args.sharesAmount.toString(), '1729463523840243950', 'Shares amount is not correct.')
    })
})