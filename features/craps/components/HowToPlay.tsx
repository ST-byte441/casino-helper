import React from 'react'
import { Text } from '../../../components/Text'
import { Bullet, InfoSheet, infoStyles as styles } from '../../../components/InfoSheet'

export const HOW_TO_PLAY_TITLE = 'How to play craps'

/** The rules of craps as this app plays them (engine.ts; sources in assets/rules-docs/craps-rules.md). */
export function HowToPlayContent() {
  return (
    <>
      <Text style={styles.body}>
        Craps is played with two dice. Most bets are on what the shooter rolls next, or on whether a number comes
        before a 7. Put chips down, then press ROLL.
      </Text>

      <Text style={styles.heading}>The come-out roll</Text>
      <Bullet>A round starts with the come-out roll. Pass Line bets win on 7 or 11 and lose on 2, 3 or 12 (craps).</Bullet>
      <Bullet>Don't Pass is the opposite: it wins on 2 or 3, loses on 7 or 11, and pushes on 12.</Bullet>
      <Bullet>Any other number (4, 5, 6, 8, 9 or 10) becomes the point, marked by the ON puck.</Bullet>

      <Text style={styles.heading}>The point</Text>
      <Bullet>
        The shooter keeps rolling. Roll the point again before a 7 and Pass wins. Roll a 7 first (a seven-out) and Pass
        loses, Don't Pass wins, and a new come-out begins.
      </Bullet>

      <Text style={styles.heading}>Main bets</Text>
      <Bullet>
        <Text style={styles.strong}>Odds</Text>: once there's a point, add odds behind a Pass or Come bet. They pay
        true odds (no house edge): 2 to 1 on 4 or 10, 3 to 2 on 5 or 9, 6 to 5 on 6 or 8.
      </Bullet>
      <Bullet>
        <Text style={styles.strong}>Come / Don't Come</Text>: like Pass and Don't Pass, but made after the point is set;
        the next roll is that bet's own come-out.
      </Bullet>
      <Bullet>
        <Text style={styles.strong}>Place</Text>: bet a number rolls before a 7. 6 and 8 pay 7 to 6, 5 and 9 pay 7 to
        5, 4 and 10 pay 9 to 5. They're off on the come-out unless you turn them on.
      </Bullet>
      <Bullet>
        <Text style={styles.strong}>Field</Text>: a one-roll bet. 3, 4, 9, 10 and 11 pay 1 to 1; 2 pays 2 to 1; 12
        pays 2 to 1, or 3 to 1 at tables set that way. 5, 6, 7 and 8 lose.
      </Bullet>
      <Bullet>
        <Text style={styles.strong}>Hardways</Text>: a number rolled as a pair (3-3 for hard 6) before it rolls any
        other way or a 7. Hard 6 and 8 pay 9 to 1; Hard 4 and 10 pay 7 to 1.
      </Bullet>
      <Bullet>
        <Text style={styles.strong}>Proposition bets</Text> in the centre (Any 7, Any Craps, 2, 3, 11, 12, Horn…)
        are one-roll bets with big payouts and a high house edge.
      </Bullet>

      <Text style={styles.heading}>Table variants</Text>
      <Bullet>
        <Text style={styles.strong}>Standard</Text> craps plays as above.
      </Bullet>
      <Bullet>
        <Text style={styles.strong}>Crapless</Text>: no craps on the come-out. Only 7 wins; 2, 3, 11 and 12 become
        points. There is no Don't Pass or Don't Come.
      </Bullet>
      <Bullet>
        <Text style={styles.strong}>Easy Craps</Text>: this app's practice table. It plays like Crapless with fewer
        bets, plus Low Field (2, 3, 4) and High Field (10, 11, 12).
      </Bullet>

      <Text style={styles.heading}>Tip</Text>
      <Text style={styles.body}>
        The Pass Line with full odds behind it is the best bet on the table. Turn on Assist to see which bets are
        good and how to size them.
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
