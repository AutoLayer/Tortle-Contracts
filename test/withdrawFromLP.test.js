const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM, USDC, OPERA_ACT_II_PoolId, OPERA_ACT_II_Pair, FTMUSDCSpookyPool } = require('../config')
const { assert } = require('chai')

describe('Withdraw Beets', function () {
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

    it('Withdraw from Beets Pool', async () => {
        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)
        tx = await nodes.connect(deployer).swapTokens(userAddress, "0", [WFTM, USDC], amountWithoutFeeInWei, "0", [])
        receipt = await tx.wait()
        const swapEvent = getEvent(receipt, "Swap")
        const usdcAmountOut = swapEvent.args.amountOut.toString()

        tx = await nodes.connect(deployer).depositOnLp(userAddress, OPERA_ACT_II_PoolId, OPERA_ACT_II_Pair, 1, [USDC, WFTM], [usdcAmountOut.toString(), 0], 0, 0)
        receipt = await tx.wait()
        const depositEvent = getEvent(receipt, "DepositOnLP")
        const bptAmount = depositEvent.args.lpAmount.toString()

        tx = await nodes.connect(deployer).withdrawFromLp(userAddress, OPERA_ACT_II_PoolId, OPERA_ACT_II_Pair, 1, [USDC, WFTM], [0, 0], bptAmount)
    })

    it('Withdraw from Spooky Pool', async () => {
        await nodes.connect(deployer).addFundsForFTM(userAddress, "1", { value: TEST_AMOUNT })

        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)
        const args = ethers.utils.defaultAbiCoder.encode(
            ['address', 'address[]', 'address[]', 'uint256', 'uint256[]', 'uint8[]'],
            [userAddress, [WFTM, USDC], [WFTM, WFTM], amountWithoutFeeInWei, [5000, 0, 0], [0, 0]]
        )
        tx = await nodes.connect(deployer).split(args, [], [])
        receipt = await tx.wait()
        const splitEvent = getEvent(receipt, "Split")
        const amountOutToken1 = splitEvent.args.amountOutToken1.toString()
        const amountOutToken2 = splitEvent.args.amountOutToken2.toString()

        tx = await nodes.connect(deployer).depositOnLp(userAddress, '0x0000000000000000000000000000000000000000000000000000000000000000', FTMUSDCSpookyPool, 0, [USDC, WFTM], [amountOutToken1, amountOutToken2], 0, 0)
        receipt = await tx.wait()
        const depositEvent = getEvent(receipt, "DepositOnLP")
        const lpAmount = depositEvent.args.lpAmount.toString()

        tx = await nodes.connect(deployer).withdrawFromLp(userAddress, '0x0000000000000000000000000000000000000000000000000000000000000000', FTMUSDCSpookyPool, 0, [USDC, WFTM, USDC], [0], lpAmount)
        receipt = await tx.wait()
        const withdrawEvent = getEvent(receipt, "WithdrawFromLP")

        assert.equal(withdrawEvent.args.amountTokenDesired.toString(), '4109614', 'Token desired amount is not correct.')
    })
})