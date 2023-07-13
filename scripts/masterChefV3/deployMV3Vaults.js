const { ethers } = require('hardhat')
const fs = require('fs')
require('dotenv').config()
const { WEI } = require('../../test/utils')
const farmsListFantomJSON = require('./farmsMV3.json')
const farmsListArbitrumJSON = require('../vaults/farmListArbitrum.json')
const { spookyRouter, WFTM, BOO, masterChefV3Spooky, sushiSwapRouter, masterChefV2Sushiswap, WETH_ARB, SUSHI_ARB } = require('../../config')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const network = process.env.NETWORK

const deployVaults = async (tokensList, deployConfig, path) => {
    const masterChefV3 = await ethers.getContractAt(deployConfig.masterChefContractName, deployConfig.masterChefAddress)
    const tortleTreasury = process.env.TREASURY_ADDRESS

    const _TortleVault = await hre.ethers.getContractFactory('TortleVault')

    let farmObj = {}
    let farmsList = []

    const createVault = async (farm) => {
        const complexRewarderAddress = await masterChefV3.rewarder(farm.poolId)

        let TortleVault = await (
            await _TortleVault.deploy(farm.lp, `${farm.token0}-${farm.token1} ${deployConfig.vaultName}`, `tt${farm.token0}${farm.token1}`, WEI(9999999))
        ).deployed()
        console.log('TortleVault Address: ', TortleVault.address)

        let TortleFarmingStrategy
        let _TortleFarmingsStrategy
        if (complexRewarderAddress !== "0x0000000000000000000000000000000000000000") {
            const complexRewarderContract = await ethers.getContractAt('ComplexRewarder', complexRewarderAddress)
            const rewardToken = await complexRewarderContract.rewardToken()

            _TortleFarmingsStrategy = await hre.ethers.getContractFactory('TortleFarmingStrategyV3')
            TortleFarmingStrategy = await (
                await _TortleFarmingsStrategy.deploy(
                    farm.lp,
                    farm.poolId,
                    TortleVault.address,
                    tortleTreasury,
                    deployConfig.uniswapRouter,
                    masterChefV3.address,
                    complexRewarderAddress,
                    rewardToken,
                    deployConfig.weth
                )
            ).deployed()
        } else {
            _TortleFarmingsStrategy = await hre.ethers.getContractFactory(deployConfig.strategyContractName)
            TortleFarmingStrategy = await (
                await _TortleFarmingsStrategy.deploy(
                    farm.lp,
                    farm.poolId,
                    TortleVault.address,
                    tortleTreasury,
                    deployConfig.uniswapRouter,
                    masterChefV3.address,
                    deployConfig.rewardToken,
                    deployConfig.weth
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
    fs.writeFile(path, data, (err) => {
        if (err) throw err

        console.log('JSON data is saved.')
    })

    console.log('Final List: ', farmsList)
}

let farmsListJSON
let deployConfig
let path
switch (network) {
    case 'Fantom':
        farmsListJSON = farmsListFantomJSON
        deployConfig = {
            uniswapRouter: spookyRouter,
            weth: WFTM,
            masterChefContractName: 'MasterChefV3',
            masterChefAddress: masterChefV3Spooky,
            strategyContractName: 'TortleFarmingStrategy',
            vaultName: 'Spooky Vault',
            rewardToken: BOO
        }
        path = process.env.VAULTS_V3_PATH ? process.env.VAULTS_V3_PATH : '/tmp/vaultsV3.json'
        break

    case 'Arbitrum':
        farmsListJSON = farmsListArbitrumJSON
        deployConfig = {
            uniswapRouter: sushiSwapRouter,
            weth: WETH_ARB,
            masterChefContractName: 'MiniChefV2',
            masterChefAddress: masterChefV2Sushiswap,
            strategyContractName: 'TortleFarmingSushiStrategy',
            vaultName: 'Sushi Vault',
            rewardToken: SUSHI_ARB
        }
        path = process.env.VAULTS_SUSHI_PATH ? process.env.VAULTS_SUSHI_PATH : '/tmp/vaultsSushi.json'
        break

    default:
        break
}

deployVaults(farmsListJSON, deployConfig, path)