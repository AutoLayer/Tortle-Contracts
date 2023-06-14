const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { assert } = require('chai')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM, USDC, WETH_ARB, USDT_ARB } = require('../config')

describe('Liquidate', function () {
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

    it('Liquidate', async () => {
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
        tx = await nodes.connect(deployer).liquidate(userAddress, [weth, usdc], amountWithoutFeeInWei, 0, amountWithoutFeeInWei, 0, [])
        receipt = await tx.wait()
        const liquidateEvent = getEvent(receipt, "Liquidate")
    
        assert.equal(liquidateEvent.args.tokenOutput.toLowerCase(), usdc.toLowerCase(), 'Token out is not correct.')
        // assert.equal(liquidateEvent.args.amountOut.toString(), '4113737', 'Amount out is not correct.')
    })
})