const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { assert } = require('chai')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM, WETH_ARB } = require('../config')

describe('SendToWallet', function () {
    let network
    let deployer
    let nodes
    let weth
    let tx
    let receipt
    // this.timeout(300000)

    beforeEach('BeforeEach', async function () {
        const setUp = await loadFixture(setUpTests)
        network = setUp.network
        nodes = setUp.nodes
        deployer = setUp.deployer
    })

    it('Send To Wallet with ETH', async () => {
        switch (network) {
            case 'Fantom':
                weth = WFTM
                break

            case 'Arbitrum':
                weth = WETH_ARB
                break
        
            default:
                break
        }

        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)
        tx = await nodes.connect(deployer).sendToWallet(userAddress, [weth], amountWithoutFeeInWei, 0, amountWithoutFeeInWei, 0, [])
        receipt = await tx.wait()
        const sendToWalletEvent = getEvent(receipt, "SendToWallet")

        assert.equal(sendToWalletEvent.args.tokenOutput.toLowerCase(), weth.toLowerCase(), 'Token out is not correct.')
        // assert.equal(sendToWalletEvent.args.amountOut.toString(), amountWithoutFeeInWei, 'Amount out is not correct.')
    })
})