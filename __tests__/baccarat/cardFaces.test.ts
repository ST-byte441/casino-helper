import { cardFaceImage, CARD_FACE_ASPECT } from '../../features/baccarat/cardFaces'
import { SUITS, VALUES } from '../../lib/constants'

test('every one of the 52 cards has a face image', () => {
  for (const suit of SUITS) {
    for (const value of VALUES) {
      expect(cardFaceImage({ suit, value })).toBeDefined()
    }
  }
})

test('face aspect matches the 691x1056 source art', () => {
  expect(CARD_FACE_ASPECT).toBeCloseTo(691 / 1056, 3)
})
