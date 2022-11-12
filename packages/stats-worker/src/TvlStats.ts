import getBlockNumberFromDate from './utils/getBlockNumberFromDate'
import { BigNumber, providers, Contract, constants } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import { DateTime } from 'luxon'
import Db from './Db'
import { timestampPerBlockPerChain } from './constants'
import {
  ethereumRpc,
  gnosisRpc,
  gnosisArchiveRpc,
  polygonRpc,
  optimismRpc,
  arbitrumRpc
} from './config'
import { mainnet as mainnetAddresses } from '@hop-protocol/core/addresses'
import { erc20Abi } from '@hop-protocol/core/abi'

const allProviders: any = {
  ethereum: new providers.StaticJsonRpcProvider(ethereumRpc),
  gnosis: new providers.StaticJsonRpcProvider(gnosisRpc),
  polygon: new providers.StaticJsonRpcProvider(polygonRpc),
  optimism: new providers.StaticJsonRpcProvider(optimismRpc),
  arbitrum: new providers.StaticJsonRpcProvider(arbitrumRpc)
}

const allArchiveProviders: any = {
  gnosis: gnosisArchiveRpc
    ? new providers.StaticJsonRpcProvider(gnosisArchiveRpc)
    : undefined
}

function nearestDate (dates: any[], target: any) {
  if (!target) {
    target = Date.now()
  } else if (target instanceof Date) {
    target = target.getTime()
  }

  var nearest = Infinity
  var winner = -1

  dates.forEach(function (date, index) {
    if (date instanceof Date) date = date.getTime()
    var distance = Math.abs(date - target)
    if (distance < nearest) {
      nearest = distance
      winner = index
    }
  })

  return winner
}

const tokenDecimals: any = {
  USDC: 6,
  USDT: 6,
  DAI: 18,
  MATIC: 18,
  ETH: 18,
  HOP: 18
}

function sumAmounts (items: any) {
  let sum = BigNumber.from(0)
  for (let item of items) {
    const amount = BigNumber.from(item.amount)
    sum = sum.add(amount)
  }
  return sum
}

type Options = {
  regenesis?: boolean
  days?: number
}

class TvlStats {
  db = new Db()
  regenesis: boolean = false
  days: number = 365
  blockTags: Record<string, Record<number, number>> = {}

  constructor (options: Options = {}) {
    if (options.regenesis) {
      this.regenesis = options.regenesis
    }
    if (options.days) {
      this.days = options.days
    }

    this.blockTags = timestampPerBlockPerChain

    process.once('uncaughtException', async err => {
      console.error('uncaughtException:', err)
      this.cleanUp()
      process.exit(0)
    })

    process.once('SIGINT', () => {
      this.cleanUp()
    })
  }

  cleanUp () {
    // console.log('closing db')
    // this.db.close()
  }

  async getPriceHistory (coinId: string, days: number) {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`
    return fetch(url)
      .then(res => res.json())
      .then(json =>
        json.prices.map((data: any[]) => {
          data[0] = Math.floor(data[0] / 1000)
          return data
        })
      )
  }

  async trackTvl () {
    const daysN = this.days
    console.log('fetching prices')

    const prices: any = {
      USDC: await this.getPriceHistory('usd-coin', daysN),
      USDT: await this.getPriceHistory('tether', daysN),
      DAI: await this.getPriceHistory('dai', daysN),
      ETH: await this.getPriceHistory('ethereum', daysN),
      MATIC: await this.getPriceHistory('matic-network', daysN),
      WBTC: await this.getPriceHistory('wrapped-bitcoin', daysN),
      HOP: await this.getPriceHistory('hop-protocol', daysN),
    }
    console.log('done fetching prices')

    console.log('upserting prices')
    for (let token in prices) {
      for (let data of prices[token]) {
        const price = data[1]
        const timestamp = data[0]
        try {
          this.db.upsertPrice(token, price, timestamp)
        } catch (err) {
          if (!err.message.includes('UNIQUE constraint failed')) {
            throw err
          }
        }
      }
    }
    console.log('done upserting prices')

    let tokens = ['USDC', 'USDT', 'DAI', 'MATIC', 'ETH', 'HOP']
    let chains = ['polygon', 'gnosis', 'arbitrum', 'optimism', 'ethereum']
    if (this.regenesis) {
      chains = ['optimism']
    }
    const now = DateTime.utc()

    // Get block tags per day and store them in memory
    for (const chain of chains) {
      if (!this.blockTags[chain]) this.blockTags[chain] = {}
      console.log(`getting block tags for chain ${chain}`)
      for (let day = 0; day < daysN; day++) {
        const endDate = day === 0 ? now : now.minus({ days: day }).endOf('day')
        const endTimestamp = Math.floor(endDate.toSeconds())
        if (this.blockTags?.[chain]?.[endTimestamp]) continue

        const blockTag = await getBlockNumberFromDate(chain, endTimestamp)
        console.log(`${chain} ${endTimestamp} ${blockTag} ${day}`)
        this.blockTags[chain][endTimestamp] = blockTag
      }

    }

    const promises: Promise<any>[] = []
    for (let token of tokens) {
      promises.push(
        new Promise(async (resolve, reject) => {
          await Promise.all(
            chains.map(async (chain: string) => {
              try {
                const provider = allProviders[chain]
                const archiveProvider = allArchiveProviders[chain] || provider
                if (
                  token === 'MATIC' &&
                  ['optimism', 'arbitrum'].includes(chain)
                ) {
                  return
                }

                const config = (mainnetAddresses as any).bridges[token][chain]
                const tokenAddress =
                  config.l2CanonicalToken ?? config.l1CanonicalToken
                const spender = config.l2SaddleSwap ?? config.l1Bridge
                const tokenContract = new Contract(
                  tokenAddress,
                  erc20Abi,
                  archiveProvider
                )

                for (let day = 0; day < daysN; day++) {
                  const endDate = day === 0 ? now : now.minus({ days: day }).endOf('day')
                  const startDate = endDate.startOf('day')
                  const endTimestamp = Math.floor(endDate.toSeconds())
                  const startTimestamp = Math.floor(startDate.toSeconds())

                  console.log(
                    `fetching daily tvl stats, chain: ${chain}, token: ${token}, day: ${day}`
                  )

                  const blockTag = this.blockTags[chain][endTimestamp]
                  let balance: any
                  try {
                    if (
                      tokenAddress === constants.AddressZero &&
                      chain === 'ethereum'
                    ) {
                      balance = await archiveProvider.getBalance(
                        spender,
                        blockTag
                      )
                    } else {
                      balance = await tokenContract.balanceOf(spender, {
                        blockTag
                      })
                    }
                  } catch (err) {
                    console.error(`${chain} ${token} ${err.message}`)
                    throw err
                  }

                  console.log('balance', balance, blockTag)
                  const decimals = tokenDecimals[token]
                  const formattedAmount = Number(
                    formatUnits(balance.toString(), decimals)
                  )

                  const dates = prices[token].reverse().map((x: any) => x[0])
                  const nearest = nearestDate(dates, endDate)
                  const price = prices[token][nearest][1]

                  const usdAmount = price * formattedAmount
                  try {
                    this.db.upsertTvlPoolStat(
                      chain,
                      token,
                      formattedAmount,
                      usdAmount,
                      startTimestamp
                    )
                    console.log('upserted')
                  } catch (err) {
                    if (!err.message.includes('UNIQUE constraint failed')) {
                      throw err
                    }
                  }
                  console.log(`done fetching daily tvl stats, chain: ${chain}`)
                }
              } catch (err) {
                reject(err)
              }
            })
          )
          resolve(null)
        })
      )
    }
  }
}

export default TvlStats
