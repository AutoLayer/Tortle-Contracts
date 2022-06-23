const { ethers } = require('hardhat')
const farmsListJSON = require('./vaults/listOfFarm.json')
const info= async () => {
    const masterChefV1 = await ethers.getContractAt('MasterChef', "0x2b2929E785374c651a81A63878Ab22742656DcDd")
    const masterChefV2 = await ethers.getContractAt('MasterChef', "0x18b4f774fdC7BF685daeeF66c2990b1dDd9ea6aD")
    const uniswapFactory = await ethers.getContractAt('UniswapV2Factory', "0x152eE697f2E276fA89E96742e9bB9aB1F2E61bE3")
    const poolLength = Number(await masterChefV2.poolLength())
    const pools0 = await masterChefV2.poolInfo[0]
    console.log(poolLength)
    console.log(await masterChefV2.poolInfoAmount)
    for (let i = 0; i<poolLength; i++) {
        const pools = await masterChefV2.poolInfo([i])
       farmsListJSON.forEach(async (farm)=> {
            const lpToken = await uniswapFactory.getPair(farm.address0, farm.address1) 
            if(lpToken === pools[0]) {
                console.log(`${farm.token0} - ${farm.token1} --- Index: ${i}`)
            }
        })
    }
    
}

info()