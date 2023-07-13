const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { assert } = require('chai')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM, USDC, WETH_ARB, USDT_ARB } = require('../config')

describe('Swap', function () {
    let network
    let deployer
    let nodes
    let weth
    let usdc
    let tx
    let receipt
    // this.timeout(300000)

    beforeEach('BeforeEach', async function () {
        const setUp = await loadFixture(setUpTests)
        network = setUp.network
        nodes = setUp.nodes
        deployer = setUp.deployer
    })

    it('Swap Fantom to Token', async () => {
        switch (network) {
            case 'Fantom':
                weth = WFTM
                usdc = USDC
                break

            case 'Arbitrum':
                weth = WETH_ARB
                usdc = USDT_ARB
                break
        
            default:
                break
        }

        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)
        tx = await nodes.connect(deployer).swapTokens(userAddress, "0", [weth, usdc], amountWithoutFeeInWei, "0", [])
        receipt = await tx.wait()
        const swapEvent = getEvent(receipt, "Swap")

        assert.equal(swapEvent.args.tokenOutput.toLowerCase(), usdc.toLowerCase(), 'Token out is not correct.')
        // assert.equal(swapEvent.args.amountOut.toString(), '4113737', 'Amount out is not correct.')
    })
})