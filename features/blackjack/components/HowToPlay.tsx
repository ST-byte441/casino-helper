import React from 'react'
import { Text } from '../../../components/Text'
import { Bullet, InfoSheet, infoStyles as styles } from '../../../components/InfoSheet'

export const HOW_TO_PLAY_TITLE = 'How to play blackjack'

/** The rules of blackjack as this app plays them (engine.ts resolveHand, store.ts). */
export function HowToPlayContent() {
  return (
    <>
      <Text style={styles.body}>
        Get closer to 21 than the dealer without going over. You play against the dealer only, not other players.
      </Text>

      <Text style={styles.heading}>Card values</Text>
      <Bullet>2 to 10 count their number. Jacks, queens and kings count 10.</Bullet>
      <Bullet>
        An ace counts 11, or 1 if 11 would take you over 21. A hand with an ace counted as 11 is "soft" (A-6 is soft
        17): it can't bust on the next card.
      </Bullet>

      <Text style={styles.heading}>The deal</Text>
      <Bullet>Place your bet, then press Deal. You get two cards face up; the dealer gets one up and one down.</Bullet>
      <Bullet>If the dealer has blackjack, the hand ends at once and you lose (unless you have one too: a push).</Bullet>

      <Text style={styles.heading}>Your moves</Text>
      <Bullet><Text style={styles.strong}>Hit</Text>: take another card. Go over 21 and you bust and lose.</Bullet>
      <Bullet><Text style={styles.strong}>Stand</Text>: keep your total and end your turn.</Bullet>
      <Bullet><Text style={styles.strong}>Double</Text>: on your first two cards, double your bet and take exactly one more card.</Bullet>
      <Bullet>
        <Text style={styles.strong}>Split</Text>: with two cards of the same value, split them into two hands, each
        with its own bet equal to the first.
      </Bullet>
      <Bullet>
        <Text style={styles.strong}>Surrender</Text>: where the table allows it, give up your first two cards and
        get half your bet back.
      </Bullet>

      <Text style={styles.heading}>The dealer</Text>
      <Bullet>
        After you finish, the dealer turns over the hidden card and must hit until reaching 17 or more. On soft 17
        the dealer stands or hits, as the table rules say (S17 or H17).
      </Bullet>

      <Text style={styles.heading}>Payouts</Text>
      <Bullet>Beat the dealer, or the dealer busts: you win 1 to 1.</Bullet>
      <Bullet>
        Blackjack (an ace and a ten-value card as your first two cards) pays 3 to 2, or 6 to 5 at tables set that
        way.
      </Bullet>
      <Bullet>The same total as the dealer is a push: you get your bet back.</Bullet>
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
