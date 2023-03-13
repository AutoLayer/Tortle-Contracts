const { ethers } = require('hardhat')
const { TEST_AMOUNT, WFTM, BEETS, USDC, getEvent} = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress } = require('../config')

describe('Deposit', function () {
    let deployer
    let nodes
    let poolId = '0x56ad84b777ff732de69e85813daee1393a9ffe1000020000000000000000060e' // opera act II
    let pairId = '0x56ad84b777ff732de69e85813daee1393a9ffe10'
    let tx
    let receipt
    // this.timeout(300000)

    beforeEach('BeforeEach', async function () {
        const setUp = await loadFixture(setUpTests)
        nodes = setUp.nodes
        deployer = setUp.deployer
    })

    it('Withdraw from beets pool', async () => {
        const amountInEthers = ethers.utils.formatEther(TEST_AMOUNT)
        const amountWithoutFeeInEthers = amountInEthers - (amountInEthers * 0.005)
        const amountWithoutFeeInWei = ethers.utils.parseEther(amountWithoutFeeInEthers.toString())
        tx = await nodes.connect(deployer).swapTokens(userAddress, "0", [WFTM, USDC], amountWithoutFeeInWei, "0", [])
        receipt = await tx.wait()
        const swapEvent = getEvent(receipt, "Swap")
        const usdcAmountOut = swapEvent.args.amountOut.toString()

        const depositTx = await nodes.connect(deployer).depositOnLp(userAddress, poolId, pairId, 1, [USDC, WFTM], [usdcAmountOut.toString(), 0], 0, 0)
        receipt = await depositTx.wait()
        const depositEvent = getEvent(receipt, "DepositOnLP")
        const bptAmount = depositEvent.args.lpAmount.toString()

        const withdrawTx = await nodes.connect(deployer).withdrawFromLp(userAddress, poolId, pairId, 1, [USDC, WFTM], [0, 0], bptAmount)
    })
})