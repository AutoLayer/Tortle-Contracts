const { ethers } = require('hardhat')
const fs = require('fs-extra')
const farmsListJSON = require('./shortMV2Farms.json')
const { WEI } = require('../../test/utils')

const deployMV2 = async () => {
    const accounts = await ethers.getSigners()
    const deployer = accounts[0]
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
    
        const rewarder = await (await (await hre.ethers.getContractFactory('ComplexRewarder')).deploy(boo, 0, masterChefV2.address)).deployed()

        await masterChefV2.add(allocPoint, "0x2fe50aF26C3C1Deb4A149D8C2bD19Dbc1424E13a", rewarder.address, true)

        tortleVault = await (
            await _TortleVault.deploy("0x2fe50aF26C3C1Deb4A149D8C2bD19Dbc1424E13a", `${'TORTLE'}-${'DAI'} Spooky Vault`, `tt${'TORTLE'}${'DAI'}`, VaultDepositFEE, WEI(9999999))
        ).deployed()
        
        tortleFarmingStrategy = await (
            await _TortleFarmingsStrategy.deploy(
                "0x2fe50aF26C3C1Deb4A149D8C2bD19Dbc1424E13a",
                23,
                tortleVault.address,
                tortleTreasury.address,
                uniswapRouter.address,
                masterChefV2.address,
                boo,
                wftm
            )
        ).deployed()

        await tortleVault.initialize(tortleFarmingStrategy.address)

        console.log(`${'TORTLE'}-${'DAI'} --> Farm Created`)
        console.log("TortleVault Address: ", tortleVault.address)
        console.log("TortleFarmingStrategy Address: ", tortleFarmingStrategy.address)
}

deployMV2()