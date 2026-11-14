import { useEffect } from 'react'
import { create } from 'zustand'
import * as ScreenOrientation from 'expo-screen-orientation'
import { SizeClass } from './screenClass'
import { useScreenClass } from './useScreenClass'

/** Large screens always rotate; phones stay portrait unless a screen (the roulette table) asks for rotation. */
export function shouldUnlock(sizeClass: SizeClass, rotationRequested: boolean): boolean {
  return sizeClass === 'large' || rotationRequested
}

type OrientationState = {
  rotationRequested: boolean
  setRotationRequested(v: boolean): void
}

/** Session-only flag a screen sets while it wants the phone free to rotate. */
export const useOrientationStore = create<OrientationState>(set => ({
  rotationRequested: false,
  setRotationRequested: v => set({ rotationRequested: v }),
}))

const noop = () => {}

/**
 * The single owner of the orientation lock (called from the root layout). Re-applies whenever the
 * size class changes (fold/unfold) or a screen's rotation request changes, so screens never lock or
 * unlock directly and can't race each other.
 */
export function useOrientationLock(): void {
  const { sizeClass } = useScreenClass()
  const rotationRequested = useOrientationStore(s => s.rotationRequested)
  const unlock = shouldUnlock(sizeClass, rotationRequested)
  useEffect(() => {
    if (unlock) ScreenOrientation.unlockAsync().catch(noop)
    else ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(noop)
  }, [unlock])
}
