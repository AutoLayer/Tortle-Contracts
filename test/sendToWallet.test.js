const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { assert } = require('chai')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM } = require('../config')

describe('SendToWallet', function () {
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

    it('Send To Wallet with FTM', async () => {
        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)
        tx = await nodes.connect(deployer).sendToWallet(userAddress, [WFTM], amountWithoutFeeInWei, 0, amountWithoutFeeInWei, 0, [])
        receipt = await tx.wait()
        const sendToWalletEvent = getEvent(receipt, "SendToWallet")
        console.log(sendToWalletEvent)
    })
})