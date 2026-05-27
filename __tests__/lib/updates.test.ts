import { checkForUpdate, isNewerVersion } from '../../lib/updates'

// Mock expo-constants so we control the "current" version in tests
jest.mock('expo-constants', () => ({
  default: { expoConfig: { version: '1.0.0' } },
}))

const mockFetch = (body: unknown, status = 200) => {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: status === 200,
    json: async () => body,
  } as Response)
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('isNewerVersion', () => {
  test('returns true when remote is ahead on patch', () => {
    expect(isNewerVersion('1.0.1', '1.0.0')).toBe(true)
  })

  test('returns true when remote is ahead on minor', () => {
    expect(isNewerVersion('1.1.0', '1.0.5')).toBe(true)
  })

  test('returns true when remote is ahead on major', () => {
    expect(isNewerVersion('2.0.0', '1.9.9')).toBe(true)
  })

  test('returns false when versions are equal', () => {
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false)
  })

  test('returns false when remote is behind', () => {
    expect(isNewerVersion('0.9.9', '1.0.0')).toBe(false)
  })
})

describe('checkForUpdate', () => {
  test('returns hasUpdate true when remote version is newer', async () => {
    mockFetch({
      tag_name: 'v1.0.1',
      html_url: 'https://github.com/ST-byte441/casinoHelper/releases/tag/v1.0.1',
    })
    const result = await checkForUpdate()
    expect(result).toEqual({
      hasUpdate: true,
      latestVersion: '1.0.1',
      releaseUrl: 'https://github.com/ST-byte441/casinoHelper/releases/tag/v1.0.1',
    })
  })

  test('returns hasUpdate false when already on latest', async () => {
    mockFetch({
      tag_name: 'v1.0.0',
      html_url: 'https://github.com/ST-byte441/casinoHelper/releases/tag/v1.0.0',
    })
    const result = await checkForUpdate()
    expect(result).toEqual({
      hasUpdate: false,
      latestVersion: '1.0.0',
      releaseUrl: 'https://github.com/ST-byte441/casinoHelper/releases/tag/v1.0.0',
    })
  })

  test('returns null on network error', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network request failed'))
    const result = await checkForUpdate()
    expect(result).toBeNull()
  })

  test('returns null on non-200 response', async () => {
    mockFetch({}, 403)
    const result = await checkForUpdate()
    expect(result).toBeNull()
  })

  test('returns null when tag_name is missing', async () => {
    mockFetch({ html_url: 'https://github.com/...' })
    const result = await checkForUpdate()
    expect(result).toBeNull()
  })
})
