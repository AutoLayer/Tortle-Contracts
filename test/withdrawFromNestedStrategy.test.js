const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { assert } = require('chai')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM, BOO, BOOYearnVault } = require('../config')

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
        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)
        tx = await nodes.connect(deployer).swapTokens(userAddress, "0", [WFTM, BOO], amountWithoutFeeInWei, "0", [])
        receipt = await tx.wait()
        const swapEvent = getEvent(receipt, "Swap")
        const swapAmountOut = swapEvent.args.amountOut.toString()

        await nodes.connect(deployer).depositOnNestedStrategy(userAddress, BOO, BOOYearnVault, swapAmountOut)
        
        const sharesAmount = await nodes.getBalance(userAddress, BOOYearnVault)

        tx = await nodes.connect(deployer).withdrawFromNestedStrategy(userAddress, BOO, BOOYearnVault, sharesAmount)
        console.log(tx)
    })
})