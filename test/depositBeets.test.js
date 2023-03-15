const { TEST_AMOUNT, calculateAmountWithoutFees } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM, BEETS } = require('../config')

describe('Deposit', function () {
    let deployer
    let nodes
    let poolId = '0x9e4341acef4147196e99d648c5e43b3fc9d026780002000000000000000005ec' // FTM - BEETS
    let pairId = '0x9e4341acef4147196e99d648c5e43b3fc9d02678'
    // this.timeout(300000)

    beforeEach('BeforeEach', async function () {
        const setUp = await loadFixture(setUpTests)
        nodes = setUp.nodes
        deployer = setUp.deployer
    })

    it('Deposit from beets pool', async () => {
        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)
        const depositTx = await nodes.connect(deployer).depositOnLp(userAddress, poolId, pairId, 1, [WFTM, BEETS], [amountWithoutFeeInWei, 0], 0, 0)
        console.log("depositTx", depositTx)
    })
})