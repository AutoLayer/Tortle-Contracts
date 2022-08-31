const { assert } = require('chai')
const { ethers } = require('hardhat')
const { addLiquidityETH, addLiquidity } = require('./helpers')

describe('Nodes_ Contract', function () {
    let accounts
    let deployer
    let otherUser
    let wftm
    let usdc
    let dai
    let link
    let tortle
    let boo
    let nodes_
    let uniswapFactory
    let uniswapFactory2
    let uniswapRouter
    let uniswapRouter2

    beforeEach(async() => {
        accounts = await ethers.getSigners()
        deployer = accounts[0]
        otherUser = accounts[1]

        wftm = await (await (await hre.ethers.getContractFactory('WrappedFtm')).deploy()).deployed()

        usdc = await (
        await (await hre.ethers.getContractFactory('WERC10')).deploy('USDC', 'USDC', 18, deployer.getAddress())
        ).deployed()

        dai = await (
        await (await hre.ethers.getContractFactory('WERC10')).deploy('Dai Stablecoin', 'DAI', 18, deployer.getAddress())
        ).deployed()

        link = await (
        await (await hre.ethers.getContractFactory('WERC10')).deploy('ChainLink', 'LINK', 18, deployer.getAddress())
        ).deployed()

        tortle = await (
        await (await hre.ethers.getContractFactory('WERC10')).deploy('Tortle', 'TRTL', 18, deployer.getAddress())
        ).deployed()

        boo = await (
        await (await hre.ethers.getContractFactory('WERC10')).deploy('SpookyToken', 'BOO', 18, deployer.getAddress())
        ).deployed()
        
        uniswapFactory = await (
        await (await hre.ethers.getContractFactory('UniswapV2Factory')).deploy(deployer.getAddress())
        ).deployed()
        
        uniswapRouter = await (
        await (await hre.ethers.getContractFactory('UniswapV2Router02')).deploy(uniswapFactory.address, wftm.address)
        ).deployed()

        uniswapFactory2 = await (
        await (await hre.ethers.getContractFactory('UniswapV2Factory')).deploy(deployer.getAddress())
        ).deployed()
        
        uniswapRouter2 = await (
        await (await hre.ethers.getContractFactory('UniswapV2Router02')).deploy(uniswapFactory2.address, wftm.address)
        ).deployed()

        const liquidity = "1000000000000000000000"
        // Router1
        await link.connect(deployer).approve(uniswapRouter.address, '5000000000000000000000000000')
        await dai.connect(deployer).approve(uniswapRouter.address, '5000000000000000000000000000')
        await usdc.connect(deployer).approve(uniswapRouter.address, '5000000000000000000000000000')
        await addLiquidity(uniswapRouter, [usdc.address, dai.address], [liquidity, liquidity], [0, 0], deployer.getAddress())
        await addLiquidityETH(uniswapRouter, link.address, liquidity, 0, 0, deployer.getAddress())
        await addLiquidityETH(uniswapRouter, dai.address, liquidity, 0, 0, deployer.getAddress())
        await addLiquidityETH(uniswapRouter, usdc.address, liquidity, 0, 0, deployer.getAddress())
        // Router 2
        await tortle.connect(deployer).approve(uniswapRouter2.address, '5000000000000000000000000000')
        await boo.connect(deployer).approve(uniswapRouter2.address, '5000000000000000000000000000')
        await addLiquidityETH(uniswapRouter2, tortle.address, liquidity, 0, 0, deployer.getAddress())
        await addLiquidityETH(uniswapRouter2, boo.address, liquidity, 0, 0, deployer.getAddress())
        
        const _Nodes_ = await hre.ethers.getContractFactory('Nodes_')
        nodes_ = await (await _Nodes_.deploy(deployer.getAddress(), usdc.address, [uniswapRouter.address, uniswapRouter2.address])).deployed()

        await wftm.connect(deployer).transfer(otherUser.getAddress(), '50000000000000000000000')
        await link.connect(deployer).transfer(otherUser.getAddress(), '50000000000000000000000')
        await dai.connect(deployer).transfer(otherUser.getAddress(), '50000000000000000000000')
        await usdc.connect(deployer).transfer(otherUser.getAddress(), '50000000000000000000000')
        await tortle.connect(deployer).transfer(otherUser.getAddress(), '50000000000000000000000')
        await boo.connect(deployer).transfer(otherUser.getAddress(), '50000000000000000000000')
    });

    describe('Swaps', async () => {
        it('Swap tokenRouterA/tokenRouterB', async () => {
            const balanceBefore = await tortle.balanceOf(otherUser.getAddress())

            await link.connect(otherUser).transfer(nodes_.address, '2000000000000000000')
            await nodes_.connect(otherUser).swapTokens(link.address, "2000000000000000000", tortle.address, "0")

            const balanceAfter = await tortle.balanceOf(otherUser.getAddress())
            assert.notEqual(balanceBefore, balanceAfter)
        });

        it('Swap tokenRouterB/tokenRouterA', async () => {
            const balanceBefore = await dai.balanceOf(otherUser.getAddress())

            await tortle.connect(otherUser).transfer(nodes_.address, '2000000000000000000')
            await nodes_.connect(otherUser).swapTokens(tortle.address, "2000000000000000000", dai.address, "0")

            const balanceAfter = await dai.balanceOf(otherUser.getAddress())
            assert.notEqual(balanceBefore, balanceAfter)
        });

        it('Swap ftm/tokenRouterA', async () => {
            const balanceBefore = await link.balanceOf(otherUser.getAddress())

            await wftm.connect(otherUser).transfer(nodes_.address, '1000000000000000000')
            await nodes_.connect(otherUser).swapTokens(wftm.address, "1000000000000000000", link.address, "0")

            const balanceAfter = await link.balanceOf(otherUser.getAddress())
            assert.notEqual(balanceBefore, balanceAfter)
        });

        it('Swap ftm/tokenRouterB', async () => {
            const balanceBefore = await tortle.balanceOf(otherUser.getAddress())

            await wftm.connect(otherUser).transfer(nodes_.address, '1000000000000000000')
            await nodes_.connect(otherUser).swapTokens(wftm.address, "1000000000000000000", tortle.address, "0")

            const balanceAfter = await tortle.balanceOf(otherUser.getAddress())
            assert.notEqual(balanceBefore, balanceAfter)
        });

        it('Swap tokenRouterA/ftm', async () => {
            const balanceBefore = await wftm.balanceOf(otherUser.getAddress())
            
            await link.connect(otherUser).transfer(nodes_.address, '2000000000000000000')
            await nodes_.connect(otherUser).swapTokens(link.address, "2000000000000000000", wftm.address, "0")
            
            const balanceAfter = await wftm.balanceOf(otherUser.getAddress())
            assert.notEqual(balanceBefore, balanceAfter)
        });

        it('Swap tokenRouterB/ftm', async () => {
            const balanceBefore = await wftm.balanceOf(otherUser.getAddress())

            await tortle.connect(otherUser).transfer(nodes_.address, '2000000000000000000')
            await nodes_.connect(otherUser).swapTokens(tortle.address, "2000000000000000000", wftm.address, "0")
            
            const balanceAfter = await wftm.balanceOf(otherUser.getAddress())
            assert.notEqual(balanceBefore, balanceAfter)
        });
    });
});