const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { assert } = require('chai')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM, DEUS, WFTMDEUSLp, WFTMDEUStortleVault } = require('../config')

describe('Deposit On Farm', function () {
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

    it('Deposit on spooky farm', async () => {
        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)
        const args = ethers.utils.defaultAbiCoder.encode(
            ['address', 'address[]', 'address[]', 'uint256', 'uint256[]', 'uint8[]'],
            [userAddress, [WFTM, WFTM], [WFTM, DEUS], amountWithoutFeeInWei, [5000, 0, 0], [0, 0]]
        )
        tx = await nodes.connect(deployer).split(args, [], [])
        receipt = await tx.wait()
        const splitEvent = getEvent(receipt, "Split")
        const amountOutToken1 = splitEvent.args.amountOutToken1.toString()
        const amountOutToken2 = splitEvent.args.amountOutToken2.toString()

        tx = await nodes.connect(deployer).depositOnFarmTokens(userAddress, WFTMDEUSLp, WFTMDEUStortleVault, [WFTM, DEUS], amountOutToken1, amountOutToken2, [])
        receipt = await tx.wait()
        const depositOnFarmEvent = getEvent(receipt, "DepositOnFarm")

        assert.equal(depositOnFarmEvent.args.ttAmount.toString(), '339603668395867400', 'TT amount is not correct.')
        assert.equal(depositOnFarmEvent.args.lpBalance.toString(), '343668445926858085', 'LP amount is not correct.')
    })
})