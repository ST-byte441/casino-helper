jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'))
jest.mock('react-native-reanimated', () => require('../../.jest/reanimatedMock'))
import { faceIndexAt, LAND_AT, REST_MS, ROLL_ANIM_MS, TUMBLE_MS } from '../../features/craps/components/table/RollOverlay'

describe('roll overlay timing', () => {
  test('the rolled face is up from the landing point to the end, never before', () => {
    const n = 12
    for (let p = 0; p < LAND_AT; p += 0.01) expect(faceIndexAt(p, n)).toBeLessThan(n - 1)
    for (let p = LAND_AT; p <= 1; p += 0.01) expect(faceIndexAt(p, n)).toBe(n - 1)
    expect(faceIndexAt(1, n)).toBe(n - 1)
  })

  test('the dice rest 1.2 s on the result before the banner', () => {
    expect(REST_MS).toBe(1200)
    expect(ROLL_ANIM_MS).toBe(TUMBLE_MS + REST_MS)
  })
})
