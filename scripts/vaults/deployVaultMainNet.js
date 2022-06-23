const { ethers } = require('hardhat')
const { WEI } = require('../../test/utils')
const farmsListJSON = require('./farmsList.json')

const deployVaults = async (tokensList) => {
    const VaultDepositFEE = 10

    const uniswapRouter = "0xF491e7B69E4244ad4002BC14e878a34207E38c29"
    const uniswapFactory = await ethers.getContractAt('UniswapV2Factory', "0x152eE697f2E276fA89E96742e9bB9aB1F2E61bE3")
    let wftm = "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83"
    let boo = "0x841FAD6EAe12c286d1Fd18d1d525DFfA75C7EFFE"
    let masterChef = "0x2b2929E785374c651a81A63878Ab22742656DcDd"
    let tortleTreasury = "0x8844C3CB1408Ccc719ad1EA48689C8db7a590186"

    const _TortleVault = await hre.ethers.getContractFactory('TortleVault')
    const _TortleFarmingsStrategy = await hre.ethers.getContractFactory('TortleFarmingStrategy')

    let farmObj = {}
    let farmsList = []

    const createVault = async (farm) => {
        const lpToken = await uniswapFactory.getPair(farm.address0, farm.address1) // token0/token1
        
        let TortleVault = await (
            await _TortleVault.deploy(lpToken, `${farm.token0}-${farm.token1} Spooky Vault`, `tt${farm.token0}${farm.token1}`, VaultDepositFEE, WEI(9999999))
        ).deployed()
        console.log('TortleVault Address: ', TortleVault.address)

        let TortleFarmingStrategy = await (
            await _TortleFarmingsStrategy.deploy(
                lpToken,
                farm.poolId,
                TortleVault.address,
                tortleTreasury,
                uniswapRouter,
                masterChef,
                boo,
                wftm
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
        farmsList.push({...farmObj})

        console.log(farmsList)
    }

    let index = 0
    do {
        await createVault(tokensList[index])
        index++
    } while (index !== tokensList.length);

    // await createVault(tokensList[0])
    // await createVault(tokensList[1])
    console.log('Lista Final: ', farmsList)
}

deployVaults(farmsListJSON)