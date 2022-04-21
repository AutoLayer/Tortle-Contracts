const addLiquidity = async (uniswapRouter, pair, amountDesired, amountMin, to) => {
  return uniswapRouter.addLiquidity(pair[0], pair[1], amountDesired[0], amountDesired[1], amountMin[0], amountMin[1], to, 999999999999999)
}
const beefIn = async (vault, token, TortleUniV2Zap, account, amount) => {
  await token.connect(account).approve(TortleUniV2Zap.address, '5000000000000000000000000')
  return await (await TortleUniV2Zap.connect(account).beefIn(vault.address, 0, token.address, amount)).wait()
}

module.exports = {
  addLiquidity,
  beefIn,
}
