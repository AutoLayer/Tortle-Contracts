const { loadFixture } = require('ethereum-waffle')
const { setUpTests } = require('../../scripts/lib/setUpTests')
const { TEST_AMOUNT, getEvent, calculateAmountWithoutFees } = require('../utils')
const { userAddress, WFTM, USDC, DEUS, WFTMDEUSLp, WFTMDEUStortleVault } = require('../../config')
const { splitFunction } = require('../functions')

describe('Recipe with 4 Farms', function () {
    let deployer
    let nodes
    let tx
    let receipt

    beforeEach('BeforeEach', async function () {
        const setUp = await loadFixture(setUpTests)
        nodes = setUp.nodes
        deployer = setUp.deployer
    })

    it('Deposit on Spooky Farms', async () => {
        const amountWithoutFeeInWei = calculateAmountWithoutFees(TEST_AMOUNT)

        const [amountOutFirstToken, amountOutSecondToken] = await splitFunction(nodes, deployer, userAddress, WFTM, amountWithoutFeeInWei, USDC, USDC)
        const [amountOutSplit2FirstToken, amountOutSplit2SecondToken] = await splitFunction(nodes, deployer, userAddress, USDC, amountOutFirstToken, USDC, USDC)
        const [amountOutSplit3FirstToken, amountOutSplit3SecondToken] = await splitFunction(nodes, deployer, userAddress, USDC, amountOutSecondToken, USDC, USDC)

        const provider = 0

        let amountsOutTokens = await splitFunction(nodes, deployer, userAddress, USDC, amountOutSplit2FirstToken, WFTM, DEUS)
        tx = await nodes.connect(deployer).depositOnFarmTokens(userAddress, WFTMDEUSLp, WFTMDEUStortleVault, [WFTM, DEUS], amountsOutTokens[0], amountsOutTokens[1], [], provider)
        receipt = await tx.wait()
        const depositOnFarmEvent1 = getEvent(receipt, "DepositOnFarm")

        amountsOutTokens = await splitFunction(nodes, deployer, userAddress, USDC, amountOutSplit2SecondToken, WFTM, DEUS)
        tx = await nodes.connect(deployer).depositOnFarmTokens(userAddress, WFTMDEUSLp, WFTMDEUStortleVault, [WFTM, DEUS], amountsOutTokens[0], amountsOutTokens[1], [], provider)
        receipt = await tx.wait()
        const depositOnFarmEvent2 = getEvent(receipt, "DepositOnFarm")

        amountsOutTokens = await splitFunction(nodes, deployer, userAddress, USDC, amountOutSplit3FirstToken, WFTM, DEUS)
        tx = await nodes.connect(deployer).depositOnFarmTokens(userAddress, WFTMDEUSLp, WFTMDEUStortleVault, [WFTM, DEUS], amountsOutTokens[0], amountsOutTokens[1], [], provider)
        receipt = await tx.wait()
        const depositOnFarmEvent3 = getEvent(receipt, "DepositOnFarm")

        amountsOutTokens = await splitFunction(nodes, deployer, userAddress, USDC, amountOutSplit3SecondToken, WFTM, DEUS)
        tx = await nodes.connect(deployer).depositOnFarmTokens(userAddress, WFTMDEUSLp, WFTMDEUStortleVault, [WFTM, DEUS], amountsOutTokens[0], amountsOutTokens[1], [], provider)
        receipt = await tx.wait()
        const depositOnFarmEvent4 = getEvent(receipt, "DepositOnFarm")

        console.log('Event Farm 1: ', depositOnFarmEvent1)
        console.log('Event Farm 2: ', depositOnFarmEvent2)
        console.log('Event Farm 3: ', depositOnFarmEvent3)
        console.log('Event Farm 4: ', depositOnFarmEvent4)
    })
})