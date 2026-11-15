import React from 'react'
import { View, ScrollView, TouchableOpacity, Modal, StyleSheet } from 'react-native'
import { Text } from '../../../../components/Text'
import { BetType } from '../../../../lib/types'
import { isValidBetForVariant, suggestedBetIncrement } from '../../engine'
import { useCrapsStore } from '../../store'
import { BetRow } from '../BetRow'
import { HopBetGrid } from '../HopBetGrid'

type Props = { visible: boolean; onClose(): void }

/** The one place call the sheet uses; the store sets the notice when it refuses. */
export function placeFromSheet(type: BetType, amount: number, number?: number, hopDice?: [number, number]): boolean {
  return useCrapsStore.getState().placeBet(type, amount, number, hopDice)
}

export function MoreBetsSheet({ visible, onClose }: Props) {
  const bets = useCrapsStore(s => s.bets)
  const variant = useCrapsStore(s => s.tableRules.variant)
  const selectedChip = useCrapsStore(s => s.selectedChip)
  const notice = useCrapsStore(s => s.notice)
  const chip = selectedChip ?? 1
  const numbers = variant === 'craps' ? [4, 5, 6, 8, 9, 10] : [2, 3, 4, 5, 6, 8, 9, 10, 11, 12]
  const find = (type: BetType, n?: number) => bets.find(b => b.type === type && (n == null || b.number === n))
  const remove = (type: BetType, n?: number) => {
    const b = find(type, n)
    if (b) useCrapsStore.getState().removeBet(b.id)
  }
  const flat: [BetType, string, number][] = [['hi-lo', 'Hi-Lo (15:1)', chip], ['world', `World ($5 unit)`, chip * 5]]

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View testID="more-bets-sheet" style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>More bets (chip ${chip})</Text>
            <TouchableOpacity testID="more-bets-close" onPress={onClose} hitSlop={8}><Text style={styles.close}>Done</Text></TouchableOpacity>
          </View>
          <Text testID="more-bets-notice" style={styles.notice} numberOfLines={1}>{notice ?? ' '}</Text>
          <ScrollView>
            {isValidBetForVariant('buy', variant) && numbers.map(n => (
              <View key={n}>
                {(['buy', 'lay'] as const).filter(t => isValidBetForVariant(t, variant)).map(t => {
                  const b = find(t, n)
                  const inc = suggestedBetIncrement(t, n)
                  return (
                    <BetRow key={t} label={`${t === 'buy' ? 'Buy' : 'Lay'} ${n}`} amount={b?.amount ?? 0} increment={inc}
                      showWorking working={b?.working} onToggleWorking={b ? () => useCrapsStore.getState().toggleWorking(b.id) : undefined}
                      onAdd={() => placeFromSheet(t, inc, n)} onRemove={() => remove(t, n)} />
                  )
                })}
              </View>
            ))}
            {flat.map(([type, label, amt]) => (
              <BetRow key={type} label={label} amount={find(type)?.amount ?? 0} increment={amt}
                onAdd={() => placeFromSheet(type, amt)} onRemove={() => remove(type)} />
            ))}
            <HopBetGrid increment={chip}
              onPlace={(dice, hard, amt) => placeFromSheet(hard ? 'hop-hard' : 'hop-easy', amt, undefined, dice)} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#1e1e2e', maxHeight: '90%', borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 8 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8 },
  title: { color: '#FFD700', fontWeight: '700', fontSize: 15 },
  close: { color: '#fff', fontSize: 14 },
  notice: { color: '#aaa', fontSize: 12, paddingHorizontal: 12 },
})
