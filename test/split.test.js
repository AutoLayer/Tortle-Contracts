const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('./utils')
const { loadFixture } = require('ethereum-waffle')
const { assert } = require('chai')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM, USDC, BOO } = require('../config')

describe('Split', function () {
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

    it('Split Fantom to Token/Token - SPOOKY', async () => {
        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)
        const args = ethers.utils.defaultAbiCoder.encode(
            ['address', 'address[]', 'address[]', 'uint256', 'uint256[]', 'uint8[]'],
            [userAddress, [WFTM, USDC], [WFTM, BOO], amountWithoutFeeInWei, [5000, 0, 0], [0, 0]]
        )
        tx = await nodes.connect(deployer).split(args, [], [])
        receipt = await tx.wait()
        const splitEvent = getEvent(receipt, "Split")
        console.log(splitEvent)
    })
})