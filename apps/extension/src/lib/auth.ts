const DASHBOARD_URL = process.env.PLASMO_PUBLIC_DASHBOARD_URL
const SUPABASE_URL = process.env.PLASMO_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY

export type StoredAuth = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  userEmail: string
}

export async function getStoredTokens(): Promise<StoredAuth | null> {
  const result = await chrome.storage.local.get([
    "accessToken",
    "refreshToken",
    "expiresAt",
    "userEmail"
  ])
  const { accessToken, refreshToken, expiresAt, userEmail } = result
  if (
    typeof accessToken !== "string" ||
    typeof refreshToken !== "string" ||
    typeof expiresAt !== "number" ||
    typeof userEmail !== "string"
  ) {
    return null
  }
  return { accessToken, refreshToken, expiresAt, userEmail }
}

export async function storeTokens(data: StoredAuth): Promise<void> {
  await chrome.storage.local.set(data)
}

export async function clearTokens(): Promise<void> {
  await chrome.storage.local.remove(["accessToken", "refreshToken", "expiresAt"])
}

export function isTokenExpired(expiresAt: number): boolean {
  return expiresAt - 60 < Date.now() / 1000
}

export async function refreshTokens(
  refreshToken: string
): Promise<StoredAuth | null> {
  try {
    const res = await fetch(`${DASHBOARD_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    })
    if (!res.ok) return null
    const data = await res.json()
    const stored: StoredAuth = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
      userEmail: data.user.email
    }
    await storeTokens(stored)
    return stored
  } catch {
    return null
  }
}

export async function getSessionFromDashboard(): Promise<StoredAuth | null> {
  try {
    const res = await fetch(`${DASHBOARD_URL}/api/auth/session`)
    if (!res.ok) return null
    const data = await res.json()
    const stored: StoredAuth = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
      userEmail: data.user.email
    }
    await storeTokens(stored)
    return stored
  } catch {
    return null
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<StoredAuth | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY!
        },
        body: JSON.stringify({ email, password })
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const stored: StoredAuth = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      userEmail: data.user.email
    }
    await storeTokens(stored)
    return stored
  } catch {
    return null
  }
}

export async function getValidToken(): Promise<string | null> {
  const stored = await getStoredTokens()
  if (!stored) return null
  if (!isTokenExpired(stored.expiresAt)) return stored.accessToken
  const refreshed = await refreshTokens(stored.refreshToken)
  if (refreshed) return refreshed.accessToken
  await clearTokens()
  return null
}
