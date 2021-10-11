import ContractBase from './ContractBase'
import { BigNumber } from 'ethers'
import { TokenIndex } from 'src/constants'

export default class L2Amm extends ContractBase {
  async calculateToHTokensAmount (amountIn: BigNumber):Promise<BigNumber> {
    const hTokenAmount = await this.contract.calculateSwap(
      TokenIndex.CanonicalToken,
      TokenIndex.HopBridgeToken,
      amountIn
    )
    return hTokenAmount
  }

  async calculateFromHTokensAmount (amountIn: BigNumber):Promise<BigNumber> {
    const amountOut = await this.contract.calculateSwap(
      TokenIndex.HopBridgeToken,
      TokenIndex.CanonicalToken,
      amountIn
    )
    return amountOut
  }

  async swap (fromTokenIndex: number, toTokenIndex: number, amountIn: BigNumber, minAmountOut: BigNumber = BigNumber.from(0), deadline: number = this.defaultDeadline()):Promise<BigNumber> {
    return this.contract.swap(
      fromTokenIndex,
      toTokenIndex,
      amountIn,
      minAmountOut,
      deadline
    )
  }

  defaultDeadline () {
    return Math.floor((Date.now() / 1000) + 300)
  }
}
