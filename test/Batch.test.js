const { assert } = require('chai')
const { ethers } = require('hardhat')
const { addLiquidityETH, createNode } = require('./helpers')

describe('Batch Contract', function () {
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
    const _params = '((string,string,address,string[],bool))'

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

        tortle = await (
        await (await hre.ethers.getContractFactory('WERC10')).deploy('Tortle', 'TRTL', 18, deployer.getAddress())
        ).deployed()
        
        uniswapFactory = await (
        await (await hre.ethers.getContractFactory('UniswapV2Factory')).deploy(deployer.getAddress())
        ).deployed()
        
        uniswapRouter = await (
        await (await hre.ethers.getContractFactory('UniswapV2Router02')).deploy(uniswapFactory.address, wftm.address)
        ).deployed()

        const liquidity = "10000000000000000000000"
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

    it('Basic Test', async () => {
        const _args1 = [link.address, "1000000000000000000"]
        const _args2 = [link.address, "0"]
        const addFundsForTokens = createNode(1, `addFundsForTokens${_params}`, otherUser.getAddress(), _args1, true)
        const sendToWallet = createNode(2, `sendToWallet${_params}`, otherUser.getAddress(), _args2, false)

        const result = await batch.connect(deployer).batchFunctions([addFundsForTokens, sendToWallet]);

        let receipt = await result.wait()
        // addFunds
        assert.equal(receipt.events[3].args.tokenInput, link.address);
        assert.equal(receipt.events[3].args.amount, "1000000000000000000");

        // sendToWallet
        assert.equal(receipt.events[6].args.tokenOutput, link.address);
        assert.equal(receipt.events[6].args.amountOut, "1000000000000000000");
    });

    describe('Swap', async() => { 
        it('Swap token/token', async () => {
            const _args1 = [link.address, "1000000000000000000"]
            const _args2 = [link.address, '1000000000000000000', dai.address, '0']
            const _args3 = [dai.address, "0"]
            const addFundsForTokens = createNode(1, `addFundsForTokens${_params}`, otherUser.getAddress(), _args1, true)
            const swapTokens = createNode(2, `swapTokens${_params}`, otherUser.getAddress(), _args2, true)
            const sendToWallet = createNode(3, `sendToWallet${_params}`, otherUser.getAddress(), _args3, false)

            const result = await batch.connect(deployer).batchFunctions([addFundsForTokens, swapTokens, sendToWallet]);
            
            let receipt = await result.wait()
            
            // addFunds
            assert.equal(receipt.events[3].args.tokenInput, link.address);
            assert.equal(receipt.events[3].args.amount, "1000000000000000000");
            
            // swapTokens
            assert.equal(receipt.events[15].args.tokenInput, link.address);
            assert.equal(receipt.events[15].args.amountIn, "1000000000000000000");
            assert.equal(receipt.events[15].args.tokenOutput, dai.address);
            const amountOut = receipt.events[15].args.amountOut

            // sendToWallet
            assert.equal(receipt.events[18].args.tokenOutput, dai.address);
            assert.equal(receipt.events[18].args.amountOut, amountOut.toString());
        });

        it('Swap token/ftm', async () => {
            const _args1 = [link.address, "1000000000000000000"]
            const _args2 = [link.address, '1000000000000000000', wftm.address, '0']
            const _args3 = [wftm.address, "0"]
            const addFundsForTokens = createNode(1, `addFundsForTokens${_params}`, otherUser.getAddress(), _args1, true)
            const swapTokens = createNode(2, `swapTokens${_params}`, otherUser.getAddress(), _args2, true)
            const sendToWallet = createNode(3, `sendToWallet${_params}`, otherUser.getAddress(), _args3, false)

            const result = await batch.connect(deployer).batchFunctions([addFundsForTokens, swapTokens, sendToWallet]);
            
            let receipt = await result.wait()
            
            // addFunds
            assert.equal(receipt.events[3].args.tokenInput, link.address);
            assert.equal(receipt.events[3].args.amount, "1000000000000000000");
            
            // swapTokens
            assert.equal(receipt.events[13].args.tokenInput, link.address);
            assert.equal(receipt.events[13].args.amountIn, "1000000000000000000");
            assert.equal(receipt.events[13].args.tokenOutput, wftm.address);
            const amountOut = receipt.events[13].args.amountOut

            // sendToWallet
            assert.equal(receipt.events[15].args.tokenOutput, wftm.address);
            assert.equal(receipt.events[15].args.amountOut, amountOut.toString());
        });

        it('Swap ftm/token', async () => {
            const _args1 = [wftm.address, '1000000000000000000', dai.address, '0']
            const _args2 = [dai.address, "0"]
            const swapTokens = createNode(1, `swapTokens${_params}`, otherUser.getAddress(), _args1, true)
            const sendToWallet = createNode(2, `sendToWallet${_params}`, otherUser.getAddress(), _args2, false)

            await nodes.connect(deployer).addFundsForFTM(otherUser.getAddress(), { value: "1000000000000000000" });
            const result = await batch.connect(deployer).batchFunctions([swapTokens, sendToWallet]);
            
            let receipt = await result.wait()
            
            // swapTokens
            assert.equal(receipt.events[6].args.tokenInput, wftm.address);
            assert.equal(receipt.events[6].args.amountIn, "1000000000000000000");
            assert.equal(receipt.events[6].args.tokenOutput, dai.address);
            const amountOut = receipt.events[6].args.amountOut

            // sendToWallet
            assert.equal(receipt.events[9].args.tokenOutput, dai.address);
            assert.equal(receipt.events[9].args.amountOut, amountOut.toString());
        });
    });
    
    describe('Split', async() => { 
        it('Split from token to token/token', async () => {
            const _args1 = [link.address, "1000000000000000000"]
            const _args2 = [
                link.address, // InputToken
                '0', //InputAmount
                tortle.address, //token0
                dai.address, //token1
                '5000', // percentage, 50%
                '0', // amountOutMinFirst
                '0', // amountOutMinSecond
                'y', // firstHasNext
                'y', // secondHasNext
            ]
            const _args3 = [dai.address, "0"]
            const _args4 = [tortle.address, "0"]
            const addFundsForTokens = createNode(1, `addFundsForTokens${_params}`, otherUser.getAddress(), _args1, true)
            const split = createNode(2, `split${_params}`, otherUser.getAddress(), _args2, true)
            const sendToWallet1 = createNode(3, `sendToWallet${_params}`, otherUser.getAddress(), _args3, false)
            const sendToWallet2 = createNode(4, `sendToWallet${_params}`, otherUser.getAddress(), _args4, false)

            const result = await batch.connect(deployer).batchFunctions([addFundsForTokens, split, sendToWallet1, sendToWallet2]);
            
            let receipt = await result.wait()
            
            // addFunds
            assert.equal(receipt.events[3].args.tokenInput, link.address);
            assert.equal(receipt.events[3].args.amount, "1000000000000000000");
            
            // split
            assert.equal(receipt.events[23].args.tokenInput, link.address);
            assert.equal(receipt.events[23].args.amountIn, "1000000000000000000");
            const amountOutToken1 = receipt.events[23].args.amountOutToken1
            const amountOutToken2 = receipt.events[23].args.amountOutToken2
            
            // sendToWallet second token
            assert.equal(receipt.events[26].args.tokenOutput, dai.address);
            assert.equal(receipt.events[26].args.amountOut, amountOutToken2.toString());

            // sendToWallet first token
            assert.equal(receipt.events[29].args.tokenOutput, tortle.address);
            assert.equal(receipt.events[29].args.amountOut, amountOutToken1.toString());
        });

        it('Split from token to sameToken/token', async () => {
            const _args1 = [link.address, "1000000000000000000"]
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
            assert.equal(receipt.events[3].args.tokenInput, link.address);
            assert.equal(receipt.events[3].args.amount, "1000000000000000000");
            
            // split
            assert.equal(receipt.events[16].args.tokenInput, link.address);
            assert.equal(receipt.events[16].args.amountIn, "1000000000000000000");
            const amountOutToken1 = receipt.events[16].args.amountOutToken1
            const amountOutToken2 = receipt.events[16].args.amountOutToken2
            
            // sendToWallet second token
            assert.equal(receipt.events[19].args.tokenOutput, dai.address);
            assert.equal(receipt.events[19].args.amountOut, amountOutToken2.toString());

            // sendToWallet first token
            assert.equal(receipt.events[22].args.tokenOutput, link.address);
            assert.equal(receipt.events[22].args.amountOut, amountOutToken1.toString());
        });

        it('Split from token to ftm/token', async () => {
            const _args1 = [link.address, "1000000000000000000"]
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
            assert.equal(receipt.events[3].args.tokenInput, link.address);
            assert.equal(receipt.events[3].args.amount, "1000000000000000000");
            
            // split
            assert.equal(receipt.events[21].args.tokenInput, link.address);
            assert.equal(receipt.events[21].args.amountIn, "1000000000000000000");
            const amountOutToken1 = receipt.events[21].args.amountOutToken1
            const amountOutToken2 = receipt.events[21].args.amountOutToken2
            
            // sendToWallet second token
            assert.equal(receipt.events[24].args.tokenOutput, dai.address);
            assert.equal(receipt.events[24].args.amountOut, amountOutToken2.toString());

            // sendToWallet first token
            assert.equal(receipt.events[26].args.tokenOutput, wftm.address);
            assert.equal(receipt.events[26].args.amountOut, amountOutToken1.toString());
        });

        it('Split from ftm to token/token', async () => {
            const _args1 = [
                wftm.address, // InputToken
                '1000000000000000000', //InputAmount
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

            await nodes.connect(deployer).addFundsForFTM(otherUser.getAddress(), { value: "1000000000000000000" });
            const result = await batch.connect(deployer).batchFunctions([split, sendToWallet1, sendToWallet2]);
            
            let receipt = await result.wait()
            
            // split
            assert.equal(receipt.events[11].args.tokenInput, wftm.address);
            assert.equal(receipt.events[11].args.amountIn, "1000000000000000000");
            const amountOutToken1 = receipt.events[11].args.amountOutToken1
            const amountOutToken2 = receipt.events[11].args.amountOutToken2
            
            // sendToWallet second token
            assert.equal(receipt.events[14].args.tokenOutput, dai.address);
            assert.equal(receipt.events[14].args.amountOut, amountOutToken2.toString());

            // sendToWallet first token
            assert.equal(receipt.events[17].args.tokenOutput, link.address);
            assert.equal(receipt.events[17].args.amountOut, amountOutToken1.toString());
        });
    });
    
    describe('Liquidate', async() => { 
        it('Liquidate from token to token', async () => {
            const _args1 = [link.address, '1000000000000000000']
            const _args2 = [link.address, '0', dai.address]
            const addFundsForTokens = createNode(1, `addFundsForTokens${_params}`, otherUser.getAddress(), _args1, true)
            const liquidate = createNode(2, `liquidate${_params}`, otherUser.getAddress(), _args2, false)

            const result = await batch.connect(deployer).batchFunctions([addFundsForTokens, liquidate]);
            
            let receipt = await result.wait()
            
            // addFunds
            assert.equal(receipt.events[3].args.tokenInput, link.address);
            assert.equal(receipt.events[3].args.amount, "1000000000000000000");
            
            // liquidate
            assert.equal(receipt.events[15].args.tokensInput[0], link.address);
            assert.equal(receipt.events[15].args.amountsIn[0], "1000000000000000000");
            assert.equal(receipt.events[15].args.tokenOutput, dai.address);
        });  
    });
    
});