import { ComponentProps } from 'react'
import { Phase } from '../../../../lib/types'
import { ActionButtons } from '../ActionButtons'
import { BetControls } from '../BetControls'
import { TableSize } from '../../sizes'

type Props = {
  size: TableSize
  phase: Phase
  /** 'column' stacks the action buttons one per row (large-landscape panel). */
  direction?: 'row' | 'column'
  actions: Omit<ComponentProps<typeof ActionButtons>, 'size' | 'direction'>
  betting: Omit<ComponentProps<typeof BetControls>, 'size'>
}

/** Action buttons while playing, bet controls while betting, nothing in the other phases. */
export function Controls({ size, phase, direction = 'row', actions, betting }: Props) {
  if (phase === 'playing') return <ActionButtons {...actions} size={size} direction={direction} />
  if (phase === 'betting') return <BetControls {...betting} size={size} />
  return null
}
