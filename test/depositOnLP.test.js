const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM, BEETS, FTMBEETSPoolId, FTMBEETSPair, FTMBEETSSpookyPool, WETH_ARB, SUSHI_ARB, BALWETHPoolId, BALWETHPair, WETHSUSHILp } = require('../config')
const { splitFunction } = require('./functions')
const { assert } = require('chai')

describe('Deposit On LP', function () {
    let network
    let deployer
    let nodes
    let weth
    let token0
    let token1
    let poolId
    let pair
    let pool
    // this.timeout(300000)

    beforeEach('BeforeEach', async function () {
        const setUp = await loadFixture(setUpTests)
        network = setUp.network
        nodes = setUp.nodes
        deployer = setUp.deployer

        switch (network) {
            case 'Fantom':
                weth = WFTM
                token0 = WFTM
                token1 = BEETS
                poolId = FTMBEETSPoolId
                pair = FTMBEETSPair
                pool = FTMBEETSSpookyPool
                break

            case 'Arbitrum':
                weth = WETH_ARB
                token0 = WETH_ARB
                token1 = SUSHI_ARB
                poolId = BALWETHPoolId
                pair = BALWETHPair
                pool = WETHSUSHILp
                break
        
            default:
                break
        }
    })

    it('Deposit on beets pool', async () => {
        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)
        tx = await nodes.connect(deployer).depositOnLp(userAddress, poolId, pair, 1, [token0, token1], [amountWithoutFeeInWei, 0], 0, 0)
        receipt = await tx.wait()
        const depositOnLp = getEvent(receipt, "DepositOnLP")

        // assert.equal(depositOnLp.args.lpAmount.toString(), '59811956094026479241', 'LP amount is not correct.')
    })

    it('Deposit on spooky pool', async () => {
        await nodes.connect(deployer).addFundsForFTM(userAddress, "1", { value: TEST_AMOUNT })

        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)

        const [amountOutToken1, amountOutToken2] = await splitFunction(deployer, userAddress, weth, amountWithoutFeeInWei, token0, token1)

        tx = await nodes.connect(deployer).depositOnLp(userAddress, "0x0000000000000000000000000000000000000000000000000000000000000000", pool, 0, [token0, token1], [amountOutToken1, amountOutToken2], 0, 0)
        receipt = await tx.wait()
        const depositOnLp = getEvent(receipt, "DepositOnLP")

        // assert.equal(depositOnLp.args.lpAmount.toString(), '11219618907583661990', 'LP amount is not correct.')
    })
})