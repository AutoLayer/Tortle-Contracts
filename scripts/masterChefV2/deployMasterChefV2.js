const { ethers } = require('hardhat')
const fs = require('fs-extra')

const deployMV2 = async () => {
    const addresses = await fs.readJSON('./addresses.json')

    const accounts = await ethers.getSigners()
    const deployer = accounts[0]

    const masterChefV1 = await ethers.getContractAt('MasterChef', addresses.contracts.MasterChef)
    const boo = await masterChefV1.boo()

    const masterChefV2 = await (
        await (await ethers.getContractFactory('MasterChefV2')).connect(deployer).deploy(masterChefV1.address, boo, 0)
    ).deployed()

    console.log(masterChefV2.address)
}

deployMV2()