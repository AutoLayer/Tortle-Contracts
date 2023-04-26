const { TEST_AMOUNT, calculateAmountWithoutFees } = require('./utils')
const { ethers } = require('hardhat')
const { loadFixture } = require('ethereum-waffle')
const { setUpTests } = require('../scripts/lib/setUpTests')
const { userAddress, WFTM, USDC } = require('../config')
const { swapFunction } = require('./functions')

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
        const amountWithoutFeeInWei = calculateAmountWithoutFees('40000000000000000000') // 40 FTM
        await nodes.connect(deployer).addFundsForFTM(userAddress, "1", { value: amountWithoutFeeInWei })

        let path_ = [WFTM] // FTM/FTM
        let indexToken_ = WFTM // FTM
        let isLong_ = 'true'
        let amount_ = amountWithoutFeeInWei
        let leverage = 2
        let indexTokenPrice = BigInt(0.4281 * 1000000000000000000000000000000 * leverage).toString()// 1 entryToken USD price multiplied * 10^30 -> 0.47$ FTM ^10 ^30
        let executionFee_ = '200000000000000000'
        let amountOutMin_ = '0'
        let provider_ = 0
        const args = ethers.utils.defaultAbiCoder.encode(['address[]', 'address', 'bool', 'uint256', 'uint256', 'uint256', 'uint256', /*'uint8',*/ 'uint8'], [path_, indexToken_, isLong_, amount_, indexTokenPrice, executionFee_, amountOutMin_, /*leverage,*/ provider_]);
        tx = await nodes.connect(deployer).openPerpPosition(userAddress, "1", args)
        receipt = await tx.wait()
        console.log(receipt)
    })
})