const { ethers } = require('hardhat')
const nodesOldABI = require('./nodesOldABI.json')
const vaultsList = require('./vaultsPRO.json')

const balanceTT = async () => {
    const userAddress = "0xEA1D4A8Be3B2C60c20180Dcdc7c5286c00a53d2E"
    const nodes = await ethers.getContractAt(nodesOldABI, "0xEDC8736B9686808964C289E03fFab8aa24c7eb56")
    const filterVaults = vaultsList.filter((vault) =>
        (vault.token0 === "WFTM" && vault.token1 === "BEETS")
        || (vault.token0 === "WFTM" && vault.token1 === "MATIC")
        || (vault.token0 === "WFTM" && vault.token1 === "AVAX")
        || (vault.token0 === "USDC" && vault.token1 === "WFTM")
        || (vault.token0 === "WFTM" && vault.token1 === "BTC")
        || (vault.token0 === "WFTM" && vault.token1 === "BNB")
    )
    for (let i = 0; i < filterVaults.length; i++) {
        const ttBalanceWei = await nodes.userTt(filterVaults[i].address, userAddress)
        console.log(`${filterVaults[i].token0} - ${filterVaults[i].token1}: ttBalanceWei: ${ttBalanceWei.toString()}  `)
    }

    // const ttEtherAmount = ethers.utils.formatEther(info.toString())
    // console.log(ttEtherAmount)
}
balanceTT()