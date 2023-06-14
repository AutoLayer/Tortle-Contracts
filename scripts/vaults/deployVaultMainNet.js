const { ethers } = require('hardhat')
const fs = require('fs')
require('dotenv').config()
const { WEI } = require('../../test/utils')
const farmsListJSON = require('./farmListFantom.json')
const { spookyRouter, spookyFactory, WFTM, BOO, masterChefV2Spooky } = require('../../config')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const deployVaults = async (tokensList) => {
    const uniswapFactory = await ethers.getContractAt('UniswapV2Factory', spookyFactory)
    let tortleTreasury = process.env.TREASURY_ADDRESS

    const _TortleVault = await hre.ethers.getContractFactory('TortleVault')
    const _TortleFarmingsStrategy = await hre.ethers.getContractFactory('TortleFarmingStrategy')

    let farmObj = {}
    let farmsList = []

    const createVault = async (farm) => {
        const lpToken = await uniswapFactory.getPair(farm.address0, farm.address1) // token0/token1
        let TortleVault = await (
            await _TortleVault.deploy(lpToken, `${farm.token0}-${farm.token1} Spooky Vault`, `tt${farm.token0}${farm.token1}`, WEI(9999999).toString())
        ).deployed()
        console.log('TortleVault Address: ', TortleVault.address)

        let TortleFarmingStrategy = await (
            await _TortleFarmingsStrategy.deploy(
                lpToken,
                farm.poolId,
                TortleVault.address,
                tortleTreasury,
                spookyRouter,
                masterChefV2Spooky,
                BOO,
                WFTM
            )
        ).deployed()
        console.log('TortleFarmingStrategy Address: ', TortleFarmingStrategy.address)

        const tx = await TortleVault.initialize(TortleFarmingStrategy.address)
        await tx.wait(6)

        farmObj.poolId = farm.poolId
        farmObj.token0 = farm.token0
        farmObj.token1 = farm.token1
        farmObj.address = TortleVault.address
        farmObj.strategy = TortleFarmingStrategy.address
        farmsList.push({ ...farmObj })
    }

    for (let index = 0; index < tokensList.length; index++) {
        let retries = 0
        do {
            try {
                await createVault(tokensList[index])
                break
            } catch (error) {
                retries++
                console.warn(error)
                await sleep(60000)
            }
        } while (retries < 5)
        if (retries >= 5) throw new Error('Too many errors.')
    }

    const data = JSON.stringify(farmsList)
    fs.writeFile(process.env.VAULTS_PATH ? process.env.VAULTS_PATH : '/tmp/vaults.json', data, (err) => {
        if (err) throw err

        console.log('JSON data is saved.')
    })

    console.log('Final List: ', farmsList)
}

deployVaults(farmsListJSON)