const { ethers } = require('hardhat')
const contractsAddresses = require('../../contractsAddresses.json')

const recoverV2 = async () => {
    const nodesContract = await ethers.getContractAt('Nodes', contractsAddresses.ProxyNodes)
    const batchContract = await ethers.getContractAt('Batch', contractsAddresses.Batch)
    let functionCall
    let tx

    for(let index = 0; index < recoverData.length; index++) {
        const user = recoverData[index].user
        const isFarm = recoverData[index].isFarm
        const tokenDesired = recoverData[index].tokenDesired
        const amountTokenDesiredMin = recoverData[index].amountTokenDesiredMin
        const amount = recoverData[index].amount

        if (isFarm) {
            const lpToken = recoverData[index].lpToken
            const tortleVault = recoverData[index].tortleVault
            const token0 = recoverData[index].token0
            const token1 = recoverData[index].token1

            const withdrawFromFarmArgs = ethers.utils.defaultAbiCoder.encode(
                ['address', 'address', 'address[]', 'uint256', 'uint256'],
                [lpToken, tortleVault, [token0, token1, tokenDesired], amountTokenDesiredMin, amount]
            )
            const sendToWalletArgs = ethers.utils.defaultAbiCoder.encode(
                ['address[]', 'uint256', 'uint256', 'uint256', 'uint8', 'tuple(bytes32[], uint256[], uint256[], uint256[])'], 
                [[tokenDesired], '0', '0', amount, '0', []]
            )
            functionCall = [
                {
                    recipeId: "1",
                    id: "1",
                    functionName: "withdrawFromFarm((string,string,string,address,bytes,bool))",
                    user: user,
                    arguments: withdrawFromFarmArgs,
                    hasNext: true
                },
                {
                    recipeId: "2",
                    id: "2",
                    functionName: "sendToWallet((string,string,string,address,bytes,bool))",
                    user: user,
                    arguments: sendToWalletArgs,
                    hasNext: false
                }
            ]

            tx = batchContract.batchFunctions(functionCall)
            await tx.wait(3)
        } else {
            const sendToWalletArgs = ethers.utils.defaultAbiCoder.encode(
                ['address[]', 'uint256', 'uint256', 'uint256', 'uint8', 'tuple(bytes32[], uint256[], uint256[], uint256[])'], 
                [[tokenDesired], amount, '0', amount, '0', []]
            )
            functionCall = [{
                recipeId: "1",
                id: "1",
                functionName: "sendToWallet((string,string,string,address,bytes,bool))",
                user: user,
                arguments: sendToWalletArgs,
                hasNext: false
            }]

            tx = batchContract.batchFunctions(functionCall)
            await tx.wait(3)
        }
    }

    console.log('Successful')
}

recoverV2()