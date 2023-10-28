import { FinalityStrategy } from '../FinalityStrategy'
import { IFinalityStrategy } from '../IFinalityStrategy'

export class ArbitrumStrategy extends FinalityStrategy implements IFinalityStrategy {
  getSyncHeadBlockNumber = async (): Promise<number> => {
    return this.getSafeBlockNumber()
  }
}
