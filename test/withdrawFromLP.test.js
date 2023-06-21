const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM, USDC, OPERA_ACT_II_PoolId, OPERA_ACT_II_Pair, FTMUSDCSpookyPool, WETH_ARB, BAL_ARB, BALWETHPoolId, BALWETHPair, BALWETHLp } = require('../config')
const { splitFunction } = require('./functions')
const { assert } = require('chai')

describe('Withdraw Beets', function () {
    let network
    let deployer
    let nodes
    let weth
    let token0
    let token1
    let poolId
    let pair
    let pool
    let tx
    let receipt
    // this.timeout(300000)

    beforeEach('BeforeEach', async function () {
        const setUp = await loadFixture(setUpTests)
        network = setUp.network
        nodes = setUp.nodes
        deployer = setUp.deployer

        switch (network) {
            case 'Fantom':
                weth = WFTM
                token0 = USDC
                token1 = WFTM
                poolId = OPERA_ACT_II_PoolId
                pair = OPERA_ACT_II_Pair
                pool = FTMUSDCSpookyPool
                break

            case 'Arbitrum':
                weth = WETH_ARB
                token0 = BAL_ARB
                token1 = WETH_ARB
                poolId = BALWETHPoolId
                pair = BALWETHPair
                pool = BALWETHLp
                break
        
            default:
                break
        }
    })

    it('Withdraw from Beets Pool', async () => {
        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)
        tx = await nodes.connect(deployer).swapTokens(userAddress, "0", [weth, token0], amountWithoutFeeInWei, "0", [])
        receipt = await tx.wait()
        const swapEvent = getEvent(receipt, "Swap")
        const swapAmount = swapEvent.args.amountOut.toString()

        tx = await nodes.connect(deployer).depositOnLp(userAddress, poolId, pair, 1, [token0, token1], [swapAmount.toString(), 0], 0, 0)
        receipt = await tx.wait()
        const depositEvent = getEvent(receipt, "DepositOnLP")
        const bptAmount = depositEvent.args.lpAmount.toString()

        tx = await nodes.connect(deployer).withdrawFromLp(userAddress, poolId, pair, 1, [token0, token1], [0, 0], bptAmount)
    })

    it('Withdraw from Spooky Pool', async () => {
        await nodes.connect(deployer).addFundsForFTM(userAddress, "1", { value: TEST_AMOUNT })

        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)

        const [amountOutToken1, amountOutToken2] = await splitFunction(deployer, userAddress, weth, amountWithoutFeeInWei, token0, token1)

        tx = await nodes.connect(deployer).depositOnLp(userAddress, '0x0000000000000000000000000000000000000000000000000000000000000000', pool, 0, [token0, token1], [amountOutToken1, amountOutToken2], 0, 0)
        receipt = await tx.wait()
        const depositEvent = getEvent(receipt, "DepositOnLP")
        const lpAmount = depositEvent.args.lpAmount.toString()

        tx = await nodes.connect(deployer).withdrawFromLp(userAddress, '0x0000000000000000000000000000000000000000000000000000000000000000', pool, 0, [token0, token1, token0], [0], lpAmount)
        receipt = await tx.wait()
        const withdrawEvent = getEvent(receipt, "WithdrawFromLP")

        // assert.equal(withdrawEvent.args.amountTokenDesired.toString(), '4109614', 'Token desired amount is not correct.')
    })
})