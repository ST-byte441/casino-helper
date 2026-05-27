import Constants from 'expo-constants'

const RELEASES_API = 'https://api.github.com/repos/ST-byte441/casinoHelper/releases/latest'

export type UpdateInfo = {
  hasUpdate: boolean
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
  try {
    const res = await fetch(RELEASES_API)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.tag_name) return null
    const latestVersion = (data.tag_name as string).replace(/^v/, '')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = Constants.expoConfig ?? (Constants as any).default?.expoConfig
    const currentVersion = config?.version ?? '0.0.0'
    return {
      hasUpdate: isNewerVersion(latestVersion, currentVersion),
      latestVersion,
      releaseUrl: data.html_url as string,
    }
  } catch {
    return null
  }
}
