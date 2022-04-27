const Nodes_ = artifacts.require("Nodes_");

require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('Nodes_', ([owner, investor, investor2]) => {
    let nodes_;

    before(async () => {
        // Load Contract
        nodes_ = await Nodes_.at("0x08E2cf178147e5411acEd6AF50492594891FF9c7");
    });

    describe('Correct Address', async () => {
        it('Nodes_ has correct address', async () => {
            const address = await nodes_.address;
            assert.equal(address, "0x08E2cf178147e5411acEd6AF50492594891FF9c7");
        });
    });

    describe('Swaps', async () => {
        it('Swap token/token', async () => {
            await nodes_.swapTokens("0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1", "0", {from: investor})
        });

        it('Swap ftm/token', async () => {
            await nodes_.swapTokens("0xf1277d1ed8ad466beddf92ef448a132661956621", "500000000000000000", "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1", "0", {from: investor})
        });

        it('Swap token/ftm', async () => {
            await nodes_.swapTokens("0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", "0xf1277d1ed8ad466beddf92ef448a132661956621", "0", {from: investor})
        });
    });

    describe('Splits', async () => {
        it('Split token to token/token', async () => {
            await nodes_.split("0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1", "0x94F72e1eD800de29C12622DfB77e62b18650cFAc", "5000", "0", "0", {from: investor})
        });
        
        it('Split token to token/ftm', async () => {
            await nodes_.split("0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1", "0xf1277d1ed8ad466beddf92ef448a132661956621", "5000", "0", "0", {from: investor})
        });

        it('Split token to ftm/token', async () => {
            await nodes_.split("0x56Cc705FEf0De22B9a814A2E2Ef2B77f781d6D48", "2000000000000000000", "0xf1277d1ed8ad466beddf92ef448a132661956621", "0x94F72e1eD800de29C12622DfB77e62b18650cFAc", "5000", "0", "0", {from: investor})
        });

        it('Split ftm to token/token', async () => {
            await nodes_.split("0xf1277d1ed8ad466beddf92ef448a132661956621", "2000000000000000000", "0xd7e70A8908acbB7A22A9968f5990DDbb13630fE1", "0x94F72e1eD800de29C12622DfB77e62b18650cFAc", "5000", "0", "0", {from: investor})
        });
    });
});