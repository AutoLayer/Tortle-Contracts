const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM, BEETS, FTMBEETSPoolId, FTMBEETSPair, FTMBEETSSpookyPool } = require('../config')
const { assert } = require('chai')

describe('Deposit On LP', function () {
    let deployer
    let nodes
    // this.timeout(300000)

    beforeEach('BeforeEach', async function () {
        const setUp = await loadFixture(setUpTests)
        nodes = setUp.nodes
        deployer = setUp.deployer
    })

    it('Deposit on beets pool', async () => {
        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)
        tx = await nodes.connect(deployer).depositOnLp(userAddress, FTMBEETSPoolId, FTMBEETSPair, 1, [WFTM, BEETS], [amountWithoutFeeInWei, 0], 0, 0)
        receipt = await tx.wait()
        const depositOnLp = getEvent(receipt, "DepositOnLP")

        assert.equal(depositOnLp.args.lpAmount.toString(), '59811956094026479241', 'LP amount is not correct.')
    })

    xit('Deposit on spooky pool', async () => {
        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)
        const args = ethers.utils.defaultAbiCoder.encode(
            ['address', 'address[]', 'address[]', 'uint256', 'uint256[]', 'uint8[]'],
            [userAddress, [WFTM, WFTM], [WFTM, BEETS], amountWithoutFeeInWei, [5000, 0, 0], [0, 0]]
        )
        tx = await nodes.connect(deployer).split(args, [], [])
        receipt = await tx.wait()
        const splitEvent = getEvent(receipt, "Split")
        const amountOutToken1 = splitEvent.args.amountOutToken1.toString()
        const amountOutToken2 = splitEvent.args.amountOutToken2.toString()

        tx = await nodes.connect(deployer).depositOnLp(userAddress, "0x0000000000000000000000000000000000000000000000000000000000000000", FTMBEETSSpookyPool, 0, [WFTM, BEETS], [amountOutToken1, amountOutToken2], 0, 0)
        receipt = await tx.wait()
        const depositOnLp = getEvent(receipt, "DepositOnLP")

        assert.equal(depositOnLp.args.lpAmount.toString(), '11219618907583661990', 'LP amount is not correct.')
    })
})