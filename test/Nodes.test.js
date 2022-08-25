const { assert } = require('chai')
const { ethers } = require('hardhat')
const { addLiquidityETH } = require('./helpers')

describe('Nodes Contract', function () {
    let accounts
    let deployer
    let otherUser
    let dojos
    let treasury
    let dev_fund
    let wftm
    let usdc
    let dai
    let link
    let tortle
    let boo
    let stringUtils
    let addressToUintIterableMap
    let nodes
    let nodes_
    let batch
    let uniswapFactory
    let uniswapFactory2
    let uniswapRouter
    let uniswapRouter2
    let pairLinkDai

    beforeEach(async() => {
        accounts = await ethers.getSigners()
        deployer = accounts[0]
        otherUser = accounts[1]
        dojos = accounts[2]
        treasury = accounts[3]
        dev_fund = accounts[4]

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
        await addLiquidityETH(uniswapRouter, link.address, liquidity, 0, 0, deployer.getAddress())
        await addLiquidityETH(uniswapRouter, dai.address, liquidity, 0, 0, deployer.getAddress())
        // Router 2
        await tortle.connect(deployer).approve(uniswapRouter2.address, '5000000000000000000000000000')
        await boo.connect(deployer).approve(uniswapRouter2.address, '5000000000000000000000000000')
        await addLiquidityETH(uniswapRouter2, tortle.address, liquidity, 0, 0, deployer.getAddress())
        await addLiquidityETH(uniswapRouter2, boo.address, liquidity, 0, 0, deployer.getAddress())

        pairLinkDai = await uniswapFactory.getPair(link.address, wftm.address)
        
        const _Nodes_ = await hre.ethers.getContractFactory('Nodes_')
        nodes_ = await (await _Nodes_.deploy(deployer.getAddress(), [uniswapRouter.address, uniswapRouter2.address])).deployed()
        
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
        await nodes.initializeConstructor(deployer.getAddress(), nodes_.address, batch.address, dojos.getAddress(), treasury.getAddress(), dev_fund.getAddress(), usdc.address, uniswapRouter.address)

        await batch.setNodeContract(nodes.address)
        
        await link.connect(deployer).transfer(otherUser.getAddress(), '50000000000000000000000')
        await dai.connect(deployer).transfer(otherUser.getAddress(), '50000000000000000000000') 
        await tortle.connect(deployer).transfer(otherUser.getAddress(), '50000000000000000000000')
        await boo.connect(deployer).transfer(otherUser.getAddress(), '50000000000000000000000')
        await link.connect(otherUser).approve(nodes.address, '50000000000000000000000')
        await dai.connect(otherUser).approve(nodes.address, '50000000000000000000000')
        await tortle.connect(otherUser).approve(nodes.address, '50000000000000000000000')
        await boo.connect(otherUser).approve(nodes.address, '50000000000000000000000')
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
            assert.equal(receipt.events[1].args.tokenInput, wftm.address);
            assert.equal(receipt.events[1].args.amount, "200000000000000000");

            const balanceAfter = await nodes.getBalance(otherUser.getAddress(), wftm.address)
            assert.notEqual(balanceBefore, balanceAfter)
        });
    });

    describe('Split', async() => {
        describe('Split from TokenRouterA', async() => {
            beforeEach(async () => { 
                await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), link.address, "2000000000000000000");
            })
    
            it('Split tokenRouterA to tokenRouterA/tokenRouterA', async() => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), link.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: link.address, amount: "2000000000000000000", firstToken: dai.address, secondToken: link.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), link.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });
    
            it('Split tokenRouterA to tokenRouterA/tokenRouterB', async() => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), link.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), boo.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: link.address, amount: "2000000000000000000", firstToken: link.address, secondToken: boo.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), link.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), boo.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1);
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });

            it('Split tokenRouterA to tokenRouterB/tokenRouterB', async() => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), tortle.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), boo.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: link.address, amount: "2000000000000000000", firstToken: tortle.address, secondToken: boo.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), tortle.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), boo.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1);
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });
    
            it('Split tokenRouterA to tokenRouterA/ftm', async() => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: link.address, amount: "2000000000000000000", firstToken: dai.address, secondToken: wftm.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });
    
            it('Split tokenRouterA to ftm/tokenRouterA', async() => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), dai.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: link.address, amount: "2000000000000000000", firstToken: wftm.address, secondToken: dai.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });

            it('Split tokenRouterA to tokenRouterB/ftm', async() => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), boo.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: link.address, amount: "2000000000000000000", firstToken: boo.address, secondToken: wftm.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), boo.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });

            it('Split tokenRouterA to ftm/tokenRouterB', async() => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), tortle.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: link.address, amount: "2000000000000000000", firstToken: wftm.address, secondToken: tortle.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), tortle.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });
        });

        describe('Split from TokenRouterB', async() => {
            beforeEach(async () => { 
                await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), tortle.address, "2000000000000000000");
            })

            it('Split tokenRouterB to tokenRouterB/tokenRouterB', async() => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), tortle.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), boo.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: tortle.address, amount: "2000000000000000000", firstToken: tortle.address, secondToken: boo.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), tortle.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), boo.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });
    
            it('Split tokenRouterB to tokenRouterA/tokenRouterB', async() => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), link.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), boo.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: tortle.address, amount: "2000000000000000000", firstToken: link.address, secondToken: boo.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), link.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), boo.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1);
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });

            it('Split tokenRouterB to tokenRouterA/tokenRouterA', async() => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), link.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), dai.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: tortle.address, amount: "2000000000000000000", firstToken: link.address, secondToken: dai.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), link.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1);
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });
    
            it('Split tokenRouterB to tokenRouterA/ftm', async() => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: tortle.address, amount: "2000000000000000000", firstToken: dai.address, secondToken: wftm.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });
    
            it('Split tokenRouterB to ftm/tokenRouterA', async() => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), dai.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: tortle.address, amount: "2000000000000000000", firstToken: wftm.address, secondToken: dai.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });

            it('Split tokenRouterB to tokenRouterB/ftm', async() => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), boo.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: tortle.address, amount: "2000000000000000000", firstToken: boo.address, secondToken: wftm.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), boo.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });

            it('Split tokenRouterB to ftm/tokenRouterB', async() => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), tortle.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: tortle.address, amount: "2000000000000000000", firstToken: wftm.address, secondToken: tortle.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), tortle.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });
        })
    
        describe('Split from FTM', async() => {
            beforeEach(async () => { 
                await nodes.connect(deployer).addFundsForFTM(otherUser.getAddress(), { value: "200000000000000000" });
            })
    
            it('Split ftm to tokenRouterA/tokenRouterA', async () => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), link.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: wftm.address, amount: "200000000000000000", firstToken: dai.address, secondToken: link.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), link.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });

            it('Split ftm to tokenRouterB/tokenRouterB', async () => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), tortle.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), boo.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: wftm.address, amount: "200000000000000000", firstToken: tortle.address, secondToken: boo.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), tortle.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), boo.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });

            it('Split ftm to tokenRouterA/tokenRouterB', async () => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), tortle.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: wftm.address, amount: "200000000000000000", firstToken: dai.address, secondToken: tortle.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), tortle.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });

            it('Split ftm to ftm/tokenRouterA', async () => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), link.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: wftm.address, amount: "200000000000000000", firstToken: wftm.address, secondToken: link.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), link.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });

            it('Split ftm to ftm/tokenRouterB', async () => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), boo.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: wftm.address, amount: "200000000000000000", firstToken: wftm.address, secondToken: boo.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), boo.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });

            it('Split ftm to tokenRouterA/ftm', async () => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: wftm.address, amount: "200000000000000000", firstToken: dai.address, secondToken: wftm.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), dai.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });

            it('Split ftm to tokenRouterB/ftm', async () => {
                const balanceBeforeToken1 = await nodes.getBalance(otherUser.getAddress(), tortle.address)
                const balanceBeforeToken2 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
    
                await nodes.connect(deployer).split({user: otherUser.getAddress(), token: wftm.address, amount: "200000000000000000", firstToken: tortle.address, secondToken: wftm.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
                
                const balanceAfterToken1 = await nodes.getBalance(otherUser.getAddress(), tortle.address)
                const balanceAfterToken2 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
                assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
            });
        });
    });

    describe('Swap', async() => {
        describe('From TokenRouterA', async() => {
            it('Swap tokenRouterA/tokenRouterA', async () => {
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

            xit('Swap tokenRouterA/tokenRouterB', async () => {
                await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), link.address, "2000000000000000000");
                
                const balanceBefore = await nodes.getBalance(otherUser.getAddress(), boo.address)
    
                const result = await nodes.connect(deployer).swapTokens(otherUser.getAddress(), link.address, "2000000000000000000", boo.address, "0")
                
                let receipt = await result.wait()
                assert.equal(receipt.events[13].args.tokenInput, link.address);
                assert.equal(receipt.events[13].args.amountIn, "2000000000000000000");
                assert.equal(receipt.events[13].args.tokenOutput, boo.address);
    
                const balanceAfter = await nodes.getBalance(otherUser.getAddress(), boo.address)
                assert.notEqual(balanceBefore, balanceAfter)
            });

            xit('Swap tokenRouterA/sameTokenRouterA', async () => {
                await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), link.address, "2000000000000000000");
                
                const balanceBefore = await nodes.getBalance(otherUser.getAddress(), link.address)
    
                const result = await nodes.connect(deployer).swapTokens(otherUser.getAddress(), link.address, "2000000000000000000", link.address, "0")
                
                let receipt = await result.wait()
                assert.equal(receipt.events[0].args.tokenInput, link.address);
                assert.equal(receipt.events[0].args.amountIn, "2000000000000000000");
                assert.equal(receipt.events[0].args.tokenOutput, link.address);
    
                const balanceAfter = await nodes.getBalance(otherUser.getAddress(), link.address)
                assert.equal(balanceBefore.toString(), balanceAfter.toString())
            });

            xit('Swap tokenRouterA/ftm', async () => {
                await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), link.address, "2000000000000000000");
                
                const balanceBefore = await nodes.getBalance(otherUser.getAddress(), wftm.address)
    
                const result = await nodes.connect(deployer).swapTokens(otherUser.getAddress(), link.address, "2000000000000000000", wftm.address, "0")
                
                let receipt = await result.wait()
                assert.equal(receipt.events[7].args.tokenInput, link.address);
                assert.equal(receipt.events[7].args.amountIn, "2000000000000000000");
                assert.equal(receipt.events[7].args.tokenOutput, wftm.address);
    
                const balanceAfter = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                assert.notEqual(balanceBefore, balanceAfter)
            });
        })

        xdescribe('From TokenRouterB', async() => {
            it('Swap tokenRouterB/tokenRouterB', async () => {
                await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), tortle.address, "2000000000000000000");
                
                const balanceBefore = await nodes.getBalance(otherUser.getAddress(), boo.address)
    
                const result = await nodes.connect(deployer).swapTokens(otherUser.getAddress(), tortle.address, "2000000000000000000", boo.address, "0")
                
                let receipt = await result.wait()
                assert.equal(receipt.events[10].args.tokenInput, tortle.address);
                assert.equal(receipt.events[10].args.amountIn, "2000000000000000000");
                assert.equal(receipt.events[10].args.tokenOutput, boo.address);
    
                const balanceAfter = await nodes.getBalance(otherUser.getAddress(), boo.address)
                assert.notEqual(balanceBefore, balanceAfter)
            });

            it('Swap tokenRouterB/tokenRouterA', async () => {
                await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), boo.address, "2000000000000000000");
                
                const balanceBefore = await nodes.getBalance(otherUser.getAddress(), dai.address)
    
                const result = await nodes.connect(deployer).swapTokens(otherUser.getAddress(), boo.address, "2000000000000000000", dai.address, "0")
                
                let receipt = await result.wait()
                assert.equal(receipt.events[13].args.tokenInput, boo.address);
                assert.equal(receipt.events[13].args.amountIn, "2000000000000000000");
                assert.equal(receipt.events[13].args.tokenOutput, dai.address);
    
                const balanceAfter = await nodes.getBalance(otherUser.getAddress(), dai.address)
                assert.notEqual(balanceBefore, balanceAfter)
            });

            it('Swap tokenRouterB/sameTokenRouterB', async () => {
                await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), tortle.address, "2000000000000000000");
                
                const balanceBefore = await nodes.getBalance(otherUser.getAddress(), tortle.address)
    
                const result = await nodes.connect(deployer).swapTokens(otherUser.getAddress(), tortle.address, "2000000000000000000", tortle.address, "0")
                
                let receipt = await result.wait()
                assert.equal(receipt.events[0].args.tokenInput, tortle.address);
                assert.equal(receipt.events[0].args.amountIn, "2000000000000000000");
                assert.equal(receipt.events[0].args.tokenOutput, tortle.address);
    
                const balanceAfter = await nodes.getBalance(otherUser.getAddress(), tortle.address)
                assert.equal(balanceBefore.toString(), balanceAfter.toString())
            });

            it('Swap tokenRouterB/ftm', async () => {
                await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), boo.address, "2000000000000000000");
                
                const balanceBefore = await nodes.getBalance(otherUser.getAddress(), wftm.address)
    
                const result = await nodes.connect(deployer).swapTokens(otherUser.getAddress(), boo.address, "2000000000000000000", wftm.address, "0")
                
                let receipt = await result.wait()
                assert.equal(receipt.events[8].args.tokenInput, boo.address);
                assert.equal(receipt.events[8].args.amountIn, "2000000000000000000");
                assert.equal(receipt.events[8].args.tokenOutput, wftm.address);
    
                const balanceAfter = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                assert.notEqual(balanceBefore, balanceAfter)
            });
        })

        xdescribe('From FTM', async() => {
            it('Swap ftm/tokenRouterA', async () => {
                await nodes.connect(deployer).addFundsForFTM(otherUser.getAddress(), { value: "200000000000000000" });
                
                const balanceBefore = await nodes.getBalance(otherUser.getAddress(), link.address)
                
                const result = await nodes.connect(deployer).swapTokens(otherUser.getAddress(), wftm.address, "200000000000000000", link.address, "0")
                
                let receipt = await result.wait()
                assert.equal(receipt.events[7].args.tokenInput, wftm.address);
                assert.equal(receipt.events[7].args.amountIn, "200000000000000000");
                assert.equal(receipt.events[7].args.tokenOutput, link.address);

                const balanceAfter = await nodes.getBalance(otherUser.getAddress(), link.address)
                assert.notEqual(balanceBefore, balanceAfter)
            });

            it('Swap ftm/tokenRouterB', async () => {
                await nodes.connect(deployer).addFundsForFTM(otherUser.getAddress(), { value: "200000000000000000" });
                
                const balanceBefore = await nodes.getBalance(otherUser.getAddress(), tortle.address)
                
                const result = await nodes.connect(deployer).swapTokens(otherUser.getAddress(), wftm.address, "200000000000000000", tortle.address, "0")
                
                let receipt = await result.wait()
                assert.equal(receipt.events[7].args.tokenInput, wftm.address);
                assert.equal(receipt.events[7].args.amountIn, "200000000000000000");
                assert.equal(receipt.events[7].args.tokenOutput, tortle.address);

                const balanceAfter = await nodes.getBalance(otherUser.getAddress(), tortle.address)
                assert.notEqual(balanceBefore, balanceAfter)
            });

            it('Swap ftm/ftm', async () => {
                await nodes.connect(deployer).addFundsForFTM(otherUser.getAddress(), { value: "200000000000000000" });
                
                const balanceBefore = await nodes.getBalance(otherUser.getAddress(), wftm.address)

                const result = await nodes.connect(deployer).swapTokens(otherUser.getAddress(), wftm.address, "200000000000000000", wftm.address, "0")
                
                let receipt = await result.wait()
                assert.equal(receipt.events[0].args.tokenInput, wftm.address);
                assert.equal(receipt.events[0].args.amountIn, "200000000000000000");
                assert.equal(receipt.events[0].args.tokenOutput, wftm.address);

                const balanceAfter = await nodes.getBalance(otherUser.getAddress(), wftm.address)
                assert.equal(balanceBefore.toString(), balanceAfter.toString())
            });
        })
    });

    describe('DepositOnLP', async() => {
        it('DepositOnLP', async () => {
            await nodes.connect(deployer).addFundsForFTM(otherUser.getAddress(), { value: "200000000000000000" });

            await nodes.connect(deployer).split({user: otherUser.getAddress(), token: wftm.address, amount: "200000000000000000", firstToken: link.address, secondToken: wftm.address, percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"});
            const balanceToken0 = await nodes.getBalance(otherUser.getAddress(), link.address) 
            const balanceToken1 = await nodes.getBalance(otherUser.getAddress(), wftm.address)
            console.log(pairLinkDai)
            await nodes.connect(deployer).depositOnLp(otherUser.getAddress(), pairLinkDai, link.address, wftm.address, balanceToken0.toString(), balanceToken1.toString(), "0", "0")
        });
    });

    describe('Liquidate', async() => {
        it('Liquidate token to token', async () => {
            await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), link.address, "2000000000000000000");

            const balanceBefore = await nodes.getBalance(otherUser.getAddress(), dai.address)

            await nodes.connect(deployer).liquidate(otherUser.getAddress(), [link.address], ["2000000000000000000"], dai.address, "0")
            
            const balanceAfter = await nodes.getBalance(otherUser.getAddress(), dai.address)
            assert.notEqual(balanceBefore, balanceAfter)
        });
        
        it('Liquidate token to ftm', async () => {
            await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), link.address, "2000000000000000000");
            
            const balanceBefore = await nodes.getBalance(otherUser.getAddress(), wftm.address)
            
            await nodes.liquidate(otherUser.getAddress(), [link.address], ["2000000000000000000"], wftm.address, "0")
            
            const balanceAfter = await nodes.getBalance(otherUser.getAddress(), wftm.address)
            assert.notEqual(balanceBefore, balanceAfter)
        });

        it('Liquidate ftm to token', async () => {
            await nodes.connect(deployer).addFundsForFTM(otherUser.getAddress(), { value: "200000000000000000" });
            
            const balanceBefore = await nodes.getBalance(otherUser.getAddress(), link.address)

            await nodes.connect(deployer).liquidate(otherUser.getAddress(), [wftm.address], ["200000000000000000"], link.address, "0")
        
            const balanceAfter = await nodes.getBalance(otherUser.getAddress(), link.address)
            assert.notEqual(balanceBefore, balanceAfter)
        });

        it('Liquidate tokens to token', async () => {
            await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), link.address, "2000000000000000000");
            await nodes.connect(deployer).addFundsForTokens(otherUser.getAddress(), tortle.address, "2000000000000000000");

            const balanceBefore = await nodes.getBalance(otherUser.getAddress(), dai.address)

            await nodes.connect(deployer).liquidate(otherUser.getAddress(), [link.address, tortle.address], ["2000000000000000000", "2000000000000000000"], dai.address, "0")
            
            const balanceAfter = await nodes.getBalance(otherUser.getAddress(), dai.address)
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
            assert.equal(receipt.events[1].args.tokenOutput, wftm.address);
            assert.equal(receipt.events[1].args.amountOut, "200000000000000000");
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