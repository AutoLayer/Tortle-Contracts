const { expect, assert } = require('chai')
const { ethers } = require('hardhat')
const { addLiquidity, addLiquidityETH } = require('./helpers')
const { WEI } = require('./utils')

const _erc20 = require('../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json')

describe('MasterChefV2', () => {
    const VaultDepositFEE = 10
    let accounts
    let deployer
    let wftm
    let dai
    let link
    let boo
    let uniswapFactory
    let uniswapRouter
    let masterChef
    let masterChefV2
    let rewarder
    let tortleTreasury
    let otherUser
    let TortleFarmingStrategy
    let TortleFarmingStrategy2
    let TortleVault
    let TortleVault2
    let lpContract

    beforeEach(async () => {
        accounts = await ethers.getSigners()
        deployer = accounts[0]
        otherUser = accounts[1]

        wftm = await (await (await hre.ethers.getContractFactory('WrappedFtm')).deploy()).deployed()

        dai = await (
          await (await hre.ethers.getContractFactory('WERC10')).deploy('Dai Stablecoin', 'DAI', 18, deployer.getAddress())
        ).deployed()

        link = await (
          await (await hre.ethers.getContractFactory('WERC10')).deploy('ChainLink', 'LINK', 18, deployer.getAddress())
        ).deployed()

        boo = await (await (await hre.ethers.getContractFactory('SpookyToken')).deploy()).deployed()

        uniswapFactory = await (
          await (await hre.ethers.getContractFactory('UniswapV2Factory')).deploy(deployer.getAddress())
        ).deployed()

        uniswapRouter = await (
          await (await hre.ethers.getContractFactory('UniswapV2Router02')).deploy(uniswapFactory.address, wftm.address)
        ).deployed()

        masterChef = await (await (await hre.ethers.getContractFactory('MasterChef')).deploy(boo.address, 1)).deployed()

        tortleTreasury = await (await (await hre.ethers.getContractFactory('TortleTreasury')).deploy()).deployed()
        await boo.transferOwnership(masterChef.address)

        const _TortleVault = await hre.ethers.getContractFactory('TortleVault')
        const _TortleFarmingsStrategy = await hre.ethers.getContractFactory('TortleFarmingStrategy')

        const allocPoint = 2000
        const liquidity = "1000000000000000000000"

        await link.connect(deployer).approve(uniswapRouter.address, '5000000000000000000000000000')
        await dai.connect(deployer).approve(uniswapRouter.address, '5000000000000000000000000000')
        await addLiquidityETH(uniswapRouter, link.address, liquidity, 0, 0, deployer.getAddress())
        await addLiquidityETH(uniswapRouter, dai.address, liquidity, 0, 0, deployer.getAddress())

        const lpTokenLinkWftm = await uniswapFactory.getPair(link.address, wftm.address)
        await masterChef.add(allocPoint, lpTokenLinkWftm)
        const lpTokenDaiWftm = await uniswapFactory.getPair(dai.address, wftm.address)
        await masterChef.add(allocPoint, lpTokenDaiWftm)
        
        masterChefV2 = await (await (await hre.ethers.getContractFactory('MasterChefV2')).deploy(masterChef.address, boo.address, 0)).deployed()
        rewarder = await (await (await hre.ethers.getContractFactory('ComplexRewarder')).deploy(link.address, 0, masterChefV2.address)).deployed() 
        await masterChefV2.add(allocPoint, lpTokenLinkWftm, rewarder.address, true)
        
        TortleVault = await (
            await _TortleVault.deploy(lpTokenLinkWftm, 'LINK-WFTM Spooky Vault', 'ttLINKWFTM', VaultDepositFEE, WEI(9999999))
        ).deployed()

        TortleVault2 = await (
            await _TortleVault.deploy(lpTokenDaiWftm, 'DAI-WFTM Spooky Vault', 'ttLINKDAI', VaultDepositFEE, WEI(9999999))
        ).deployed()

        TortleFarmingStrategy = await (
            await _TortleFarmingsStrategy.deploy(
                lpTokenLinkWftm,
                0,
                TortleVault.address,
                tortleTreasury.address,
                uniswapRouter.address,
                masterChefV2.address,
                boo.address,
                wftm.address,
            )
        ).deployed()

        TortleFarmingStrategy2 = await (
            await _TortleFarmingsStrategy.deploy(
                lpTokenDaiWftm,
                1,
                TortleVault2.address,
                tortleTreasury.address,
                uniswapRouter.address,
                masterChefV2.address,
                boo.address,
                wftm.address,
            )
        ).deployed()

        await TortleVault.initialize(TortleFarmingStrategy.address)
        await TortleVault2.initialize(TortleFarmingStrategy2.address)
        lpContract = await await hre.ethers.getContractAt(_erc20.abi, lpTokenLinkWftm)
    })

    describe('Farm', async() => {
        it('Farm LpToken', async () => {
            const lpTokenV2 = await masterChefV2.lpToken(0)
            assert.notEqual(lpTokenV2, "0x0000000000000000000000000000000000000000")
        });

        it('Farm PoolInfo', async () => {
            const poolInfo = await masterChefV2.poolInfo(0)
            assert.equal(poolInfo[0], 0)
            assert.notEqual(poolInfo[1], 0)
            assert.equal(poolInfo[2], 2000)
        });

        it('Deposit', async () => {
            const amount = 3000
            await lpContract.connect(deployer).transfer(otherUser.getAddress(), amount)
            await lpContract.connect(otherUser).approve(TortleVault.address, amount)
            await TortleVault.connect(otherUser).deposit(amount)
            const ttTokensExpected = 2997
            const ttBalanceUser = await TortleVault.balanceOf(otherUser.getAddress())
            assert.equal(ttBalanceUser, ttTokensExpected)
            let userInfo = await masterChefV2.userInfo(0, TortleFarmingStrategy.address)
            assert.equal(userInfo.amount, amount)
            await TortleVault.connect(otherUser).withdrawAll()
        });
    })
})