jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'))
jest.mock('react-native-reanimated', () => require('../../.jest/reanimatedMock'))
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)
jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware')
  return { ...actual, persist: (config: any) => config, createJSONStorage: () => undefined }
})
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }))
let mockWindow = { width: 384, height: 832, scale: 3, fontScale: 1 }
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockWindow,
}))
import 'react-native-gesture-handler/jestSetup'

import React from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { render as rtlRender } from '@testing-library/react-native'
import BaccaratScreen from '../../app/baccarat'
import { useBaccaratStore } from '../../features/baccarat/store'
import { Card } from '../../lib/types'

// gesture-handler 3 requires every GestureDetector to sit inside a GestureHandlerRootView.
const render: typeof rtlRender = (ui, options) => rtlRender(ui, { wrapper: GestureHandlerRootView, ...options })

const c = (value: Card['value']): Card => ({ value, suit: '♠' })
const STACKED: Card[] = [c('9'), c('3'), c('K'), c('K'), ...Array.from({ length: 10 }, () => c('K'))]

function dealWith(mode: 'squeeze' | 'flip') {
  useBaccaratStore.getState().newHand()
  useBaccaratStore.setState({ deck: [...STACKED] })
  useBaccaratStore.getState().placeBet('player', 15)
  useBaccaratStore.getState().deal(mode)
}

type Win = { width: number; height: number }
export const PHONE: Win = { width: 384, height: 832 }
const COMPACT: Win = { width: 320, height: 700 }
const LARGE_PORTRAIT: Win = { width: 673, height: 884 }
const LARGE_LANDSCAPE: Win = { width: 884, height: 673 }
function setWindow(w: Win) {
  mockWindow = { ...w, scale: 3, fontScale: 1 }
}
// Player K,K (0) and Banker K,K (0) both draw: a 5 each, so both hands end with 3 cards.
const THIRD_CARDS: Card[] = [c('K'), c('K'), c('K'), c('K'), c('5'), c('5'), ...Array.from({ length: 10 }, () => c('K'))]

function seedProfile(balance = 1000) {
  const { useProfileStore } = require('../../features/profile/store')
  const { emptyStats } = require('../../features/profile/stats')
  useProfileStore.setState({
    profiles: [{ id: 'p', name: 'T', bankrollMode: 'finite', balance, createdAt: 0,
      startingBalance: balance, trackingSince: 0, refills: [], stats: emptyStats() }],
    activeProfileId: 'p',
  })
}

function dealDeck(cards: Card[], mode: 'squeeze' | 'flip') {
  useBaccaratStore.getState().newHand()
  useBaccaratStore.setState({ deck: [...cards] })
  useBaccaratStore.getState().placeBet('player', 15)
  useBaccaratStore.getState().deal(mode)
}

function revealAll() {
  while (useBaccaratStore.getState().phase === 'revealing') useBaccaratStore.getState().revealNext()
}

beforeEach(() => {
  jest.useFakeTimers()
  setWindow(PHONE)
})
afterEach(() => jest.useRealTimers())

describe('phone layout (must not change)', () => {
  beforeEach(() => seedProfile())

  test('betting, empty', () => {
    useBaccaratStore.getState().newHand()
    expect(render(<BaccaratScreen />).toJSON()).toMatchSnapshot()
  })

  test('betting, $15 on Player', () => {
    useBaccaratStore.getState().newHand()
    useBaccaratStore.getState().placeBet('player', 15)
    expect(render(<BaccaratScreen />).toJSON()).toMatchSnapshot()
  })

  test('squeeze, first card', () => {
    dealDeck(THIRD_CARDS, 'squeeze')
    expect(render(<BaccaratScreen />).toJSON()).toMatchSnapshot()
  })

  test('flip, first card', () => {
    dealDeck(THIRD_CARDS, 'flip')
    expect(render(<BaccaratScreen />).toJSON()).toMatchSnapshot()
  })

  test('result, three cards each', () => {
    dealDeck(THIRD_CARDS, 'flip')
    revealAll()
    expect(useBaccaratStore.getState().phase).toBe('result')
    expect(render(<BaccaratScreen />).toJSON()).toMatchSnapshot()
  })

  test('compact 320×700, betting', () => {
    setWindow(COMPACT)
    useBaccaratStore.getState().newHand()
    expect(render(<BaccaratScreen />).toJSON()).toMatchSnapshot()
  })
})

test('table does not bounce while squeezing', () => {
  dealWith('squeeze')
  const { getByTestId } = render(<BaccaratScreen />)
  expect(getByTestId('baccarat-table').props.bounces).toBe(false)
})

test('table still bounces in flip mode', () => {
  dealWith('flip')
  const { getByTestId } = render(<BaccaratScreen />)
  expect(getByTestId('baccarat-table').props.bounces).toBe(true)
})

describe('header squeeze toggle', () => {
  const { usePreferencesStore } = require('../../features/preferences/store')
  const { fireEvent } = require('@testing-library/react-native')

  beforeEach(() => useBaccaratStore.getState().newHand())

  test('reads "Squeeze ●" when on and "Squeeze ○" when off', () => {
    usePreferencesStore.getState().setBaccaratRevealMode('squeeze')
    const { getByText, rerender } = render(<BaccaratScreen />)
    expect(getByText('Squeeze ●')).toBeTruthy()
    usePreferencesStore.getState().setBaccaratRevealMode('flip')
    rerender(<BaccaratScreen />)
    expect(getByText('Squeeze ○')).toBeTruthy()
  })

  test('tapping it switches between squeeze and flip', () => {
    usePreferencesStore.getState().setBaccaratRevealMode('squeeze')
    const { getByText } = render(<BaccaratScreen />)
    fireEvent.press(getByText('Squeeze ●'))
    expect(usePreferencesStore.getState().baccaratRevealMode).toBe('flip')
  })

  test('no Assist button in baccarat', () => {
    const { queryByText } = render(<BaccaratScreen />)
    expect(queryByText(/Assist/)).toBeNull()
  })
})

test('DEAL stays disabled with a hint until Player or Banker has the $15 minimum', () => {
  const { fireEvent } = require('@testing-library/react-native')
  const { useProfileStore } = require('../../features/profile/store')
  const { emptyStats } = require('../../features/profile/stats')
  useProfileStore.setState({
    profiles: [{ id: 'p', name: 'T', bankrollMode: 'finite', balance: 500, createdAt: 0,
      startingBalance: 500, trackingSince: 0, refills: [], stats: emptyStats() }],
    activeProfileId: 'p',
  })
  useBaccaratStore.getState().newHand()
  const { getByText, getByTestId, queryByText } = render(<BaccaratScreen />)
  getByText('Min $15 on Player or Banker')
  fireEvent.press(getByTestId('main-chip-25'))
  fireEvent.press(getByText('Banker'))
  expect(useBaccaratStore.getState().bets.banker).toBe(25)
  expect(queryByText('Min $15 on Player or Banker')).toBeNull()
})

test('the header title stays on one line so narrow screens shrink it instead of crowding', () => {
  useBaccaratStore.getState().newHand()
  const screen = render(<BaccaratScreen />)
  expect(screen.getByText('BACCARAT').props.numberOfLines).toBe(1)
})

const flat = (s: unknown) => require('react-native').StyleSheet.flatten(s as any)
const sizedAncestor = (node: any) => {
  let n = node.parent
  while (n && !(n.type === 'View' && flat(n.props.style)?.height)) n = n.parent
  return n
}
const cardsOfWidth = (root: any, w: number) =>
  root.findAll((n: any) => n.type === 'View' && flat(n.props.style)?.width === w && flat(n.props.style)?.backgroundColor === '#fff')

describe('large portrait', () => {
  beforeEach(() => { seedProfile(); setWindow(LARGE_PORTRAIT) })

  test('the squeeze card is 280 tall', () => {
    dealDeck(THIRD_CARDS, 'squeeze')
    const { getByTestId } = render(<BaccaratScreen />)
    expect(flat(sizedAncestor(getByTestId('card-face')).props.style).height).toBe(280)
  })

  test('hands use large text and 78-wide cards', () => {
    dealDeck(THIRD_CARDS, 'flip')
    revealAll()
    const { getByText, UNSAFE_root } = render(<BaccaratScreen />)
    expect(flat(getByText('Banker').props.style).fontSize).toBe(18)
    expect(cardsOfWidth(UNSAFE_root, 78)).toHaveLength(6)
    expect(flat(getByText('Tie 5 to 5').props.style).fontSize).toBe(30)
  })

  test('the bet area and footer sit in a centred column capped at 520', () => {
    useBaccaratStore.getState().newHand()
    const { getByTestId } = render(<BaccaratScreen />)
    const col = getByTestId('bac-controls-column')
    expect(flat(col.props.style)).toMatchObject({ maxWidth: 520, alignSelf: 'center', width: '100%' })
    const { within } = require('@testing-library/react-native')
    expect(within(col).getByText('DEAL')).toBeTruthy()
    expect(within(col).getByTestId('main-chip-15')).toBeTruthy()
    expect(flat(within(col).getByTestId('main-chip-15').props.style).width).toBe(58)
    expect(flat(within(col).getByText('DEAL').props.style).fontSize).toBe(22)
    expect(flat(within(col).getByText(/^Balance:/).props.style).fontSize).toBe(18)
  })

  test('the header text is 1.3x', () => {
    useBaccaratStore.getState().newHand()
    const { getByText } = render(<BaccaratScreen />)
    expect(flat(getByText('BACCARAT').props.style).fontSize).toBe(20)
    expect(flat(getByText('Back').props.style).fontSize).toBe(20)
  })
})

describe('large landscape', () => {
  const { within, fireEvent: fire } = require('@testing-library/react-native')
  const { ScrollView } = require('react-native')
  const { PANEL_WIDTH } = require('../../features/baccarat/components/table/landscape')
  const { HAND_COLUMN_PADDING } = require('../../features/baccarat/components/table/HandsArea')
  const { MEDIUM_CARD } = require('../../features/blackjack/components/Card')

  beforeEach(() => { seedProfile(); setWindow(LARGE_LANDSCAPE) })

  test('three medium cards fit a hand column on the Fold inner screen (884 wide)', () => {
    const handPadding = 8 // HandDisplay's card row padding on each side
    const need = 3 * (MEDIUM_CARD.width + 2 * MEDIUM_CARD.margin) + 2 * handPadding
    const column = (LARGE_LANDSCAPE.width - PANEL_WIDTH - 1) / 2 - 2 * HAND_COLUMN_PADDING
    expect(need).toBeLessThanOrEqual(column)
  })

  test('betting: the felt says Place your bets; the 340 panel holds the chips and DEAL', () => {
    useBaccaratStore.getState().newHand()
    const { getByTestId, getByText } = render(<BaccaratScreen />)
    expect(within(getByTestId('baccarat-table')).getByText('Place your bets')).toBeTruthy()
    const panel = getByTestId('bac-panel')
    expect(flat(panel.props.style)).toMatchObject({ width: 340 })
    expect(within(panel).getByTestId('main-chip-15')).toBeTruthy()
    expect(within(panel).getByText('DEAL')).toBeTruthy()
    expect(within(panel).getByText(/^Balance:/)).toBeTruthy()
    void getByText
  })

  test('result: Banker | Player side by side with three 68-wide cards each; Next Hand in the panel', () => {
    dealDeck(THIRD_CARDS, 'flip')
    revealAll()
    const { getByTestId, UNSAFE_root } = render(<BaccaratScreen />)
    const row = getByTestId('bac-hands-row')
    expect(flat(row.props.style).flexDirection).toBe('row')
    expect(within(row).getByText('Banker')).toBeTruthy()
    expect(within(row).getByText('Player')).toBeTruthy()
    expect(cardsOfWidth(UNSAFE_root, 68)).toHaveLength(6)
    expect(within(getByTestId('baccarat-table')).getByText('Tie 5 to 5')).toBeTruthy()
    expect(within(getByTestId('bac-panel')).getByText('Next Hand')).toBeTruthy()
  })

  test('squeezing: the felt does not bounce, and the squeeze card is 280 tall inside it', () => {
    dealDeck(THIRD_CARDS, 'squeeze')
    const { getByTestId } = render(<BaccaratScreen />)
    const felt = getByTestId('baccarat-table')
    expect(felt.props.bounces).toBe(false)
    expect(flat(sizedAncestor(within(felt).getByTestId('card-face')).props.style).height).toBe(280)
  })

  test('rotating mid-squeeze keeps the same card in the squeeze', () => {
    dealDeck(THIRD_CARDS, 'squeeze')
    const count = useBaccaratStore.getState().revealedCount
    setWindow(LARGE_PORTRAIT)
    const screen = render(<BaccaratScreen />)
    setWindow(LARGE_LANDSCAPE)
    screen.rerender(<BaccaratScreen />)
    expect(useBaccaratStore.getState().revealedCount).toBe(count)
    expect(screen.getByText('Drag up to squeeze')).toBeTruthy()
    expect(screen.getByTestId('bac-hands-row')).toBeTruthy()
  })

  test('unfolding the Fold mid-squeeze (phone to large landscape) keeps the same card', () => {
    dealDeck(THIRD_CARDS, 'squeeze')
    const count = useBaccaratStore.getState().revealedCount
    setWindow(PHONE)
    const screen = render(<BaccaratScreen />)
    setWindow(LARGE_LANDSCAPE)
    screen.rerender(<BaccaratScreen />)
    expect(useBaccaratStore.getState().revealedCount).toBe(count)
    expect(screen.getByText('Drag up to squeeze')).toBeTruthy()
  })

  test('below the minimum, the panel hints and DEAL is disabled; a bet enables it', () => {
    useBaccaratStore.getState().newHand()
    const { getByTestId, queryByText } = render(<BaccaratScreen />)
    const panel = getByTestId('bac-panel')
    expect(within(panel).getByText('Min $15 on Player or Banker')).toBeTruthy()
    const deal = () => within(getByTestId('bac-panel')).getByText('DEAL')
    let btn: any = deal().parent
    while (btn && btn.props.accessibilityState === undefined) btn = btn.parent
    expect(btn.props.accessibilityState.disabled).toBe(true)
    fire.press(within(getByTestId('bac-panel')).getByText('Player'))
    expect(queryByText('Min $15 on Player or Banker')).toBeNull()
  })

  test('the panel scrolls, so DEAL stays reachable at large font sizes', () => {
    useBaccaratStore.getState().newHand()
    const { UNSAFE_root } = render(<BaccaratScreen />)
    expect(UNSAFE_root.findAll((n: any) => n.type === ScrollView && n.props.testID === 'bac-panel')).toHaveLength(1)
  })
})

describe('the squeeze card is scrolled into view on large screens', () => {
  const { fireEvent: fire } = require('@testing-library/react-native')
  const { ScrollView } = require('react-native')
  beforeEach(() => seedProfile())

  const feltScroll = (root: any) =>
    root.findAll((n: any) => n.type === ScrollView && n.props.testID === 'baccarat-table')[0]

  test.each([['portrait', LARGE_PORTRAIT], ['landscape', LARGE_LANDSCAPE]])(
    'large %s: when the reveal content grows, the felt scrolls to the end so the card bottom and Flip it show',
    (_name, win) => {
      setWindow(win as Win)
      dealDeck(THIRD_CARDS, 'squeeze')
      const screen = render(<BaccaratScreen />)
      const scroll = feltScroll(screen.UNSAFE_root)
      const spy = jest.spyOn(scroll.instance, 'scrollToEnd')
      fire(screen.getByTestId('baccarat-table'), 'contentSizeChange', 600, 920)
      expect(spy).toHaveBeenCalled()
    })

  test('betting on a large screen does not auto-scroll', () => {
    setWindow(LARGE_PORTRAIT)
    useBaccaratStore.getState().newHand()
    const screen = render(<BaccaratScreen />)
    expect(screen.getByTestId('baccarat-table').props.onContentSizeChange).toBeUndefined()
  })

  test('phones keep the original felt (no auto-scroll handler)', () => {
    setWindow(PHONE)
    dealDeck(THIRD_CARDS, 'squeeze')
    const screen = render(<BaccaratScreen />)
    expect(screen.getByTestId('baccarat-table').props.onContentSizeChange).toBeUndefined()
  })
})

describe('How to play', () => {
  const { fireEvent } = require('@testing-library/react-native')
  beforeEach(() => useBaccaratStore.getState().newHand())

  test('an ⓘ sits left of Squeeze and opens the baccarat guide', () => {
    const screen = render(<BaccaratScreen />)
    const order = screen.getAllByText(/^(ⓘ|Squeeze)/).map(n => String([].concat(n.props.children)[0]))
    expect(order[0]).toBe('ⓘ')
    expect(order[1]).toMatch(/^Squeeze/)
    fireEvent.press(screen.getByTestId('how-to-play-info'))
    expect(screen.getByTestId('how-to-play')).toHaveTextContent(/How to play baccarat/)
    fireEvent.press(screen.getByTestId('how-to-play-close'))
    expect(screen.queryByTestId('how-to-play')).toBeNull()
  })
})
