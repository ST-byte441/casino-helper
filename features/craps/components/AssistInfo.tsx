import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from '../../../components/Text'
import { Bullet, InfoSheet, infoStyles as styles } from '../../../components/InfoSheet'
import { BetQuality } from '../../../lib/types'
import { PAYOUT_RING, QUALITY_COLORS } from './table/CrapsFelt'

type Props = {
  visible: boolean
  /** Which view's markings to explain: the drawn table's rings and stack menu, or the list's rows. */
  view: 'table' | 'list'
  onClose(): void
}

/** The bet quality tiers, as `getBetQuality` (strategy.ts) rates them. */
const QUALITY: Array<{ q: BetQuality; name: string; what: string }> = [
  { q: 'optimal', name: 'Best', what: 'Pass, Come, Don\'t Pass or Don\'t Come with full odds behind it. Odds pay true odds: no house edge.' },
  { q: 'acceptable', name: 'Fine', what: 'Line bets without full odds, Place 6 and 8, Buy and Lay.' },
  { q: 'poor', name: 'Poor', what: 'Place 4, 5, 9 and 10, the Field, Big 6 and Big 8.' },
  { q: 'avoid', name: 'Avoid', what: 'Proposition bets (Any 7, Any Craps, Horn, hops…), Hardways, and crapless Place 2, 3, 11 and 12.' },
]

function Swatch({ color, ring }: { color: string; ring?: boolean }) {
  return <View style={[own.swatch, ring ? { borderColor: color, borderWidth: 3 } : { backgroundColor: color }]} />
}

/** The pop-up behind the ⓘ beside Assist: what Assist's colours and helpers mean, for players new to craps. */
export function AssistInfo({ visible, view, onClose }: Props) {
  return (
    <InfoSheet visible={visible} title="What Assist shows" testID="assist-info" onClose={onClose}>
      <Text style={styles.body}>
        Assist points out the smarter bets and helps you size bets so they pay in full. Turn it on with the
        Assist button.
      </Text>

      <Text style={styles.heading}>Bet quality</Text>
      <Text style={styles.body}>
        {view === 'table' ? 'The border of each area on the felt' : 'The left edge of each row'} is coloured by
        how good the bet is for you (its house edge):
      </Text>
      {QUALITY.map(({ q, name, what }) => (
        <View key={q} style={styles.item}>
          <Swatch color={QUALITY_COLORS[q]} />
          <Text style={styles.itemText}><Text style={styles.strong}>{name}</Text>{'  '}{what}</Text>
        </View>
      ))}

      <Text style={styles.heading}>Paying exactly</Text>
      <Text style={styles.body}>
        Casinos pay to the dollar and round down. A Place 6 pays 7 to 6, so $15 on the 6 wins $17, not $17.50,
        while $18 wins exactly $21. These amounts pay in full:
      </Text>
      <Bullet>Place 6 and 8 in $6s; Place 4, 5, 9 and 10 in $5s.</Bullet>
      <Bullet>Odds on 6 or 8 in $5s, on 5 or 9 in $2s, on 4 or 10 any amount.</Bullet>
      <Bullet>Lay odds on 4 or 10 in $2s, on 5 or 9 in $3s, on 6 or 8 in $6s.</Bullet>

      {view === 'table' ? (
        <>
          <View style={styles.item}>
            <Swatch color={PAYOUT_RING.exact} ring />
            <Text style={styles.itemText}><Text style={styles.strong}>Green ring</Text>{'  '}round a Place bet or odds: it pays exactly.</Text>
          </View>
          <View style={styles.item}>
            <Swatch color={PAYOUT_RING.inexact} ring />
            <Text style={styles.itemText}><Text style={styles.strong}>Amber ring</Text>{'  '}the win will be rounded down. The line at the top suggests amounts that pay exactly.</Text>
          </View>
          <Bullet>Tap a stack: "Make it $18" fixes the amount in one tap.</Bullet>
          <Bullet>In the odds buttons, green ones land on an amount that pays exactly; "Max exact" takes the most odds that do.</Bullet>
        </>
      ) : (
        <>
          <Bullet>A Place row with a green left edge pays exactly. Place 6 and 8 add in $6s.</Bullet>
          <Bullet>An odds row turns gold when the odds pay exactly.</Bullet>
        </>
      )}
    </InfoSheet>
  )
}

const own = StyleSheet.create({
  swatch: { width: 16, height: 16, borderRadius: 8, marginTop: 1 },
})
