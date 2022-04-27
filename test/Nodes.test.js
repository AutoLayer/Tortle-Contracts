const Nodes = artifacts.require("Nodes");

require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('Nodes', ([owner, investor, investor2]) => {
    let nodes;

    before(async () => {
        // Load Contract
        nodes = await Nodes.at("0x0f4EE403a4732E671053F8a23c9f52971DE17894");
    });

    describe('Correct Address', async () => {
        it('Nodes_ has correct address', async () => {
            const address = await nodes.address;
            assert.equal(address, "0x0f4EE403a4732E671053F8a23c9f52971DE17894");
        });
    });

    describe('Add funds', async () => {
        it('Add tokens', async () => {
            const balanceBefore = await nodes.getBalance(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48")

            const result = await nodes.addFundsForTokens(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", {from: owner});
            
            const events = await result.logs[0].args
            assert.equal(events.tokenInput, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48");
            assert.equal(events.amount, "2000000000000000000");

            const balanceAfter = await nodes.getBalance(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48")
            assert.notEqual(balanceBefore, balanceAfter)
        });

        it('Add fantom', async () => {
            const balanceBefore = await nodes.getBalance(investor, "0xf1277d1Ed8AD466beddF92ef448A132661956621")
            
            const result = await nodes.addFundsForFTM(investor, {from: owner, value: "200000000000000000"});
            
            const events = await result.logs[0].args
            assert.equal(events.tokenInput, "0xf1277d1Ed8AD466beddF92ef448A132661956621");
            assert.equal(events.amount, "200000000000000000");

            const balanceAfter = await nodes.getBalance(investor, "0xf1277d1Ed8AD466beddF92ef448A132661956621")
            assert.notEqual(balanceBefore, balanceAfter)
        });
    });

    describe('Split', async () => {
        it('Split token to token/token', async () => {
            await nodes.addFundsForTokens(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", {from: owner});
            
            const balanceBeforeToken1 = await nodes.getBalance(investor, "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1")
            const balanceBeforeToken2 = await nodes.getBalance(investor, "0x94F72e1eD800de29C12622DfB77e62b18650cFAc")

            await nodes.split({user: investor, token: "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", amount: "2000000000000000000", firstToken: "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1", secondToken: "0x94F72e1eD800de29C12622DfB77e62b18650cFAc", percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"}, {from: owner});
            
            const balanceAfterToken1 = await nodes.getBalance(investor, "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1")
            const balanceAfterToken2 = await nodes.getBalance(investor, "0x94F72e1eD800de29C12622DfB77e62b18650cFAc")
            assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
            assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
        });

        it('Split token to sameToken/token', async () => {
            await nodes.addFundsForTokens(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", {from: owner});
            
            const balanceBeforeToken1 = await nodes.getBalance(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48")
            const balanceBeforeToken2 = await nodes.getBalance(investor, "0x94F72e1eD800de29C12622DfB77e62b18650cFAc")

            await nodes.split({user: investor, token: "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", amount: "2000000000000000000", firstToken: "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", secondToken: "0x94F72e1eD800de29C12622DfB77e62b18650cFAc", percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"}, {from: owner});
            
            const balanceAfterToken1 = await nodes.getBalance(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48")
            const balanceAfterToken2 = await nodes.getBalance(investor, "0x94F72e1eD800de29C12622DfB77e62b18650cFAc")
            assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
            assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
        });

        it('Split token to token/ftm', async () => {
            await nodes.addFundsForTokens(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", {from: owner});
            
            const balanceBeforeToken1 = await nodes.getBalance(investor, "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1")
            const balanceBeforeToken2 = await nodes.getBalance(investor, "0xf1277d1Ed8AD466beddF92ef448A132661956621")

            await nodes.split({user: investor, token: "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", amount: "2000000000000000000", firstToken: "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1", secondToken: "0xf1277d1Ed8AD466beddF92ef448A132661956621", percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"}, {from: owner});
            
            const balanceAfterToken1 = await nodes.getBalance(investor, "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1")
            const balanceAfterToken2 = await nodes.getBalance(investor, "0xf1277d1Ed8AD466beddF92ef448A132661956621")
            assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
            assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
        });

        it('Split token to ftm/token', async () => {
            await nodes.addFundsForTokens(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", {from: owner});
            
            const balanceBeforeToken1 = await nodes.getBalance(investor, "0xf1277d1Ed8AD466beddF92ef448A132661956621")
            const balanceBeforeToken2 = await nodes.getBalance(investor, "0x94F72e1eD800de29C12622DfB77e62b18650cFAc")

            await nodes.split({user: investor, token: "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", amount: "2000000000000000000", firstToken: "0xf1277d1Ed8AD466beddF92ef448A132661956621", secondToken: "0x94F72e1eD800de29C12622DfB77e62b18650cFAc", percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"}, {from: owner});
            
            const balanceAfterToken1 = await nodes.getBalance(investor, "0xf1277d1Ed8AD466beddF92ef448A132661956621")
            const balanceAfterToken2 = await nodes.getBalance(investor, "0x94F72e1eD800de29C12622DfB77e62b18650cFAc")
            assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
            assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
        });

        it('Split ftm to token/token', async () => {
            await nodes.addFundsForFTM(investor, {from: owner, value: "200000000000000000"});
            
            const balanceBeforeToken1 = await nodes.getBalance(investor, "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1")
            const balanceBeforeToken2 = await nodes.getBalance(investor, "0x94F72e1eD800de29C12622DfB77e62b18650cFAc")

            await nodes.split({user: investor, token: "0xf1277d1Ed8AD466beddF92ef448A132661956621", amount: "200000000000000000", firstToken: "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1", secondToken: "0x94F72e1eD800de29C12622DfB77e62b18650cFAc", percentageFirstToken: "5000", amountOutMinFirst: "0", amountOutMinSecond: "0"}, {from: owner});
            
            const balanceAfterToken1 = await nodes.getBalance(investor, "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1")
            const balanceAfterToken2 = await nodes.getBalance(investor, "0x94F72e1eD800de29C12622DfB77e62b18650cFAc")
            assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
            assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
        });
    });

    describe('Swap', async () => {
        it('Swap token/token', async () => {
            await nodes.addFundsForTokens(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", {from: owner});
            
            const balanceBefore = await nodes.getBalance(investor, "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1")

            const result = await nodes.swapTokens(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1", "0", {from: owner})
            
            const events = await result.logs[0].args
            assert.equal(events.tokenInput, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48");
            assert.equal(events.amountIn, "2000000000000000000");
            assert.equal(events.tokenOutput, "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1");

            const balanceAfter = await nodes.getBalance(investor, "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1")
            assert.notEqual(balanceBefore, balanceAfter)
        });

        it('Swap ftm/token', async () => {
            await nodes.addFundsForFTM(investor, {from: owner, value: "200000000000000000"});
            
            const balanceBefore = await nodes.getBalance(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48")

            const result = await nodes.swapTokens(investor, "0xf1277d1Ed8AD466beddF92ef448A132661956621", "200000000000000000", "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "0", {from: owner})
            
            const events = await result.logs[0].args
            assert.equal(events.tokenInput, "0xf1277d1Ed8AD466beddF92ef448A132661956621");
            assert.equal(events.amountIn, "200000000000000000");
            assert.equal(events.tokenOutput, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48");

            const balanceAfter = await nodes.getBalance(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48")
            assert.notEqual(balanceBefore, balanceAfter)
        });

        it('Swap token/ftm', async () => {
            await nodes.addFundsForTokens(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", {from: owner});
            
            const balanceBefore = await nodes.getBalance(investor, "0xf1277d1Ed8AD466beddF92ef448A132661956621")

            const result = await nodes.swapTokens(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", "0xf1277d1Ed8AD466beddF92ef448A132661956621", "0", {from: owner})
            
            const events = await result.logs[0].args
            assert.equal(events.tokenInput, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48");
            assert.equal(events.amountIn, "2000000000000000000");
            assert.equal(events.tokenOutput, "0xf1277d1Ed8AD466beddF92ef448A132661956621");

            const balanceAfter = await nodes.getBalance(investor, "0xf1277d1Ed8AD466beddF92ef448A132661956621")
            assert.notEqual(balanceBefore, balanceAfter)
        });
    });

    describe('Liquidate', async () => {
        it('Liquidate token to token', async () => {
            await nodes.addFundsForTokens(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", {from: owner});

            const balanceBefore = await nodes.getBalance(investor, "0x94F72e1eD800de29C12622DfB77e62b18650cFAc")

            await nodes.liquidate(investor, ["0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48"], ["2000000000000000000"], "0x94F72e1eD800de29C12622DfB77e62b18650cFAc", {from: owner})
            
            const balanceAfter = await nodes.getBalance(investor, "0x94F72e1eD800de29C12622DfB77e62b18650cFAc")
            assert.notEqual(balanceBefore, balanceAfter)
        });
        
        it('Liquidate token to ftm', async () => {
            await nodes.addFundsForTokens(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", {from: owner});

            const balanceBefore = await nodes.getBalance(investor, "0xf1277d1Ed8AD466beddF92ef448A132661956621")

            await nodes.liquidate(investor, ["0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48"], ["2000000000000000000"], "0xf1277d1Ed8AD466beddF92ef448A132661956621", {from: owner})
            
            const balanceAfter = await nodes.getBalance(investor, "0xf1277d1Ed8AD466beddF92ef448A132661956621")
            assert.notEqual(balanceBefore, balanceAfter)
        });

        it('Liquidate ftm to token', async () => {
            await nodes.addFundsForFTM(investor, {from: owner, value: "200000000000000000"});
            
            const balanceBefore = await nodes.getBalance(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48")

            await nodes.liquidate(investor, ["0xf1277d1Ed8AD466beddF92ef448A132661956621"], ["200000000000000000"], "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", {from: owner})
        
            const balanceAfter = await nodes.getBalance(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48")
            assert.notEqual(balanceBefore, balanceAfter)
        });

        it('Liquidate tokens to token', async () => {
            await nodes.addFundsForTokens(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", {from: owner});
            await nodes.addFundsForTokens(investor, "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1", "2000000000000000000", {from: owner});

            const balanceBefore = await nodes.getBalance(investor, "0x94F72e1eD800de29C12622DfB77e62b18650cFAc")

            await nodes.liquidate(investor, ["0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1"], ["2000000000000000000", "2000000000000000000"], "0x94F72e1eD800de29C12622DfB77e62b18650cFAc", {from: owner})
            
            const balanceAfter = await nodes.getBalance(investor, "0x94F72e1eD800de29C12622DfB77e62b18650cFAc")
            assert.notEqual(balanceBefore, balanceAfter)
        });

        it('Liquidate tokens to ftm', async () => {
            await nodes.addFundsForTokens(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", {from: owner});
            await nodes.addFundsForTokens(investor, "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1", "2000000000000000000", {from: owner});

            const balanceBefore = await nodes.getBalance(investor, "0xf1277d1Ed8AD466beddF92ef448A132661956621")

            await nodes.liquidate(investor, ["0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1"], ["2000000000000000000", "2000000000000000000"], "0xf1277d1Ed8AD466beddF92ef448A132661956621", {from: owner})
            
            const balanceAfter = await nodes.getBalance(investor, "0xf1277d1Ed8AD466beddF92ef448A132661956621")
            assert.notEqual(balanceBefore, balanceAfter)
        });
    });

    describe('Send to Wallet', async () => {
        it('Send token to wallet', async () => {
            await nodes.addFundsForTokens(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", {from: owner});

            const result = await nodes.sendToWallet(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", {from: owner})
            
            const events = await result.logs[0].args
            assert.equal(events.tokenOutput, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48");
            assert.equal(events.amountOut, "2000000000000000000");
        });

        it('Send ftm to wallet', async () => {
            await nodes.addFundsForFTM(investor, {from: owner, value: "200000000000000000"});

            const result = await nodes.sendToWallet(investor, "0xf1277d1Ed8AD466beddF92ef448A132661956621", "200000000000000000", {from: owner})
            
            const events = await result.logs[0].args
            assert.equal(events.tokenOutput, "0xf1277d1Ed8AD466beddF92ef448A132661956621");
            assert.equal(events.amountOut, "200000000000000000");
        });
    });

    describe('Recover All', async () => {
        it('Recover tokens', async () => {
            await nodes.addFundsForTokens(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", {from: owner});
            await nodes.addFundsForTokens(investor, "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1", "2000000000000000000", {from: owner});

            const balanceBeforeToken1 = await nodes.getBalance(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48")
            const balanceBeforeToken2 = await nodes.getBalance(investor, "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1")

            await nodes.recoverAll(["0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1"], ["2000000000000000000", "2000000000000000000"], {from: investor})
            
            const balanceAfterToken1 = await nodes.getBalance(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48")
            const balanceAfterToken2 = await nodes.getBalance(investor, "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1")
            assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
            assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
        });

        it('Recover token and ftm', async () => {
            await nodes.addFundsForTokens(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", {from: owner});
            await nodes.addFundsForFTM(investor, {from: owner, value: "200000000000000000"});

            const balanceBeforeToken1 = await nodes.getBalance(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48")
            const balanceBeforeToken2 = await nodes.getBalance(investor, "0xf1277d1Ed8AD466beddF92ef448A132661956621")

            await nodes.recoverAll(["0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "0xf1277d1Ed8AD466beddF92ef448A132661956621"], ["2000000000000000000", "200000000000000000"], {from: investor})
            
            const balanceAfterToken1 = await nodes.getBalance(investor, "0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48")
            const balanceAfterToken2 = await nodes.getBalance(investor, "0xf1277d1Ed8AD466beddF92ef448A132661956621")
            assert.notEqual(balanceBeforeToken1, balanceAfterToken1)
            assert.notEqual(balanceBeforeToken2, balanceAfterToken2)
        });
    });
});