const hre = require('hardhat')
const fs = require('fs-extra')
const { ethers } = require('hardhat')

const swapTokens = async () => {
  console.log('Starting swaps')
  const accounts = await hre.ethers.getSigners()
  const deployer = accounts[0]

  const addresses = await fs.readJSON('./addresses.json')

  const uniswapRouter = await hre.ethers.getContractAt('UniswapV2Router02', addresses.contracts.UniswapV2Router02)

  const wftm = await hre.ethers.getContractAt('WrappedFtm', '0xb4BF6a5695E311c49A8a5CebE7d9198c7454385a')

  const amount = '5'
  for (const token in addresses.tokens) {
    const contract = await hre.ethers.getContractAt('WERC10', addresses.tokens[token])
    const decimals = await contract.decimals()
    const toSwap = ethers.utils.parseUnits(amount, decimals)

    for (const _token in addresses.tokens) {
      if (token === _token) continue
      for (let x = 1; x < accounts.length; x++) {
        await contract.connect(accounts[0]).transfer(accounts[x].getAddress(), toSwap, { gasLimit: 6000000 }) // account with all the tokens
        await contract.connect(accounts[x]).approve(uniswapRouter.address, '5000000000000000000000000') // comment this line after first execution
        const tx = await uniswapRouter
          .connect(accounts[x])
          .swapExactTokensForTokens(
            toSwap,
            0,
            [addresses.tokens[token], wftm.address, addresses.tokens[_token]],
            accounts[x].getAddress(),
            999999999999999,
            { gasLimit: 6000000 },
          )
        try {
          await tx.wait()
          console.log('success: ', token, _token)
        } catch (e) {
          console.log('failed: ', token, _token)
        }
      }
    }
  }
  console.log('Swaps completed')
}

swapTokens()
