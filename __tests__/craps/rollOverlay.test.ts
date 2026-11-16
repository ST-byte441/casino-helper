jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'))
jest.mock('react-native-reanimated', () => require('../../.jest/reanimatedMock'))
import { REST_MS, ROLL_ANIM_MS, TUMBLE_MS } from '../../features/craps/components/table/RollOverlay'
import { frontFace, randomSpin, tumbleOrientation } from '../../features/craps/dice3d'

describe('roll overlay timing', () => {
  test('the rolled face is front-most for the last part of every tumble (from 98.5% of it), not just at the end', () => {
    // 98.5% of the eased tumble is ~75% of TUMBLE_MS: the dice settle on the right face, then rest on it.
    for (let k = 0; k < 300; k++) {
      const v = 1 + (k % 6)
      const spin = randomSpin()
      for (let e = 0.985; e <= 1; e += 0.003) expect(frontFace(tumbleOrientation(v, e, spin))).toBe(v)
    }
  })

  test('the dice rest 1.2 s on the result before the banner', () => {
    expect(REST_MS).toBe(1200)
    expect(ROLL_ANIM_MS).toBe(TUMBLE_MS + REST_MS)
  })
})
