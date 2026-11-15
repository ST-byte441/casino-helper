import { BaccaratOutcome, BaccaratRevealMode, Card as CardType } from '../../../../lib/types'
import { TableSize } from '../../../../lib/tableSize'
import { SqueezeCard } from '../SqueezeCard'
import { ResultBanner } from '../ResultBanner'

type Props = {
  size: TableSize
  /** The card being revealed now (reveal phase), keyed so each card gets a fresh squeeze. */
  reveal?: { card: CardType; key: number; mode: BaccaratRevealMode; onRevealed(): void; scrollRef: React.RefObject<any> }
  result?: { outcome: BaccaratOutcome; playerScore: number; bankerScore: number; netDelta: number }
}

/** Below the hands: the squeeze/flip card while revealing, or the result banner. */
export function RevealArea({ size, reveal, result }: Props) {
  return (
    <>
      {reveal && (
        <SqueezeCard
          key={reveal.key}
          card={reveal.card}
          mode={reveal.mode}
          onRevealed={reveal.onRevealed}
          scrollRef={reveal.scrollRef}
          size={size}
        />
      )}
      {result && <ResultBanner {...result} size={size} />}
    </>
  )
}
