const { addresses, chains } = require('./kovan')

export { addresses, chains }

export const metadata = {
  tokens: {
    DAI: {
      symbol: 'DAI',
      name: 'DAI Stablecoin',
      decimals: 18
    },
    ARB: {
      symbol: 'ARB',
      name: 'ARB Token',
      decimals: 18
    },
    sETH: {
      symbol: 'sETH',
      name: 'Synth ETH',
      decimals: 18
    },
    sBTC: {
      symbol: 'sBTC',
      name: 'Synth BTC',
      decimals: 18
    },
    USDC: {
      symbol: 'USDC',
      name: 'USDC',
      decimals: 18
    },
    WBTC: {
      symbol: 'WBTC',
      name: 'Wrapped BTC',
      decimals: 18
    }
  }
}
