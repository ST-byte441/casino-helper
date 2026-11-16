import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from '../../../components/Text'
import { Bullet, InfoSheet, infoStyles as styles } from '../../../components/InfoSheet'
import { HOW_TO_PLAY_TITLE, HowToPlayContent } from './HowToPlay'

type Props = { visible: boolean; onClose(): void }

/** The suggested action's outline (ActionButtons' btnSuggested). */
const SUGGESTED = '#FFD700'

/** What blackjack's Assist shows, for players new to the game (the Assist tab of the ⓘ sheet). */
export function AssistContent() {
  return (
    <>
      <Text style={styles.body}>
        Assist shows the basic strategy play: the mathematically best move for your hand against the dealer's up
        card. No move wins every hand, but this one costs you the least over time. Turn it on with the Assist button.
      </Text>
      <View style={styles.item}>
        <View style={own.button}><Text style={own.buttonText}>Hit</Text></View>
        <Text style={styles.itemText}>
          <Text style={styles.strong}>Gold outline</Text>{'  '}on an action button: the move to make. It shows when
          it's your turn.
        </Text>
      </View>

      <Text style={styles.heading}>How it decides</Text>
      <Bullet>
        Your total, whether your hand is soft (an ace counted as 11, so A-6 is soft 17) or a pair, and the dealer's up
        card.
      </Bullet>
      <Bullet>This table's rules: whether the dealer hits soft 17, doubling after a split, and surrender.</Bullet>
      <Bullet>It only suggests moves you can make: doubling and surrender need your first two cards.</Bullet>

      <Text style={styles.heading}>A few plays to remember</Text>
      <Bullet>Always split aces and 8s. Never split 10s or 5s.</Bullet>
      <Bullet>Double 11 against anything but an ace, and 10 against 2 to 9.</Bullet>
      <Bullet>Stand on 13 to 16 against a dealer 2 to 6; hit them against 7 or higher.</Bullet>
      <Bullet>Where surrender is allowed: give up 16 against 9, 10 or an ace, and 15 against a 10.</Bullet>
    </>
  )
}

/** The ⓘ beside Assist: two tabs, How to play and What Assist shows; it opens on the Assist tab. */
export function AssistInfo({ visible, onClose }: Props) {
  return (
    <InfoSheet visible={visible} testID="assist-info" onClose={onClose} initialTab="assist" tabs={[
      { key: 'how', label: 'How to play', title: HOW_TO_PLAY_TITLE, content: <HowToPlayContent /> },
      { key: 'assist', label: 'What Assist shows', title: 'What Assist shows', content: <AssistContent /> },
    ]} />
  )
}

const own = StyleSheet.create({
  button: { borderWidth: 2, borderColor: SUGGESTED, borderRadius: 6, backgroundColor: '#2a2a3e',
    paddingHorizontal: 8, paddingVertical: 2 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
})
