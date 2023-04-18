const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { assert } = require('chai')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM, BOO, BOOYearnVault /*, XBOOReaperVault*/ } = require('../config')
const { swapFunction } = require('./functions')

describe('Withdraw From Nested Strategy', function () {
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

    it('Withdraw From Nested Strategy', async () => {
        const provider = '0'
        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)

        const swapAmountOut = swapFunction(deployer, userAddress, WFTM, amountWithoutFeeInWei, BOO)

        await nodes.connect(deployer).depositOnNestedStrategy(userAddress, BOO, BOOYearnVault, swapAmountOut, provider)

        const sharesAmount = await nodes.getBalance(userAddress, BOOYearnVault)

        tx = await nodes.connect(deployer).withdrawFromNestedStrategy(userAddress, BOO, BOOYearnVault, sharesAmount, provider)
        receipt = await tx.wait()
        const withdrawEvent = getEvent(receipt, "WithdrawFromNestedStrategy")

        assert.equal(withdrawEvent.args.tokenOut.toLowerCase(), BOO, 'Token desired is not correct.')
        assert.equal(withdrawEvent.args.amountTokenDesired.toString(), '2408768646669697922', 'Token desired amount is not correct.')
    })
})