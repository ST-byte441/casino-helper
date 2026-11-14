import Constants from 'expo-constants'
import * as Updates from 'expo-updates'

const RELEASES_API = 'https://api.github.com/repos/ST-byte441/casino-helper/releases/latest'

// Play Store builds (eas.json `production` profile) are updated by Play. Google re-signs them,
// so a GitHub APK can't install over them, and prompting for one would only fail.
const PLAY_STORE_CHANNEL = 'production'

export type UpdateInfo = {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl: string
}

export function isNewerVersion(remote: string, current: string): boolean {
  const parse = (v: string) => v.split('.').map(Number)
  const [rMaj, rMin, rPat] = parse(remote)
  const [cMaj, cMin, cPat] = parse(current)
  if (rMaj !== cMaj) return rMaj > cMaj
  if (rMin !== cMin) return rMin > cMin
  return rPat > cPat
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (Updates.channel === PLAY_STORE_CHANNEL) return null
  try {
    const res = await fetch(RELEASES_API)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.tag_name) return null
    if (!data.html_url) return null
    const latestVersion = (data.tag_name as string).replace(/^v/, '')
    const currentVersion = Constants.expoConfig?.version ?? '0.0.0'
    return {
      hasUpdate: isNewerVersion(latestVersion, currentVersion),
      currentVersion,
      latestVersion,
      releaseUrl: data.html_url as string,
    }
  } catch {
    return null
  }
}
