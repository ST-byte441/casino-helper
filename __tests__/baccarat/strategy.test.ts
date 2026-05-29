import { getBaccaratBetQuality } from '../../features/baccarat/strategy'

describe('getBaccaratBetQuality', () => {
  test('banker → optimal', () => expect(getBaccaratBetQuality('banker')).toBe('optimal'))
  test('player → acceptable', () => expect(getBaccaratBetQuality('player')).toBe('acceptable'))
  test('tie → avoid', () => expect(getBaccaratBetQuality('tie')).toBe('avoid'))
  test('player-pair → avoid', () => expect(getBaccaratBetQuality('player-pair')).toBe('avoid'))
  test('banker-pair → avoid', () => expect(getBaccaratBetQuality('banker-pair')).toBe('avoid'))
})
