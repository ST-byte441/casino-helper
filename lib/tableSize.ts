import { StyleSheet } from 'react-native'

export type TableSize = 'regular' | 'large'

/** How much bigger the table's pieces are on large screens (Fold inner screen, tablets). */
export const LARGE_SCALE = 1.5

type Styles = Record<string, object>

/**
 * A component's regular sheet plus a complete large sheet (regular merged with overrides).
 * Components pick one whole sheet by size, so regular renders exactly the same style objects
 * as before: no extra `false` entries or nested arrays that would change phone output.
 */
export function sizedStyles<T extends Styles>(regular: T, large: { [K in keyof T]?: object }): Record<TableSize, T> {
  const merged = {} as T
  for (const key of Object.keys(regular) as (keyof T)[]) {
    merged[key] = { ...regular[key], ...large[key] } as T[keyof T]
  }
  return { regular, large: StyleSheet.create(merged) }
}
