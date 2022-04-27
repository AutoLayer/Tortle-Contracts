const Batch = artifacts.require("Batch");

require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('Batch', ([owner, investor]) => {
    let batch;

    before(async () => {
        // Load Contract
        batch = await Batch.at("0x64ce7b312fde8C4bAF77d6Ea8EFe869D616822f0");
    });

    describe('Correct Address', async () => {
        it('Batch has correct address', async () => {
            const address = await batch.address;
            assert.equal(address, "0x64ce7b312fde8C4bAF77d6Ea8EFe869D616822f0");
        });
    });

    describe('Execution', async () => {
        it('Basic Test', async () => {
            const result = await batch.batchFunctions(
                [
                    {
                        id: "randomnode_1649757750607",
                        functionName: "addFundsForTokens",
                        user: investor,
                        arguments: ['0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48', '1000000000000000000'],
                        hasNext: true
                    },
                    {
                        id: "randomnode_1649757752110",
                        functionName: "sendToWallet",
                        user: investor,
                        arguments: ['0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48', '0'],
                        hasNext: false
                    }
                ], {from: owner}
            );
            
            const events = await result.logs
            
            // addFunds
            assert.equal(events[0].args.id, "randomnode_1649757750607");
            assert.equal(events[0].args.tokenInput, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48");
            assert.equal(events[0].args.amount, "1000000000000000000");

            // sendToWallet
            assert.equal(events[1].args.id, "randomnode_1649757752110");
            assert.equal(events[1].args.tokenOutput, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48");
            assert.equal(events[1].args.amountOut, "1000000000000000000");
        });

        it('Swap Test', async () => {
            const result = await batch.batchFunctions(
                [
                    {
                        id: "randomnode_1649757750607",
                        functionName: "addFundsForTokens",
                        user: investor,
                        arguments: ['0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48', '1000000000000000000'],
                        hasNext: true
                    },
                    {
                        id: "randomnode_1649757750609",
                        functionName: "swapTokens",
                        user: investor,
                        arguments: ['0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48', '1000000000000000000', '0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1', '0'],
                        hasNext: true
                    },
                    {
                        id: "randomnode_1649757752110",
                        functionName: "sendToWallet",
                        user: investor,
                        arguments: ['0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1', '0'],
                        hasNext: false
                    }
                ], {from: owner}
            );
            
            const events = await result.logs
            
            // addFunds
            assert.equal(events[0].args.id, "randomnode_1649757750607");
            assert.equal(events[0].args.tokenInput, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48");
            assert.equal(events[0].args.amount, "1000000000000000000");
            
            // swapTokens
            assert.equal(events[1].args.id, "randomnode_1649757750609");
            assert.equal(events[1].args.tokenInput, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48");
            assert.equal(events[1].args.amountIn, "1000000000000000000");
            assert.equal(events[1].args.tokenOutput, "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1");
            const amountOut = events[1].args.amountOut

            // sendToWallet
            assert.equal(events[2].args.id, "randomnode_1649757752110");
            assert.equal(events[2].args.tokenOutput, "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1");
            assert.equal(events[2].args.amountOut, amountOut.toString());
        });

        it('Split Test', async () => {
            const result = await batch.batchFunctions(
                [
                    {
                        id: "randomnode_1649757750607",
                        functionName: "addFundsForTokens",
                        user: investor,
                        arguments: ['0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48', '1000000000000000000'],
                        hasNext: true
                    },
                    {
                        id: "randomnode_1649757750609",
                        functionName: "split",
                        user: investor,
                        arguments: ['0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48', '0', "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1", "0x94F72e1eD800de29C12622DfB77e62b18650cFAc", "5000", "0", "0", "y", "y"],
                        hasNext: true
                    },
                    {
                        id: "randomnode_1649757750814",
                        functionName: "sendToWallet",
                        user: investor,
                        arguments: ['0x94F72e1eD800de29C12622DfB77e62b18650cFAc', '0'],
                        hasNext: false
                    },
                    {
                        id: "randomnode_1649757752110",
                        functionName: "sendToWallet",
                        user: investor,
                        arguments: ['0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1', '0'],
                        hasNext: false
                    }
                ], {from: owner}
            );
            
            const events = await result.logs
            
            // addFunds
            assert.equal(events[0].args.id, "randomnode_1649757750607");
            assert.equal(events[0].args.tokenInput, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48");
            assert.equal(events[0].args.amount, "1000000000000000000");
            
            // split
            assert.equal(events[1].args.id, "randomnode_1649757750609");
            assert.equal(events[1].args.tokenInput, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48");
            assert.equal(events[1].args.amountIn, "1000000000000000000");
            const amountOutToken1 = events[1].args.amountOutToken1
            const amountOutToken2 = events[1].args.amountOutToken2
            
            // sendToWallet second token
            assert.equal(events[2].args.id, "randomnode_1649757750814");
            assert.equal(events[2].args.tokenOutput, "0x94F72e1eD800de29C12622DfB77e62b18650cFAc");
            assert.equal(events[2].args.amountOut, amountOutToken2.toString());

            // sendToWallet first token
            assert.equal(events[3].args.id, "randomnode_1649757752110");
            assert.equal(events[3].args.tokenOutput, "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1");
            assert.equal(events[3].args.amountOut, amountOutToken1.toString());
        });

        it('Liquidate Test', async () => {
            const result = await batch.batchFunctions(
                [
                    {
                        id: "randomnode_1649757750607",
                        functionName: "addFundsForTokens",
                        user: investor,
                        arguments: ['0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48', '1000000000000000000'],
                        hasNext: true
                    },
                    {
                        id: "randomnode_1649757752110",
                        functionName: "liquidate",
                        user: investor,
                        arguments: ['0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48', '0', '0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1'],
                        hasNext: false
                    }
                ], {from: owner}
            );
            
            const events = await result.logs
            
            // addFunds
            assert.equal(events[0].args.id, "randomnode_1649757750607");
            assert.equal(events[0].args.tokenInput, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48");
            assert.equal(events[0].args.amount, "1000000000000000000");
            
            // liquidate
            assert.equal(events[1].args.id, "randomnode_1649757752110");
            assert.equal(events[1].args.tokensInput[0], "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48");
            assert.equal(events[1].args.amountsIn[0], "1000000000000000000");
            assert.equal(events[1].args.tokenOutput, "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1");
        });
    });
});