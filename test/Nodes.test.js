const { assert } = require('chai')
const { ethers } = require('hardhat')
const { addLiquidityETH } = require('./helpers')

describe('Nodes Contract', function () {
    let accounts
    let deployer
    let otherUser
    let wftm
    let dai
    let link
    let tortle
    let stringUtils
    let addressToUintIterableMap
    let nodes
    let nodes_
    let batch
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
        
        const _StringUtils = await hre.ethers.getContractFactory('StringUtils')
        stringUtils = await (await _StringUtils.deploy()).deployed()

        const _Batch = await hre.ethers.getContractFactory('Batch', {
            libraries: {
                StringUtils: stringUtils.address,
            },
        })
        batch = await (await _Batch.deploy(deployer.getAddress())).deployed()

        const _AddressToUintIterableMap = await hre.ethers.getContractFactory('AddressToUintIterableMap')
        addressToUintIterableMap = await (await _AddressToUintIterableMap.deploy()).deployed()

        const _Nodes = await hre.ethers.getContractFactory('Nodes', {
            libraries: {
                AddressToUintIterableMap: addressToUintIterableMap.address,
                StringUtils: stringUtils.address,
            },
        })
        nodes = await (await _Nodes.deploy()).deployed()
        await nodes.initializeConstructor(deployer.getAddress(), nodes_.address, batch.address, uniswapRouter.address)

        await batch.setNodeContract(nodes.address)
        
        await link.connect(deployer).transfer(otherUser.getAddress(), '50000000000000000000000')
        await dai.connect(deployer).transfer(otherUser.getAddress(), '50000000000000000000000') 
        await tortle.connect(deployer).transfer(otherUser.getAddress(), '50000000000000000000000')
        await link.connect(otherUser).approve(nodes.address, '50000000000000000000000')
        await dai.connect(otherUser).approve(nodes.address, '50000000000000000000000')
        await tortle.connect(otherUser).approve(nodes.address, '50000000000000000000000')
    });

    describe('Add funds', async() => {
        it('Add tokens', async () => {
            const balanceBefore = await nodes.getBalance(otherUser.getAddress(), link.address)

            const result = await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), link.address, "2000000000000000000");
            
            let receipt = await result.wait()
            assert.equal(receipt.events[2].args.tokenInput, link.address);
            assert.equal(receipt.events[2].args.amount, "2000000000000000000");

            const balanceAfter = await nodes.getBalance(otherUser.getAddress(), link.address)
            assert.notEqual(balanceBefore, balanceAfter)
        });

        it('Add fantom', async () => {
            const balanceBefore = await nodes.getBalance(otherUser.getAddress(), wftm.address)
            
            const result = await nodes.connect(deployer).addFundsForFTM(otherUser.getAddress(), { value: "200000000000000000" });
            
            let receipt = await result.wait()
            assert.equal(receipt.events[0].args.tokenInput, wftm.address);
            assert.equal(receipt.events[0].args.amount, "200000000000000000");

            const balanceAfter = await nodes.getBalance(otherUser.getAddress(), wftm.address)
            assert.notEqual(balanceBefore, balanceAfter)
        });
    });

    describe('Split', async() => {
        describe('Split from token', async() => {
            beforeEach(async () => { 
                await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), link.address, "2000000000000000000");
            })
    
            it('Split token to token/token', async() => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), tortle.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: link.address, amount: "2000000000000000000", firstToken: dai.address, secondToken: tortle.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), tortle.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });
    
            it('Split token to sameToken/token', async() => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), link.address)
                assert.equal(balanceBeforeToken1, "2000000000000000000");
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), dai.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: link.address, amount: "2000000000000000000", firstToken: link.address, secondToken: dai.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), link.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                assert.equal(balanceAfterToken1, "1000000000000000000");
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });
    
            it('Split token to token/ftm', async() => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: link.address, amount: "2000000000000000000", firstToken: dai.address, secondToken: wftm.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });
    
            it('Split token to ftm/token', async() => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), dai.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: link.address, amount: "2000000000000000000", firstToken: wftm.address, secondToken: dai.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });
        });
    
        describe('Split from FTM', async() => {
            beforeEach(async () => { 
                await nodes.connect(deployer).addFundsForFTM(otherUser.getAddress(), { value: "200000000000000000" });
            })
    
            it('Split ftm to token/token', async () => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), tortle.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: wftm.address, amount: "200000000000000000", firstToken: dai.address, secondToken: tortle.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), tortle.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });
        });
    });

    describe('Swap', async() => {
        it('Swap token/token', async () => {
            await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), link.address, "2000000000000000000");
            
            const balanceBefore = await nodes.getBalance(otherUser.getAddress(), dai.address)

            const result = await nodes.connect(deployer).swapTokens(otherUser.getAddress(), link.address, "2000000000000000000", dai.address, "0")
            
            let receipt = await result.wait()
            assert.equal(receipt.events[10].args.tokenInput, link.address);
            assert.equal(receipt.events[10].args.amountIn, "2000000000000000000");
            assert.equal(receipt.events[10].args.tokenOutput, dai.address);

            const balanceAfter = await nodes.getBalance(otherUser.getAddress(), dai.address)
            assert.notEqual(balanceBefore, balanceAfter)
        });

        it('Swap ftm/token', async () => {
            await nodes.connect(deployer).addFundsForFTM(otherUser.getAddress(), { value: "200000000000000000" });
            
            const balanceBefore = await nodes.getBalance(otherUser.getAddress(), tortle.address)

            const result = await nodes.connect(deployer).swapTokens(otherUser.getAddress(), wftm.address, "200000000000000000", tortle.address, "0")
            
            let receipt = await result.wait()
            assert.equal(receipt.events[5].args.tokenInput, wftm.address);
            assert.equal(receipt.events[5].args.amountIn, "200000000000000000");
            assert.equal(receipt.events[5].args.tokenOutput, tortle.address);

            const balanceAfter = await nodes.getBalance(otherUser.getAddress(), tortle.address)
            assert.notEqual(balanceBefore, balanceAfter)
        });

        it('Swap token/ftm', async () => {
            await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), link.address, "2000000000000000000");
            
            const balanceBefore = await nodes.getBalance(otherUser.getAddress(), wftm.address)

            const result = await nodes.connect(deployer).swapTokens(otherUser.getAddress(), link.address, "2000000000000000000", wftm.address, "0")
            
            let receipt = await result.wait()
            assert.equal(receipt.events[8].args.tokenInput, link.address);
            assert.equal(receipt.events[8].args.amountIn, "2000000000000000000");
            assert.equal(receipt.events[8].args.tokenOutput, wftm.address);

            const balanceAfter = await nodes.getBalance(otherUser.getAddress(), wftm.address)
            assert.notEqual(balanceBefore, balanceAfter)
        });
    });

    describe('Liquidate', async() => {
        it('Liquidate token to token', async () => {
            await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), link.address, "2000000000000000000");

            const balanceBefore = await nodes.getBalance(otherUser.getAddress(), dai.address)

            await nodes.connect(deployer).liquidate(otherUser.getAddress(), [link.address], ["2000000000000000000"], dai.address)
            
            const balanceAfter = await nodes.getBalance(otherUser.getAddress(), dai.address)
            assert.notEqual(balanceBefore, balanceAfter)
        });
        
        it('Liquidate token to ftm', async () => {
            await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), link.address, "2000000000000000000");

            const balanceBefore = await nodes.getBalance(otherUser.getAddress(), wftm.address)

            await nodes.liquidate(otherUser.getAddress(), [link.address], ["2000000000000000000"], wftm.address)
            
            const balanceAfter = await nodes.getBalance(otherUser.getAddress(), wftm.address)
            assert.notEqual(balanceBefore, balanceAfter)
        });

        it('Liquidate ftm to token', async () => {
            await nodes.connect(deployer).addFundsForFTM(otherUser.getAddress(), { value: "200000000000000000" });
            
            const balanceBefore = await nodes.getBalance(otherUser.getAddress(), link.address)

            await nodes.connect(deployer).liquidate(otherUser.getAddress(), [wftm.address], ["200000000000000000"], link.address)
        
            const balanceAfter = await nodes.getBalance(otherUser.getAddress(), link.address)
            assert.notEqual(balanceBefore, balanceAfter)
        });

        it('Liquidate tokens to token', async () => {
            await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), link.address, "2000000000000000000");
            await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), tortle.address, "2000000000000000000");

            const balanceBefore = await nodes.getBalance(otherUser.getAddress(), dai.address)

            await nodes.connect(deployer).liquidate(otherUser.getAddress(), [link.address, tortle.address], ["2000000000000000000", "2000000000000000000"], dai.address)
            
            const balanceAfter = await nodes.getBalance(otherUser.getAddress(), dai.address)
            assert.notEqual(balanceBefore, balanceAfter)
        });

        it('Liquidate tokens to ftm', async () => {
            await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), link.address, "2000000000000000000");
            await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), tortle.address, "2000000000000000000");

            const balanceBefore = await nodes.getBalance(otherUser.getAddress(), wftm.address)

            await nodes.connect(deployer).liquidate(otherUser.getAddress(), [link.address, tortle.address], ["2000000000000000000", "2000000000000000000"], wftm.address)
            
            const balanceAfter = await nodes.getBalance(otherUser.getAddress(), wftm.address)
            assert.notEqual(balanceBefore, balanceAfter)
        });
    });

    describe('Send to Wallet', async() => {
        it('Send token to wallet', async () => {
            await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), link.address, "2000000000000000000");

            const result = await nodes.connect(deployer).sendToWallet(otherUser.getAddress(), link.address, "2000000000000000000")
            
            let receipt = await result.wait()
            assert.equal(receipt.events[1].args.tokenOutput, link.address);
            assert.equal(receipt.events[1].args.amountOut, "2000000000000000000");
        });

        it('Send ftm to wallet', async () => {
            await nodes.connect(deployer).addFundsForFTM(otherUser.getAddress(), { value: "200000000000000000" });

            const result = await nodes.sendToWallet(otherUser.getAddress(), wftm.address, "200000000000000000")
            
            let receipt = await result.wait()
            assert.equal(receipt.events[0].args.tokenOutput, wftm.address);
            assert.equal(receipt.events[0].args.amountOut, "200000000000000000");
        });
    });

    describe('Recover All', async() => {
        it('Recover tokens', async () => {
            await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), link.address, "2000000000000000000");
            await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), dai.address, "2000000000000000000");

            const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), link.address)
            const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), dai.address)

            await nodes.connect(otherUser).recoverAll([link.address, dai.address], ["2000000000000000000", "2000000000000000000"])
            
            const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), link.address)
            const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), dai.address)
            assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
            assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
        });

        it('Recover token and ftm', async () => {
            await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), link.address, "2000000000000000000");
            await nodes.connect(deployer).addFundsForFTM(otherUser.getAddress(), { value: "200000000000000000" });

            const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), link.address)
            const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), wftm.address)

            await nodes.connect(otherUser).recoverAll([link.address, wftm.address], ["2000000000000000000", "200000000000000000"])
            
            const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), link.address)
            const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
            assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
            assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
        });
    });
});