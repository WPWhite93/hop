import { BigNumber } from 'ethers'
import { getBumpedBN } from '#utils/getBumpedBN.js'

test('getBumpedBN', () => {
  expect(getBumpedBN(BigNumber.from('20'), 1.5).toString()).toBe(BigNumber.from('30').toString())
  expect(getBumpedBN(BigNumber.from('20'), 2.23456789).toString()).toBe(BigNumber.from('44').toString())
})
