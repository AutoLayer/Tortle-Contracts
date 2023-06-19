const { ethers } = require('hardhat')
const fs = require('fs')
require('dotenv').config()
const { WEI } = require('../../test/utils')
const farmsListJSON = require('./farmsMV3.json')
const { spookyRouter, WFTM, BOO, masterChefV3Spooky } = require('../../config')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const deployVaults = async (tokensList) => {
    const uniswapRouter = spookyRouter
    const wftm = WFTM
    const masterChefV3 = await ethers.getContractAt('MasterChefV3', masterChefV3Spooky)
    const tortleTreasury = process.env.TREASURY_ADDRESS

    const _TortleVault = await hre.ethers.getContractFactory('TortleVault')

    let farmObj = {}
    let farmsList = []

    const createVault = async (farm) => {
        const complexRewarderAddress = await masterChefV3.rewarder(farm.poolId)

        let TortleVault = await (
            await _TortleVault.deploy(farm.lp, `${farm.token0}-${farm.token1} Spooky Vault`, `tt${farm.token0}${farm.token1}`, WEI(9999999))
        ).deployed()
        console.log('TortleVault Address: ', TortleVault.address)

        let rewardToken
        let TortleFarmingStrategy
        let _TortleFarmingsStrategy
        if (complexRewarderAddress !== "0x0000000000000000000000000000000000000000") {
            const complexRewarderContract = await ethers.getContractAt('ComplexRewarder', complexRewarderAddress)
            rewardToken = await complexRewarderContract.rewardToken()

            _TortleFarmingsStrategy = await hre.ethers.getContractFactory('TortleFarmingStrategyV3')
            TortleFarmingStrategy = await (
                await _TortleFarmingsStrategy.deploy(
                    farm.lp,
                    farm.poolId,
                    TortleVault.address,
                    tortleTreasury,
                    uniswapRouter,
                    masterChefV3.address,
                    complexRewarderAddress,
                    rewardToken,
                    wftm
                )
            ).deployed()
        } else {
            rewardToken = BOO

            _TortleFarmingsStrategy = await hre.ethers.getContractFactory('TortleFarmingStrategy')
            TortleFarmingStrategy = await (
                await _TortleFarmingsStrategy.deploy(
                    farm.lp,
                    farm.poolId,
                    TortleVault.address,
                    tortleTreasury,
                    uniswapRouter,
                    masterChefV3.address,
                    rewardToken,
                    wftm
                )
            ).deployed()
        }
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
    fs.writeFile(process.env.VAULTS_V3_PATH ? process.env.VAULTS_V3_PATH : '/tmp/vaultsV3.json', data, (err) => {
        if (err) throw err

        console.log('JSON data is saved.')
    })

    console.log('Final List: ', farmsList)
}

deployVaults(farmsListJSON)