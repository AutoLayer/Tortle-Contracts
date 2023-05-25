const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('./utils')
const { ethers } = require('hardhat')
const { loadFixture } = require('ethereum-waffle')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM } = require('../config')

describe('Open Perpetual Position', function () {
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

    it('Open Perpetual Position with FTM', async () => {
        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT) // 40 FTM
       // await nodes.connect(deployer).addFundsForFTM(userAddress, "1", { value: amountWithoutFeeInWei })

        let path_ = [WFTM] // FTM/FTM
        let indexToken_ = WFTM // FTM
        let isLong_ = 'true'
        let amount_ = amountWithoutFeeInWei
        let leverage = 2.1
        let indexTokenPrice = BigInt(0.368 * 1000000000000000000000000000000).toString()
        let preSizeDelta = (BigInt(0.368 * 1000000000000000000000000000000 * leverage)).toString()
        let amountOutMin_ = '0'
        let provider_ = 0
        console.log("Args sent", path_, indexToken_, isLong_, amount_.toString(), preSizeDelta, indexTokenPrice, amountOutMin_, provider_)
        const args = ethers.utils.defaultAbiCoder.encode(['address[]', 'address', 'bool', 'uint256', 'uint256', 'uint256', 'uint256', 'uint8'], [path_, indexToken_, isLong_, amount_, preSizeDelta, indexTokenPrice, amountOutMin_, provider_]);
        tx = await nodes.connect(deployer).openPerpPosition(userAddress, "1", amount_, args)
        receipt = await tx.wait()
        const CreateIncreasePosition = getEvent(receipt, "OpenPosition")
        console.log("increasePositionEvent", CreateIncreasePosition.args.data.toString())
    })
})