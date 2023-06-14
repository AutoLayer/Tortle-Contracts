const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { assert } = require('chai')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM, USDC, BOO, WETH_ARB, USDT_ARB, ARB_ARB } = require('../config')

describe('Split', function () {
    let network
    let deployer
    let nodes
    let weth
    let usdc
    let token
    let tx
    let receipt
    // this.timeout(300000)

    beforeEach('BeforeEach', async function () {
        const setUp = await loadFixture(setUpTests)
        network = setUp.network
        nodes = setUp.nodes
        deployer = setUp.deployer
    })

    it('Split Fantom to Token/Token - SPOOKY', async () => {
        switch (network) {
            case 'Fantom':
                weth = WFTM
                usdc = USDC
                token = BOO
                break

            case 'Arbitrum':
                weth = WETH_ARB
                usdc = USDT_ARB
                token = ARB_ARB
                break
        
            default:
                break
        }

        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)
        const args = ethers.utils.defaultAbiCoder.encode(
            ['address', 'address[]', 'address[]', 'uint256', 'uint256[]', 'uint8[]'],
            [userAddress, [weth, usdc], [weth, token], amountWithoutFeeInWei, [5000, 0, 0], [0, 0]]
        )
        tx = await nodes.connect(deployer).split(args, [], [])
        receipt = await tx.wait()
        const splitEvent = getEvent(receipt, "Split")

        assert.equal(splitEvent.args.tokenOutput1.toLowerCase(), usdc.toLowerCase(), 'First token out is not correct.')
        // assert.equal(splitEvent.args.amountOutToken1.toString(), '2056869', 'First amount out is not correct.')
        assert.equal(splitEvent.args.tokenOutput2.toLowerCase(), token.toLowerCase(), 'Second token out is not correct.')
        // assert.equal(splitEvent.args.amountOutToken2.toString(), '1204384981521426656', 'Second amount out is not correct.')
    })
})