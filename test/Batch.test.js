const { assert } = require('chai')
const { ethers } = require('hardhat')
const { addLiquidityETH, addLiquidity, createNode } = require('./helpers')

describe('Batch Contract', function () {
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
    const _params = '((string,string,string,address,string[],bool))'
    const amount = "1000000000000000000"
    const amountWithoutFees = (Number(amount) - (amount * 0.015)).toString()

    beforeEach(async () => {
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
        await usdc.connect(deployer).transfer(otherUser.getAddress(), '50000000000000000000000')
        await tortle.connect(deployer).transfer(otherUser.getAddress(), '50000000000000000000000')
        await boo.connect(deployer).transfer(otherUser.getAddress(), '50000000000000000000000')
        await link.connect(otherUser).approve(nodes.address, '50000000000000000000000')
        await dai.connect(otherUser).approve(nodes.address, '50000000000000000000000')
        await usdc.connect(otherUser).approve(nodes.address, '50000000000000000000000')
        await tortle.connect(otherUser).approve(nodes.address, '50000000000000000000000')
        await boo.connect(otherUser).approve(nodes.address, '50000000000000000000000')
    });

    it('AddFunds and SendToWallet', async () => {
        const _args1 = [link.address, amount]
        const _args2 = [link.address, "0"]
        const addFundsForTokens = createNode(100, 1, `addFundsForTokens${_params}`, otherUser.getAddress(), _args1, true)
        const sendToWallet = createNode(100, 2, `sendToWallet${_params}`, otherUser.getAddress(), _args2, false)

        /*const result =*/ await batch.connect(deployer).batchFunctions([addFundsForTokens, sendToWallet]);

        // let receipt = await result.wait()
        // // addFunds
        // assert.equal(receipt.events[17].args[1], link.address);
        // assert.equal(receipt.events[17].args[2].toString(), amountWithoutFees);

        // // sendToWallet
        // assert.equal(receipt.events[20].args[1], link.address);
        // assert.equal(receipt.events[20].args[2].toString(), amountWithoutFees);
    });

    xdescribe('Swap', async() => { 
        it('Swap token/token', async () => {
            const _args1 = [usdc.address, amount]
            const _args2 = [usdc.address, amountWithoutFees, dai.address, '0']
            const _args3 = [dai.address, "0"]
            const addFundsForTokens = createNode(1, `addFundsForTokens${_params}`, otherUser.getAddress(), _args1, true)
            const swapTokens = createNode(2, `swapTokens${_params}`, otherUser.getAddress(), _args2, true)
            const sendToWallet = createNode(3, `sendToWallet${_params}`, otherUser.getAddress(), _args3, false)

            const result = await batch.connect(deployer).batchFunctions([addFundsForTokens, swapTokens, sendToWallet]);
            
            let receipt = await result.wait()
            
            // addFunds
            assert.equal(receipt.events[6].args[1], usdc.address);
            assert.equal(receipt.events[6].args[2], amountWithoutFees);
            
            // swapTokens
            assert.equal(receipt.events[16].args[1], usdc.address);
            assert.equal(receipt.events[16].args[2], amountWithoutFees);
            assert.equal(receipt.events[16].args[3], dai.address);
            const amountOut = receipt.events[16].args[4]

            // sendToWallet
            assert.equal(receipt.events[19].args[1], dai.address);
            assert.equal(receipt.events[19].args[2], amountOut.toString());
        });

        it('Swap token/sameToken', async () => {
            const _args1 = [link.address, amount]
            const _args2 = [link.address, amountWithoutFees, link.address, '0']
            const _args3 = [link.address, "0"]
            const addFundsForTokens = createNode(1, `addFundsForTokens${_params}`, otherUser.getAddress(), _args1, true)
            const swapTokens = createNode(2, `swapTokens${_params}`, otherUser.getAddress(), _args2, true)
            const sendToWallet = createNode(3, `sendToWallet${_params}`, otherUser.getAddress(), _args3, false)

            const result = await batch.connect(deployer).batchFunctions([addFundsForTokens, swapTokens, sendToWallet]);
            
            let receipt = await result.wait()
            
            // addFunds
            assert.equal(receipt.events[17].args[1], link.address);
            assert.equal(receipt.events[17].args[2], amountWithoutFees);
            
            // swapTokens
            assert.equal(receipt.events[19].args[1], link.address);
            assert.equal(receipt.events[19].args[2], amountWithoutFees);
            assert.equal(receipt.events[19].args[3], link.address);
            const amountOut = receipt.events[19].args[4]

            // sendToWallet
            assert.equal(receipt.events[22].args[1], link.address);
            assert.equal(receipt.events[22].args[2], amountOut.toString());
        });

        it('Swap token/ftm', async () => {
            const _args1 = [link.address, amount]
            const _args2 = [link.address, amountWithoutFees, wftm.address, '0']
            const _args3 = [wftm.address, "0"]
            const addFundsForTokens = createNode(1, `addFundsForTokens${_params}`, otherUser.getAddress(), _args1, true)
            const swapTokens = createNode(2, `swapTokens${_params}`, otherUser.getAddress(), _args2, true)
            const sendToWallet = createNode(3, `sendToWallet${_params}`, otherUser.getAddress(), _args3, false)

            const result = await batch.connect(deployer).batchFunctions([addFundsForTokens, swapTokens, sendToWallet]);
            
            let receipt = await result.wait()

            // addFunds
            assert.equal(receipt.events[17].args[1], link.address);
            assert.equal(receipt.events[17].args[2], amountWithoutFees);
            
            // swapTokens
            assert.equal(receipt.events[27].args[1], link.address);
            assert.equal(receipt.events[27].args[2], amountWithoutFees);
            assert.equal(receipt.events[27].args[3], wftm.address);
            const amountOut = receipt.events[27].args[4]

            // sendToWallet
            assert.equal(receipt.events[30].args[1], wftm.address);
            assert.equal(receipt.events[30].args[2], amountOut.toString());
        });

        it('Swap ftm/token', async () => {
            const _args1 = [wftm.address, amountWithoutFees, dai.address, '0']
            const _args2 = [dai.address, "0"]
            const swapTokens = createNode(1, `swapTokens${_params}`, otherUser.getAddress(), _args1, true)
            const sendToWallet = createNode(2, `sendToWallet${_params}`, otherUser.getAddress(), _args2, false)

            await nodes.connect(deployer).addFundsForFTM(otherUser.getAddress(), { value: amount });
            const result = await batch.connect(deployer).batchFunctions([swapTokens, sendToWallet]);
            
            let receipt = await result.wait()
            
            // swapTokens
            assert.equal(receipt.events[9].args[1], wftm.address);
            assert.equal(receipt.events[9].args[2], amountWithoutFees);
            assert.equal(receipt.events[9].args[3], dai.address);
            const amountOut = receipt.events[9].args[4]

            // sendToWallet
            assert.equal(receipt.events[12].args[1], dai.address);
            assert.equal(receipt.events[12].args[2], amountOut.toString());
        });
    });
    
    xdescribe('Split', async() => { 
        it('Split from token to token/token', async () => {
            const _args1 = [link.address, amount]
            const _args2 = [
                link.address, // InputToken
                '0', //InputAmount
                dai.address, //token0
                dai.address, //token1
                '5000', // percentage, 50%
                '0', // amountOutMinFirst
                '0', // amountOutMinSecond
                'y', // firstHasNext
                'y', // secondHasNext
            ]
            const _args3 = [dai.address, "0"]
            const _args4 = [dai.address, "0"]
            const addFundsForTokens = createNode(1, `addFundsForTokens${_params}`, otherUser.getAddress(), _args1, true)
            const split = createNode(2, `split${_params}`, otherUser.getAddress(), _args2, true)
            const sendToWallet1 = createNode(3, `sendToWallet${_params}`, otherUser.getAddress(), _args3, false)
            const sendToWallet2 = createNode(4, `sendToWallet${_params}`, otherUser.getAddress(), _args4, false)

            const result = await batch.connect(deployer).batchFunctions([addFundsForTokens, split, sendToWallet1, sendToWallet2]);
            
            let receipt = await result.wait()
            
            // addFunds
            assert.equal(receipt.events[17].args[1], link.address);
            assert.equal(receipt.events[17].args[2], amountWithoutFees);
            
            // split
            assert.equal(receipt.events[41].args[1], link.address);
            assert.equal(receipt.events[41].args[2], amountWithoutFees);
            const amountOutToken1 = receipt.events[41].args[3]
            const amountOutToken2 = receipt.events[41].args[4]
            
            // sendToWallet second token
            assert.equal(receipt.events[44].args[1], dai.address);
            assert.equal(receipt.events[44].args[2], amountOutToken2.toString());

            // sendToWallet first token
            assert.equal(receipt.events[47].args[1], dai.address);
            assert.equal(receipt.events[47].args[2], amountOutToken1.toString());
        });

        it('Split from token to sameToken/token', async () => {
            const _args1 = [link.address, amount]
            const _args2 = [
                link.address, // InputToken
                '0', //InputAmount
                link.address, //token0
                dai.address, //token1
                '5000', // percentage, 50%
                '0', // amountOutMinFirst
                '0', // amountOutMinSecond
                'y', // firstHasNext
                'y', // secondHasNext
            ]
            const _args3 = [dai.address, "0"]
            const _args4 = [link.address, "0"]
            const addFundsForTokens = createNode(1, `addFundsForTokens${_params}`, otherUser.getAddress(), _args1, true)
            const split = createNode(2, `split${_params}`, otherUser.getAddress(), _args2, true)
            const sendToWallet1 = createNode(3, `sendToWallet${_params}`, otherUser.getAddress(), _args3, false)
            const sendToWallet2 = createNode(4, `sendToWallet${_params}`, otherUser.getAddress(), _args4, false)

            const result = await batch.connect(deployer).batchFunctions([addFundsForTokens, split, sendToWallet1, sendToWallet2]);
            
            let receipt = await result.wait()
            
            // addFunds
            assert.equal(receipt.events[17].args[1], link.address);
            assert.equal(receipt.events[17].args[2], amountWithoutFees);
            
            // split
            assert.equal(receipt.events[33].args[1], link.address);
            assert.equal(receipt.events[33].args[2], amountWithoutFees);
            const amountOutToken1 = receipt.events[33].args[3]
            const amountOutToken2 = receipt.events[33].args[4]
            
            // sendToWallet second token
            assert.equal(receipt.events[36].args[1], dai.address);
            assert.equal(receipt.events[36].args[2], amountOutToken2.toString());

            // sendToWallet first token
            assert.equal(receipt.events[39].args[1], link.address);
            assert.equal(receipt.events[39].args[2], amountOutToken1.toString());
        });

        it('Split from token to ftm/token', async () => {
            const _args1 = [link.address, amount]
            const _args2 = [
                link.address, // InputToken
                '0', //InputAmount
                wftm.address, //token0
                dai.address, //token1
                '5000', // percentage, 50%
                '0', // amountOutMinFirst
                '0', // amountOutMinSecond
                'y', // firstHasNext
                'y', // secondHasNext
            ]
            const _args3 = [dai.address, "0"]
            const _args4 = [wftm.address, "0"]
            const addFundsForTokens = createNode(1, `addFundsForTokens${_params}`, otherUser.getAddress(), _args1, true)
            const split = createNode(2, `split${_params}`, otherUser.getAddress(), _args2, true)
            const sendToWallet1 = createNode(3, `sendToWallet${_params}`, otherUser.getAddress(), _args3, false)
            const sendToWallet2 = createNode(4, `sendToWallet${_params}`, otherUser.getAddress(), _args4, false)

            const result = await batch.connect(deployer).batchFunctions([addFundsForTokens, split, sendToWallet1, sendToWallet2]);
            
            let receipt = await result.wait()
            
            // addFunds
            assert.equal(receipt.events[17].args[1], link.address);
            assert.equal(receipt.events[17].args[2], amountWithoutFees);
            
            // split
            assert.equal(receipt.events[38].args[1], link.address);
            assert.equal(receipt.events[38].args[2], amountWithoutFees);
            const amountOutToken1 = receipt.events[38].args[3]
            const amountOutToken2 = receipt.events[38].args[4]
            
            // sendToWallet second token
            assert.equal(receipt.events[41].args[1], dai.address);
            assert.equal(receipt.events[41].args[2], amountOutToken2.toString());

            // sendToWallet first token
            assert.equal(receipt.events[44].args[1], wftm.address);
            assert.equal(receipt.events[44].args[2], amountOutToken1.toString());
        });

        it('Split from ftm to token/token', async () => {
            const _args1 = [
                wftm.address, // InputToken
                amountWithoutFees, //InputAmount
                link.address, //token0
                dai.address, //token1
                '5000', // percentage, 50%
                '0', // amountOutMinFirst
                '0', // amountOutMinSecond
                'y', // firstHasNext
                'y', // secondHasNext
            ]
            const _args2 = [dai.address, "0"]
            const _args3 = [link.address, "0"]
            const split = createNode(1, `split${_params}`, otherUser.getAddress(), _args1, true)
            const sendToWallet1 = createNode(2, `sendToWallet${_params}`, otherUser.getAddress(), _args2, false)
            const sendToWallet2 = createNode(3, `sendToWallet${_params}`, otherUser.getAddress(), _args3, false)

            await nodes.connect(deployer).addFundsForFTM(otherUser.getAddress(), { value: amount });
            const result = await batch.connect(deployer).batchFunctions([split, sendToWallet1, sendToWallet2]);
            
            let receipt = await result.wait()
            
            // split
            assert.equal(receipt.events[17].args[1], wftm.address);
            assert.equal(receipt.events[17].args[2], amountWithoutFees);
            const amountOutToken1 = receipt.events[17].args[3]
            const amountOutToken2 = receipt.events[17].args[4]
            
            // sendToWallet second token
            assert.equal(receipt.events[20].args[1], dai.address);
            assert.equal(receipt.events[20].args[2], amountOutToken2.toString());

            // sendToWallet first token
            assert.equal(receipt.events[23].args[1], link.address);
            assert.equal(receipt.events[23].args[2], amountOutToken1.toString());
        });

        it('Split from ftm to ftm/token', async () => {
            const _args1 = [
                wftm.address, // InputToken
                amountWithoutFees, //InputAmount
                wftm.address, //token0
                dai.address, //token1
                '5000', // percentage, 50%
                '0', // amountOutMinFirst
                '0', // amountOutMinSecond
                'y', // firstHasNext
                'y', // secondHasNext
            ]
            const _args2 = [dai.address, "0"]
            const _args3 = [wftm.address, "0"]
            const split = createNode(1, `split${_params}`, otherUser.getAddress(), _args1, true)
            const sendToWallet1 = createNode(2, `sendToWallet${_params}`, otherUser.getAddress(), _args2, false)
            const sendToWallet2 = createNode(3, `sendToWallet${_params}`, otherUser.getAddress(), _args3, false)

            await nodes.connect(deployer).addFundsForFTM(otherUser.getAddress(), { value: amount });
            const result = await batch.connect(deployer).batchFunctions([split, sendToWallet1, sendToWallet2]);
            
            let receipt = await result.wait()
            
            // split
            assert.equal(receipt.events[9].args[1], wftm.address);
            assert.equal(receipt.events[9].args[2], amountWithoutFees);
            const amountOutToken1 = receipt.events[9].args[3]
            const amountOutToken2 = receipt.events[9].args[4]
            
            // sendToWallet second token
            assert.equal(receipt.events[12].args[1], dai.address);
            assert.equal(receipt.events[12].args[2], amountOutToken2.toString());

            // sendToWallet first token
            assert.equal(receipt.events[15].args[1], wftm.address);
            assert.equal(receipt.events[15].args[2], amountOutToken1.toString());
        });
    });
    
    xdescribe('Liquidate', async() => { 
        it('Liquidate from token to token', async () => {
            const _args1 = [link.address, amount]
            const _args2 = [link.address, '0', dai.address, '0']
            const addFundsForTokens = createNode(1, `addFundsForTokens${_params}`, otherUser.getAddress(), _args1, true)
            const liquidate = createNode(2, `liquidate${_params}`, otherUser.getAddress(), _args2, false)

            const result = await batch.connect(deployer).batchFunctions([addFundsForTokens, liquidate]);
            
            let receipt = await result.wait()
            
            // addFunds
            assert.equal(receipt.events[17].args[1], link.address);
            assert.equal(receipt.events[17].args[2], amountWithoutFees);
            
            // liquidate
            assert.equal(receipt.events[34].args[1][0], link.address);
            assert.equal(receipt.events[34].args[2], amountWithoutFees);
            assert.equal(receipt.events[34].args[3], dai.address);
        });
        
        it('Liquidate from token to ftm', async () => {
            const _args1 = [link.address, amount]
            const _args2 = [link.address, '0', wftm.address, '0']
            const addFundsForTokens = createNode(1, `addFundsForTokens${_params}`, otherUser.getAddress(), _args1, true)
            const liquidate = createNode(2, `liquidate${_params}`, otherUser.getAddress(), _args2, false)

            const result = await batch.connect(deployer).batchFunctions([addFundsForTokens, liquidate]);
            
            let receipt = await result.wait()
            
            // addFunds
            assert.equal(receipt.events[17].args[1], link.address);
            assert.equal(receipt.events[17].args[2], amountWithoutFees);
            
            // liquidate
            assert.equal(receipt.events[28].args[1][0], link.address);
            assert.equal(receipt.events[28].args[2], amountWithoutFees);
            assert.equal(receipt.events[28].args[3], wftm.address);
        }); 

        it('Liquidate from ftm to token', async () => {
            const _args1 = [wftm.address, amountWithoutFees, dai.address, '0']
            const liquidate = createNode(1, `liquidate${_params}`, otherUser.getAddress(), _args1, false)

            await nodes.connect(deployer).addFundsForFTM(otherUser.getAddress(), { value: amount });
            const result = await batch.connect(deployer).batchFunctions([liquidate]);
            
            let receipt = await result.wait()
            
            // liquidate
            assert.equal(receipt.events[13].args[1][0], wftm.address);
            assert.equal(receipt.events[13].args[2], amountWithoutFees);
            assert.equal(receipt.events[13].args[3], dai.address);
        }); 
    });
    
    xdescribe('Testing Recipes', async() => { 
        it('AddFunds-Split-(1->Liquidate)-(2->Liquidate)', async () => {
            const _args1 = [link.address, amount]
            const _args2 = [link.address, '0', dai.address, wftm.address, '5000', '0', '0', 'y', 'y']
            const _args3 = [wftm.address, '0', tortle.address, '0']
            const _args4 = [dai.address, '0', link.address, '0']
            const addFundsForTokens = createNode(1, `addFundsForTokens${_params}`, otherUser.getAddress(), _args1, true)
            const split = createNode(2, `split${_params}`, otherUser.getAddress(), _args2, true)
            const liquidate1 = createNode(3, `liquidate${_params}`, otherUser.getAddress(), _args3, false)
            const liquidate2 = createNode(4, `liquidate${_params}`, otherUser.getAddress(), _args4, false)

            const result = await batch.connect(deployer).batchFunctions([addFundsForTokens, split, liquidate1, liquidate2]);
            
            let receipt = await result.wait()
            
            // addFunds
            assert.equal(receipt.events[17].args[1], link.address);
            assert.equal(receipt.events[17].args[2], amountWithoutFees);

            // split
            assert.equal(receipt.events[41].args[1], link.address);
            assert.equal(receipt.events[41].args[2], amountWithoutFees);
            const amountOutToken1 = receipt.events[41].args[3]
            const amountOutToken2 = receipt.events[41].args[4]

            // liquidate1
            assert.equal(receipt.events[52].args[1][0], wftm.address);
            assert.equal(receipt.events[52].args[2], amountOutToken2.toString());
            assert.equal(receipt.events[52].args[3], tortle.address);

            // liquidate2
            assert.equal(receipt.events[69].args[1][0], dai.address);
            assert.equal(receipt.events[69].args[2], amountOutToken1.toString());
            assert.equal(receipt.events[69].args[3], link.address);
        });

        it('AddFunds-Swap-Split-(1->Swap-SendToWallet)-(2->Liquidate)', async () => {
            const _args1 = [link.address, amount]
            const _args2 = [link.address, '0', dai.address, '0']
            const _args3 = [dai.address, '0', tortle.address, wftm.address, '5000', '0', '0', 'y', 'y']
            const _args4 = [wftm.address, amountWithoutFees, link.address, '0']
            const _args5 = [link.address, "0"]
            const _args6 = [tortle.address, '0', dai.address, '0']
            const addFundsForTokens = createNode(1, `addFundsForTokens${_params}`, otherUser.getAddress(), _args1, true)
            const swapTokens1 = createNode(2, `swapTokens${_params}`, otherUser.getAddress(), _args2, true)
            const split = createNode(3, `split${_params}`, otherUser.getAddress(), _args3, true)
            const swapTokens2 = createNode(4, `swapTokens${_params}`, otherUser.getAddress(), _args4, true)
            const sendToWallet = createNode(5, `sendToWallet${_params}`, otherUser.getAddress(), _args5, false)
            const liquidate = createNode(6, `liquidate${_params}`, otherUser.getAddress(), _args6, false)

            const result = await batch.connect(deployer).batchFunctions([addFundsForTokens, swapTokens1, split, swapTokens2, sendToWallet, liquidate]);
            
            let receipt = await result.wait()

            // addFunds
            assert.equal(receipt.events[17].args[1], link.address);
            assert.equal(receipt.events[17].args[2], amountWithoutFees);
            
            // swapTokens1
            assert.equal(receipt.events[33].args[1], link.address);
            assert.equal(receipt.events[33].args[2], amountWithoutFees);
            assert.equal(receipt.events[33].args[3], dai.address);
            const amountOutSwap1 = receipt.events[33].args[4]

            // split
            assert.equal(receipt.events[60].args[1], dai.address);
            assert.equal(receipt.events[60].args[2], amountOutSwap1.toString());
            const amountOutToken1 = receipt.events[60].args[3]
            const amountOutToken2 = receipt.events[60].args[4]

            // swapTokens2
            assert.equal(receipt.events[70].args[1], wftm.address);
            assert.equal(receipt.events[70].args[2], amountOutToken2.toString());
            assert.equal(receipt.events[70].args[3], link.address);
            const amountOutSwap2 = receipt.events[70].args[4]

            // sendToWallet
            assert.equal(receipt.events[73].args[1], link.address);
            assert.equal(receipt.events[73].args[2], amountOutSwap2.toString());

            // liquidate
            assert.equal(receipt.events[93].args[1][0], tortle.address);
            assert.equal(receipt.events[93].args[2], amountOutToken1.toString());
            assert.equal(receipt.events[93].args[3], dai.address);
        });

        it('AddFunds-Swap-Split-(1->Swap-SendToWallet)-(2->Split-(2.1->Swap-SendToWallet)-(2.2->Liquidate))', async () => {
            const _args1 = [link.address, amount]
            const _args2 = [link.address, '0', dai.address, '0']
            const _args3 = [dai.address, '0', tortle.address, wftm.address, '5000', '0', '0', 'y', 'y']
            const _args4 = [wftm.address, amountWithoutFees, link.address, '0']
            const _args5 = [link.address, "0"]
            const _args6 = [tortle.address, '0', dai.address, link.address, '5000', '0', '0', 'y', 'y']
            const _args7 = [link.address, '0', wftm.address, '0']
            const _args8 = [wftm.address, "0"]
            const _args9 = [dai.address, '0', tortle.address, '0']
            const addFundsForTokens = createNode(1, `addFundsForTokens${_params}`, otherUser.getAddress(), _args1, true)
            const swapTokens1 = createNode(2, `swapTokens${_params}`, otherUser.getAddress(), _args2, true)
            const split1 = createNode(3, `split${_params}`, otherUser.getAddress(), _args3, true)
            const swapTokens2 = createNode(4, `swapTokens${_params}`, otherUser.getAddress(), _args4, true)
            const sendToWallet1 = createNode(5, `sendToWallet${_params}`, otherUser.getAddress(), _args5, false)
            const split2 = createNode(6, `split${_params}`, otherUser.getAddress(), _args6, true)
            const swapTokens3 = createNode(7, `swapTokens${_params}`, otherUser.getAddress(), _args7, true)
            const sendToWallet2 = createNode(8, `sendToWallet${_params}`, otherUser.getAddress(), _args8, false)
            const liquidate = createNode(9, `liquidate${_params}`, otherUser.getAddress(), _args9, false)

            const result = await batch.connect(deployer).batchFunctions([addFundsForTokens, swapTokens1, split1, swapTokens2, sendToWallet1, split2, swapTokens3, sendToWallet2, liquidate]);
            
            let receipt = await result.wait()
            
            // addFunds
            assert.equal(receipt.events[17].args[1], link.address);
            assert.equal(receipt.events[17].args[2], amountWithoutFees);
            
            // swapTokens1
            assert.equal(receipt.events[33].args[1], link.address);
            assert.equal(receipt.events[33].args[2], amountWithoutFees);
            assert.equal(receipt.events[33].args[3], dai.address);
            const amountOutSwap1 = receipt.events[33].args[4]

            // split1
            assert.equal(receipt.events[60].args[1], dai.address);
            assert.equal(receipt.events[60].args[2], amountOutSwap1.toString());
            const amountOutToken1 = receipt.events[60].args[3]
            const amountOutToken2 = receipt.events[60].args[4]

            // swapTokens2
            assert.equal(receipt.events[70].args[1], wftm.address);
            assert.equal(receipt.events[70].args[2], amountOutToken2.toString());
            assert.equal(receipt.events[70].args[3], link.address);
            const amountOutSwap2 = receipt.events[70].args[4]

            // sendToWallet1
            assert.equal(receipt.events[73].args[1], link.address);
            assert.equal(receipt.events[73].args[2], amountOutSwap2.toString());

            // split2
            assert.equal(receipt.events[106].args[1], tortle.address);
            assert.equal(receipt.events[106].args[2], amountOutToken1.toString());
            const amountOutToken1Split2 = receipt.events[106].args[3]
            const amountOutToken2Split2 = receipt.events[106].args[4]

            // swapTokens3
            assert.equal(receipt.events[116].args[1], link.address);
            assert.equal(receipt.events[116].args[2], amountOutToken2Split2.toString());
            assert.equal(receipt.events[116].args[3], wftm.address);
            const amountOutSwap3 = receipt.events[116].args[4]

            // sendToWallet2
            assert.equal(receipt.events[119].args[1], wftm.address);
            assert.equal(receipt.events[119].args[2], amountOutSwap3.toString());

            // liquidate
            assert.equal(receipt.events[136].args[1][0], dai.address);
            assert.equal(receipt.events[136].args[2], amountOutToken1Split2.toString());
            assert.equal(receipt.events[136].args[3], tortle.address);
        });

        it('AddFunds-Swap-Split-(1->Swap-SendToWallet)-(2->Split-(2.1->Swap-SendToWallet)-(2.2->Split-(3.1->Liquidate)-(3.2->Liquidate)))', async () => {
            const _args1 = [link.address, amount]
            const _args2 = [link.address, '0', dai.address, '0']
            const _args3 = [dai.address, '0', tortle.address, wftm.address, '5000', '0', '0', 'y', 'y']
            const _args4 = [wftm.address, amountWithoutFees, link.address, '0']
            const _args5 = [link.address, "0"]
            const _args6 = [tortle.address, '0', dai.address, link.address, '5000', '0', '0', 'y', 'y']
            const _args7 = [link.address, '0', wftm.address, '0']
            const _args8 = [wftm.address, "0"]
            const _args9 = [dai.address, '0', tortle.address, link.address, '5000', '0', '0', 'y', 'y']
            const _args10 = [link.address, '0', wftm.address, '0']
            const _args11 = [tortle.address, '0', wftm.address, '0']
            const addFundsForTokens = createNode(1, `addFundsForTokens${_params}`, otherUser.getAddress(), _args1, true)
            const swapTokens1 = createNode(2, `swapTokens${_params}`, otherUser.getAddress(), _args2, true)
            const split1 = createNode(3, `split${_params}`, otherUser.getAddress(), _args3, true)
            const swapTokens2 = createNode(4, `swapTokens${_params}`, otherUser.getAddress(), _args4, true)
            const sendToWallet1 = createNode(5, `sendToWallet${_params}`, otherUser.getAddress(), _args5, false)
            const split2 = createNode(6, `split${_params}`, otherUser.getAddress(), _args6, true)
            const swapTokens3 = createNode(7, `swapTokens${_params}`, otherUser.getAddress(), _args7, true)
            const sendToWallet2 = createNode(8, `sendToWallet${_params}`, otherUser.getAddress(), _args8, false)
            const split3 = createNode(6, `split${_params}`, otherUser.getAddress(), _args9, true)
            const liquidate1 = createNode(9, `liquidate${_params}`, otherUser.getAddress(), _args10, false)
            const liquidate2 = createNode(9, `liquidate${_params}`, otherUser.getAddress(), _args11, false)

            const result = await batch.connect(deployer).batchFunctions([addFundsForTokens, swapTokens1, split1, swapTokens2, sendToWallet1, split2, swapTokens3, sendToWallet2, split3, liquidate1, liquidate2]);
            
            let receipt = await result.wait()
            
            // addFunds
            assert.equal(receipt.events[17].args[1], link.address);
            assert.equal(receipt.events[17].args[2], amountWithoutFees);
            
            // swapTokens1
            assert.equal(receipt.events[30].args[1], link.address);
            assert.equal(receipt.events[30].args[2], amountWithoutFees);
            assert.equal(receipt.events[30].args[3], dai.address);
            const amountOutSwap1 = receipt.events[30].args[4]

            // split1
            assert.equal(receipt.events[54].args[1], dai.address);
            assert.equal(receipt.events[54].args[2], amountOutSwap1.toString());
            const amountOutToken1 = receipt.events[54].args[3]
            const amountOutToken2 = receipt.events[54].args[4]

            // swapTokens2
            assert.equal(receipt.events[64].args[1], wftm.address);
            assert.equal(receipt.events[64].args[2], amountOutToken2.toString());
            assert.equal(receipt.events[64].args[3], link.address);
            const amountOutSwap2 = receipt.events[64].args[4]

            // sendToWallet1
            assert.equal(receipt.events[67].args[1], link.address);
            assert.equal(receipt.events[67].args[2], amountOutSwap2.toString());

            // split2
            assert.equal(receipt.events[97].args[1], tortle.address);
            assert.equal(receipt.events[97].args[2], amountOutToken1.toString());
            const amountOutToken1Split2 = receipt.events[97].args[3]
            const amountOutToken2Split2 = receipt.events[97].args[4]

            // swapTokens3
            assert.equal(receipt.events[107].args[1], link.address);
            assert.equal(receipt.events[107].args[2], amountOutToken2Split2.toString());
            assert.equal(receipt.events[107].args[3], wftm.address);
            const amountOutSwap3 = receipt.events[107].args[4]

            // sendToWallet2
            assert.equal(receipt.events[110].args[1], wftm.address);
            assert.equal(receipt.events[110].args[2], amountOutSwap3.toString());

            // split3
            assert.equal(receipt.events[137].args[1], dai.address);
            assert.equal(receipt.events[137].args[2], amountOutToken1Split2.toString());
            const amountOutToken1Split3 = receipt.events[137].args[3]
            const amountOutToken2Split3 = receipt.events[137].args[4]

            // liquidate
            assert.equal(receipt.events[148].args[1][0], link.address);
            assert.equal(receipt.events[148].args[2], amountOutToken2Split3.toString());
            assert.equal(receipt.events[148].args[3], wftm.address);

            // liquidate
            assert.equal(receipt.events[161].args[1][0], tortle.address);
            assert.equal(receipt.events[161].args[2], amountOutToken1Split3.toString());
            assert.equal(receipt.events[161].args[3], wftm.address);
        });
    });
});