import { ImageSourcePropType } from 'react-native'
import { Card } from '../../lib/types'

/** Width / height of the card face art (691x1056 source, shipped at 393x600). */
export const CARD_FACE_ASPECT = 691 / 1056

// Static requires so Metro bundles each image.
const FACES: Record<Card['suit'], Record<Card['value'], ImageSourcePropType>> = {
  '♠': {
    'A': require('../../assets/card-faces/AS.jpg'),
    '2': require('../../assets/card-faces/2S.jpg'),
    '3': require('../../assets/card-faces/3S.jpg'),
    '4': require('../../assets/card-faces/4S.jpg'),
    '5': require('../../assets/card-faces/5S.jpg'),
    '6': require('../../assets/card-faces/6S.jpg'),
    '7': require('../../assets/card-faces/7S.jpg'),
    '8': require('../../assets/card-faces/8S.jpg'),
    '9': require('../../assets/card-faces/9S.jpg'),
    '10': require('../../assets/card-faces/10S.jpg'),
    'J': require('../../assets/card-faces/JS.jpg'),
    'Q': require('../../assets/card-faces/QS.jpg'),
    'K': require('../../assets/card-faces/KS.jpg'),
  },
  '♥': {
    'A': require('../../assets/card-faces/AH.jpg'),
    '2': require('../../assets/card-faces/2H.jpg'),
    '3': require('../../assets/card-faces/3H.jpg'),
    '4': require('../../assets/card-faces/4H.jpg'),
    '5': require('../../assets/card-faces/5H.jpg'),
    '6': require('../../assets/card-faces/6H.jpg'),
    '7': require('../../assets/card-faces/7H.jpg'),
    '8': require('../../assets/card-faces/8H.jpg'),
    '9': require('../../assets/card-faces/9H.jpg'),
    '10': require('../../assets/card-faces/10H.jpg'),
    'J': require('../../assets/card-faces/JH.jpg'),
    'Q': require('../../assets/card-faces/QH.jpg'),
    'K': require('../../assets/card-faces/KH.jpg'),
  },
  '♦': {
    'A': require('../../assets/card-faces/AD.jpg'),
    '2': require('../../assets/card-faces/2D.jpg'),
    '3': require('../../assets/card-faces/3D.jpg'),
    '4': require('../../assets/card-faces/4D.jpg'),
    '5': require('../../assets/card-faces/5D.jpg'),
    '6': require('../../assets/card-faces/6D.jpg'),
    '7': require('../../assets/card-faces/7D.jpg'),
    '8': require('../../assets/card-faces/8D.jpg'),
    '9': require('../../assets/card-faces/9D.jpg'),
    '10': require('../../assets/card-faces/10D.jpg'),
    'J': require('../../assets/card-faces/JD.jpg'),
    'Q': require('../../assets/card-faces/QD.jpg'),
    'K': require('../../assets/card-faces/KD.jpg'),
  },
  '♣': {
    'A': require('../../assets/card-faces/AC.jpg'),
    '2': require('../../assets/card-faces/2C.jpg'),
    '3': require('../../assets/card-faces/3C.jpg'),
    '4': require('../../assets/card-faces/4C.jpg'),
    '5': require('../../assets/card-faces/5C.jpg'),
    '6': require('../../assets/card-faces/6C.jpg'),
    '7': require('../../assets/card-faces/7C.jpg'),
    '8': require('../../assets/card-faces/8C.jpg'),
    '9': require('../../assets/card-faces/9C.jpg'),
    '10': require('../../assets/card-faces/10C.jpg'),
    'J': require('../../assets/card-faces/JC.jpg'),
    'Q': require('../../assets/card-faces/QC.jpg'),
    'K': require('../../assets/card-faces/KC.jpg'),
  },
}

export function cardFaceImage(card: Pick<Card, 'suit' | 'value'>): ImageSourcePropType {
  return FACES[card.suit][card.value]
}
