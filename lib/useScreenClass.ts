import { useWindowDimensions } from 'react-native'
import { getScreenClass, Orientation, SizeClass } from './screenClass'

/** Current size class and orientation; re-renders on rotation and fold/unfold. */
export function useScreenClass(): { sizeClass: SizeClass; orientation: Orientation; width: number; height: number } {
  const { width, height } = useWindowDimensions()
  return { ...getScreenClass(width, height), width, height }
}
