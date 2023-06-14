const { ethers } = require('hardhat')
const fs = require('fs')
require('dotenv').config()
const { masterChefV2Sushiswap } = require('../../config')

const masterChefV2Data = async () => {
    let farmObj = {}
    let farmsList = []

    const masterChefV2 = await ethers.getContractAt('MasterChefV2', masterChefV2Sushiswap)
    const poolsNumber = await masterChefV2.poolLength()

    for (let index=0; index < poolsNumber; index++) {
        const poolInfo = await masterChefV2.poolInfo(index)
        if (poolInfo.allocPoint.toString() === '0') continue

        const lptoken = await masterChefV2.lpToken(index)
        const uniswapV2Pair = await ethers.getContractAt('UniswapV2Pair', lptoken)
        const address0 = await uniswapV2Pair.token0()
        const address1 = await uniswapV2Pair.token1()
        const token0Contract = await ethers.getContractAt('contracts/_contracts/MasterChef.sol:ERC20', address0)
        const token1Contract = await ethers.getContractAt('contracts/_contracts/MasterChef.sol:ERC20', address1)
        const token0Name = await token0Contract.name()
        const token1Name = await token1Contract.name()

        farmObj.token0 = token0Name
        farmObj.token1 = token1Name
        farmObj.address0 = address0
        farmObj.address1 = address1
        farmObj.lp = lptoken
        farmObj.poolId = index.toString()
        farmsList.push({ ...farmObj })
    }

    const data = JSON.stringify(farmsList)
    fs.writeFile('scripts/masterChefV2/farmListV2Arbitrum.json', data, (err) => {
        if (err) throw err

        console.log('JSON data is saved.')
    })

    console.log('Final List: ', farmsList)
}

masterChefV2Data()