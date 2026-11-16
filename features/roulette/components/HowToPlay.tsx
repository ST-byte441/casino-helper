import React from 'react'
import { Text } from '../../../components/Text'
import { Bullet, InfoSheet, infoStyles as styles } from '../../../components/InfoSheet'

export const HOW_TO_PLAY_TITLE = 'How to play roulette'

/** The rules of roulette as this app plays them (engine.ts PAYOUTS). */
export function HowToPlayContent() {
  return (
    <>
      <Text style={styles.body}>
        Bet on where the ball lands. Put chips on the layout, press Spin, and every bet that covers the winning pocket
        is paid.
      </Text>

      <Text style={styles.heading}>The wheels</Text>
      <Bullet>Single zero (European): 0 to 36. House edge 2.7%.</Bullet>
      <Bullet>Double zero (American): adds 00. House edge 5.26%.</Bullet>
      <Bullet>Triple zero: adds 000 as well. House edge 7.69%.</Bullet>

      <Text style={styles.heading}>Inside bets (on the numbers)</Text>
      <Bullet><Text style={styles.strong}>Straight</Text>: one number, 35 to 1.</Bullet>
      <Bullet><Text style={styles.strong}>Split</Text>: two neighbouring numbers, 17 to 1.</Bullet>
      <Bullet>
        <Text style={styles.strong}>Street</Text>: a row of three, 11 to 1. A basket (a zero and two numbers beside it,
        on the single- and double-zero wheels) also pays 11 to 1.
      </Bullet>
      <Bullet>
        <Text style={styles.strong}>Corner</Text>: four numbers that meet, 8 to 1. On the single-zero wheel the first
        four (0, 1, 2, 3) also pays 8 to 1.
      </Bullet>
      <Bullet><Text style={styles.strong}>First five</Text>: on the double-zero wheel, 0, 00, 1, 2 and 3, 6 to 1.</Bullet>
      <Bullet><Text style={styles.strong}>Six line</Text>: two rows, six numbers, 5 to 1.</Bullet>

      <Text style={styles.heading}>Outside bets</Text>
      <Bullet><Text style={styles.strong}>Dozens and columns</Text>: twelve numbers, 2 to 1.</Bullet>
      <Bullet><Text style={styles.strong}>Red or black, odd or even, 1–18 or 19–36</Text>: 1 to 1.</Bullet>
      <Bullet>When the ball lands on a zero, every outside bet loses.</Bullet>

      <Text style={styles.heading}>Playing</Text>
      <Bullet>Drag a chip onto the layout, or tap a chip and then tap where it goes. Drag a stack off to take it down.</Bullet>
      <Bullet>Undo takes back your last chip; Clear takes everything down.</Bullet>
      <Bullet>After the spin, winning bets stay on the layout for the next spin; losing chips are taken.</Bullet>
    </>
  )
}

export function HowToPlay({ visible, onClose }: { visible: boolean; onClose(): void }) {
  return (
    <InfoSheet visible={visible} title={HOW_TO_PLAY_TITLE} testID="how-to-play" onClose={onClose}>
      <HowToPlayContent />
    </InfoSheet>
  )
}
