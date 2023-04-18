const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { assert } = require('chai')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM, DEUS, WFTMDEUSLp, WFTMDEUStortleVault } = require('../config')
const { splitFunction } = require('./functions')

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

        const [amountOutToken1, amountOutToken2] = await splitFunction(deployer, userAddress, WFTM, amountWithoutFeeInWei, WFTM, DEUS)

        const provider = 0
        tx = await nodes.connect(deployer).depositOnFarmTokens(userAddress, WFTMDEUSLp, WFTMDEUStortleVault, [WFTM, DEUS], amountOutToken1, amountOutToken2, [], provider)
        receipt = await tx.wait()
        const depositOnFarmEvent = getEvent(receipt, "DepositOnFarm")

        assert.equal(depositOnFarmEvent.args.ttAmount.toString(), '339603668395867400', 'TT amount is not correct.')
        assert.equal(depositOnFarmEvent.args.lpBalance.toString(), '343668445926858085', 'LP amount is not correct.')
    })
})