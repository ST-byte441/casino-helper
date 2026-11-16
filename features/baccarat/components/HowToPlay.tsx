import React from 'react'
import { Text } from '../../../components/Text'
import { Bullet, InfoSheet, infoStyles as styles } from '../../../components/InfoSheet'
import { BACCARAT_MIN_MAIN_BET } from '../../../lib/constants'

export const HOW_TO_PLAY_TITLE = 'How to play baccarat'

/** The rules of baccarat as this app plays them (engine.ts: drawing rules, calculateDeltas). */
export function HowToPlayContent() {
  return (
    <>
      <Text style={styles.body}>
        You don't play a hand. Two hands are dealt, Player and Banker, and you bet on which one ends closer to 9, or
        on a tie. All the drawing is automatic.
      </Text>

      <Text style={styles.heading}>Card values</Text>
      <Bullet>Aces count 1, 2 to 9 count their number, and 10s and face cards count 0.</Bullet>
      <Bullet>Only the last digit of a total counts: 7 + 8 = 15 counts as 5.</Bullet>

      <Text style={styles.heading}>The deal</Text>
      <Bullet>Each hand gets two cards. A total of 8 or 9 is a natural: nobody draws, and the higher hand wins.</Bullet>
      <Bullet>Otherwise Player draws a third card on 0 to 5 and stands on 6 or 7.</Bullet>
      <Bullet>Banker then draws or stands by a fixed table that depends on its total and Player's third card.</Bullet>

      <Text style={styles.heading}>Bets and payouts</Text>
      <Bullet><Text style={styles.strong}>Player</Text> pays 1 to 1.</Bullet>
      <Bullet>
        <Text style={styles.strong}>Banker</Text> pays 1 to 1 less a 5% commission, because Banker wins slightly
        more often.
      </Bullet>
      <Bullet><Text style={styles.strong}>Tie</Text>: Tie pays 8 to 1. On a tie, Player and Banker bets push (you get them back).</Bullet>
      <Bullet>
        <Text style={styles.strong}>Player Pair / Banker Pair</Text>: side bets that the hand's first two cards are a
        pair, 11 to 1.
      </Bullet>
      <Bullet>The table minimum is ${BACCARAT_MIN_MAIN_BET} on Player or Banker.</Bullet>

      <Text style={styles.heading}>Squeeze</Text>
      <Text style={styles.body}>
        With Squeeze on, you peel the cards back slowly yourself, as high-limit players do. Turn it off to have the
        cards flipped for you.
      </Text>

      <Text style={styles.heading}>Tip</Text>
      <Text style={styles.body}>
        Banker has the lowest house edge (about 1.06%), then Player (about 1.24%). Tie and the pair bets have a
        much higher edge.
      </Text>
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
