import os from 'node:os'
import path from 'node:path'
import { ChainSlug, NetworkSlug, getChainSlug } from '@hop-protocol/sdk'
import { config as globalConfig } from '#config/index.js'
import { mkdirp } from 'mkdirp'

// Assume that a path is a location if it contains a slash
export function getDbPathForNameOrLocation (dbNameOrLocation: string): string {
  if (dbNameOrLocation.includes('/')) {
    return dbNameOrLocation
  }

  const basePath = globalConfig.db.path.replace('~', os.homedir() + '/')
  const pathWithName = basePath + '_' + dbNameOrLocation
  const pathname = path.resolve(pathWithName)
  mkdirp.sync(pathname.replace(path.basename(pathname), ''))
  return pathname
}


// TODO: Get these from more persistent config
export const DEFAULT_START_BLOCK_NUMBER: Record<string, Partial<Record<ChainSlug, number>>> = {
  [NetworkSlug.Mainnet]: {
    [ChainSlug.Ethereum]: 19970000, // 19786200, //19447854,
    [ChainSlug.Optimism]: 120660000, // 119550000, //117499078,
    [ChainSlug.Arbitrum]: 216000000, // 207240000, //190986712,
    [ChainSlug.Base]: 15065000, // 13956000, //11903793,
    [ChainSlug.Polygon]: 57499000, // 56513000, //54729294
  },
  [NetworkSlug.Sepolia]: {
    [ChainSlug.Ethereum]: 5498073,
    [ChainSlug.Optimism]: 9397181,
    [ChainSlug.Arbitrum]: 23788247,
    [ChainSlug.Base]: 7414306
  }
}

export function getDefaultStartBlockNumber (chainId: number): number {
  const chainSlug = getChainSlug(chainId.toString())
  return (DEFAULT_START_BLOCK_NUMBER as any)[globalConfig.network][chainSlug]!
}
