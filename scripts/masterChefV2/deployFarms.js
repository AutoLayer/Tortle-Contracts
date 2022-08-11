const { ethers } = require('hardhat')
const fs = require('fs-extra')
const farmList = require('./mv2Farms.json')
const { WEI } = require('../../test/utils')

const deployMV2 = async () => {
    const addresses = await fs.readJSON('./addresses.json')
    const VaultDepositFEE = 10
    const allocPoint = 2000
    let tortleVault
    let tortleFarmingStrategy

    const uniswapRouter = await ethers.getContractAt('UniswapV2Router02', addresses.contracts.UniswapV2Router02)
    const masterChefV2 = await ethers.getContractAt('MasterChefV2', addresses.contracts.MasterChefV2)
    const boo = "0x1CA68a01E2A8ff61b3FD2F0f6f00178699da26E7"
    const wftm = "0xb4BF6a5695E311c49A8a5CebE7d9198c7454385a"
    const tortleTreasury = await ethers.getContractAt('TortleTreasury', addresses.contracts.TortleTreasury)
    const _TortleVault = await hre.ethers.getContractFactory('TortleVault')
    const _TortleFarmingsStrategy = await hre.ethers.getContractFactory('TortleFarmingStrategy')
    
    const farm = farmList.find(farm => farm.poolId === "23")
    const rewarder = await (await (await hre.ethers.getContractFactory('ComplexRewarder')).deploy(farm.address0, 0, masterChefV2.address)).deployed()

    await masterChefV2.add(allocPoint, farm.lp, rewarder.address, true)

    tortleVault = await (
        await _TortleVault.deploy(farm.lp, `${farm.token0}-${farm.token1} Spooky Vault`, `tt${farm.token0}${farm.token1}`, VaultDepositFEE, WEI(9999999))
    ).deployed()
    
    tortleFarmingStrategy = await (
        await _TortleFarmingsStrategy.deploy(
            farm.lp,
            farm.poolId,
            tortleVault.address,
            tortleTreasury.address,
            uniswapRouter.address,
            masterChefV2.address,
            boo,
            wftm
        )
    ).deployed()

    await tortleVault.initialize(tortleFarmingStrategy.address)

    console.log(`${farm.token0}-${farm.token1} --> Farm Created`)
    console.log("TortleVault Address: ", tortleVault.address)
    console.log("TortleFarmingStrategy Address: ", tortleFarmingStrategy.address)
}

deployMV2()