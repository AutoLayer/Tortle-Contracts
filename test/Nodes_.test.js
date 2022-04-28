const { assert } = require('chai')
const { ethers } = require('hardhat')
const { addLiquidityETH } = require('./helpers')

describe('Nodes_ Contract', function () {
    let accounts
    let deployer
    let otherUser
    let wftm
    let dai
    let link
    let tortle
    let nodes_
    let uniswapFactory
    let uniswapRouter

    beforeEach(async() => {
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

        tortle = await (
        await (await hre.ethers.getContractFactory('WERC10')).deploy('Tortle', 'TRTL', 18, deployer.getAddress())
        ).deployed()
        
        uniswapFactory = await (
        await (await hre.ethers.getContractFactory('UniswapV2Factory')).deploy(deployer.getAddress())
        ).deployed()
        
        uniswapRouter = await (
        await (await hre.ethers.getContractFactory('UniswapV2Router02')).deploy(uniswapFactory.address, wftm.address)
        ).deployed()

        const liquidity = "1000000000000000000000"
        await link.connect(deployer).approve(uniswapRouter.address, '5000000000000000000000000000')
        await dai.connect(deployer).approve(uniswapRouter.address, '5000000000000000000000000000')
        await tortle.connect(deployer).approve(uniswapRouter.address, '5000000000000000000000000000')
        await addLiquidityETH(uniswapRouter, link.address, liquidity, 0, 0, deployer.getAddress())
        await addLiquidityETH(uniswapRouter, dai.address, liquidity, 0, 0, deployer.getAddress())
        await addLiquidityETH(uniswapRouter, tortle.address, liquidity, 0, 0, deployer.getAddress())
        
        const _Nodes_ = await hre.ethers.getContractFactory('Nodes_')
        nodes_ = await (await _Nodes_.deploy(deployer.getAddress(), uniswapRouter.address)).deployed()
        
        await link.connect(deployer).transfer(otherUser.getAddress(), '50000000000000000000000')
        await dai.connect(deployer).transfer(otherUser.getAddress(), '50000000000000000000000') 
        await tortle.connect(deployer).transfer(otherUser.getAddress(), '50000000000000000000000')
    });

    describe('Swaps', async () => {
        it('Swap token/token', async () => {
            const balanceBefore = await dai.balanceOf(otherUser.getAddress())

            await link.connect(otherUser).transfer(nodes_.address, '2000000000000000000')
            await nodes_.connect(otherUser).swapTokens(link.address, "2000000000000000000", dai.address, "0")

            const balanceAfter = await dai.balanceOf(otherUser.getAddress())
            assert.notEqual(balanceBefore, balanceAfter)
        });

        it('Swap ftm/token', async () => {
            const balanceBefore = await tortle.balanceOf(otherUser.getAddress())

            await otherUser.sendTransaction({
                to: nodes_.address,
                value: ethers.utils.parseEther("1") // 1 ether
            })
            await nodes_.connect(otherUser).swapTokens(wftm.address, "1000000000000000000", tortle.address, "0")

            const balanceAfter = await tortle.balanceOf(otherUser.getAddress())
            assert.notEqual(balanceBefore, balanceAfter)
        });

        it('Swap token/ftm', async () => {
            const balanceBefore = await otherUser.getBalance()

            await link.connect(otherUser).transfer(nodes_.address, '2000000000000000000')
            await nodes_.connect(otherUser).swapTokens(link.address, "2000000000000000000", wftm.address, "0")
            
            const balanceAfter = await otherUser.getBalance()
            assert.notEqual(balanceBefore, balanceAfter)
        });
    });

    describe('Splits', async () => {
        it('Split token to token/token', async () => {
            const balanceBeforeToken1 = await dai.balanceOf(otherUser.getAddress())
            const balanceBeforeToken2 = await tortle.balanceOf(otherUser.getAddress())

            await link.connect(otherUser).transfer(nodes_.address, "2000000000000000000")
            await nodes_.connect(otherUser).split(link.address, "2000000000000000000", dai.address, tortle.address, "5000", "0", "0")
        
            const balanceAfterToken1 = await dai.balanceOf(otherUser.getAddress())
            const balanceAfterToken2 = await tortle.balanceOf(otherUser.getAddress())
            assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
            assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
        });
        
        it('Split token to token/ftm', async () => {
            const balanceBeforeToken1 = await dai.balanceOf(otherUser.getAddress())
            const balanceBeforeToken2 = await otherUser.getBalance()

            await link.connect(otherUser).transfer(nodes_.address, "2000000000000000000")
            await nodes_.connect(otherUser).split(link.address, "2000000000000000000", dai.address, wftm.address, "5000", "0", "0")
        
            const balanceAfterToken1 = await dai.balanceOf(otherUser.getAddress())
            const balanceAfterToken2 = await otherUser.getBalance()
            assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
            assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
        });

        it('Split token to ftm/token', async () => {
            const balanceBeforeToken1 = await otherUser.getBalance()
            const balanceBeforeToken2 = await dai.balanceOf(otherUser.getAddress())

            await link.connect(otherUser).transfer(nodes_.address, "2000000000000000000")
            await nodes_.connect(otherUser).split(link.address, "2000000000000000000", wftm.address, dai.address, "5000", "0", "0")
        
            const balanceAfterToken1 = await otherUser.getBalance()
            const balanceAfterToken2 = await dai.balanceOf(otherUser.getAddress())
            assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
            assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
        });

        it('Split ftm to token/token', async () => {
            const balanceBeforeToken1 = await link.balanceOf(otherUser.getAddress())
            const balanceBeforeToken2 = await dai.balanceOf(otherUser.getAddress())

            await otherUser.sendTransaction({
                to: nodes_.address,
                value: ethers.utils.parseEther("1") // 1 ether
            })
            await nodes_.connect(otherUser).split(wftm.address, "1000000000000000000", link.address, dai.address, "5000", "0", "0")
        
            const balanceAfterToken1 = await link.balanceOf(otherUser.getAddress())
            const balanceAfterToken2 = await dai.balanceOf(otherUser.getAddress())
            assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
            assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
        });
    });
});