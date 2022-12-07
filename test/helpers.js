const addLiquidity = async (uniswapRouter, pair, amountDesired, amountMin, to) => {
  return uniswapRouter.addLiquidity(
    pair[0],
    pair[1],
    amountDesired[0],
    amountDesired[1],
    amountMin[0],
    amountMin[1],
    to,
    999999999999999,
  )
}

const createNode = (recipeId, id, functionName, user, arguments, hasNext) => {
  return {
    recipeId,
    id,
    functionName,
    user,
    arguments,
    hasNext,
  }
}

const addLiquidityETH = async (uniswapRouter, token, amountDesired, amountETHMin, amountMin, to) => {
  return uniswapRouter.addLiquidityETH(token, amountDesired, amountETHMin, amountMin, to, 999999999999999, {
    value: '5000000000000000000',
  })
}

module.exports = {
  addLiquidity,
  beefIn,
  createNode,
  addLiquidityETH,
}
