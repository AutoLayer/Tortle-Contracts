const { TEST_AMOUNT, calculateAmountWithoutFees } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM, USDC } = require('../config')

describe('Open Perpetual Position', function () {
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

    it('Open Perpetual Position with FTM', async () => {
        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)

        const provider = 0
        tx = await nodes.connect(deployer).openPerpPosition(userAddress, "1", [WFTM, USDC], WFTM, amountWithoutFeeInWei, /*sizeDelta,*/ false, amountWithoutFeeInWei, 0, provider)
        receipt = await tx.wait()
        console.log(receipt)
    })
})