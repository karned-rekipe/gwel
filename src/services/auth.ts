import { appConfig } from '@/config/env'
import {
  pruneOidcTransactions,
  readOidcTransaction,
  removeOidcTransaction,
  storeOidcTransaction,
  type OidcTransaction,
} from './oidcTransaction'

const ACCESS_TOKEN_STORAGE_KEY = 'rekipe.access_token'
const REFRESH_TOKEN_STORAGE_KEY = 'rekipe.refresh_token'
const EXPIRES_AT_STORAGE_KEY = 'rekipe.access_token_expires_at'
const PKCE_VERIFIER_STORAGE_KEY = 'rekipe.pkce_verifier'
const OIDC_STATE_STORAGE_KEY = 'rekipe.oidc_state'
const REDIRECT_URI_STORAGE_KEY = 'rekipe.redirect_uri'
const AUTH_CALLBACK_RETRY_PARAMETER = 'auth_callback_retry'

type TokenResponse = {
  access_token: string
  expires_in: number
  refresh_token?: string
}

let refreshPromise: Promise<void> | null = null

const keycloakEndpoint = (resource: 'auth' | 'token'): string => {
  const baseUrl = appConfig.keycloak.baseUrl.replace(/\/$/, '')
  return `${baseUrl}/realms/${encodeURIComponent(appConfig.keycloak.realm)}/protocol/openid-connect/${resource}`
}

const keycloakIssuer = (): string => {
  const baseUrl = appConfig.keycloak.baseUrl.replace(/\/$/, '')
  return `${baseUrl}/realms/${encodeURIComponent(appConfig.keycloak.realm)}`
}

const transactionStorages = () => ({
  session: window.sessionStorage,
  persistent: window.localStorage,
})

const toBase64Url = (bytes: Uint8Array): string => {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const randomValue = (size = 32): string => {
  const bytes = new Uint8Array(size)
  window.crypto.getRandomValues(bytes)
  return toBase64Url(bytes)
}

const createCodeChallenge = async (verifier: string): Promise<string> => {
  const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return toBase64Url(new Uint8Array(digest))
}

const callbackParameterNames = [
  'code',
  'error',
  'error_description',
  'iss',
  'session_state',
  'state',
]

const currentUrlWithoutCallbackParameters = (): string => {
  const url = new URL(window.location.href)
  callbackParameterNames.forEach((name) => url.searchParams.delete(name))
  return url.toString()
}

const cleanRedirectUri = (redirectUri: string): string => {
  const url = new URL(redirectUri)
  url.searchParams.delete(AUTH_CALLBACK_RETRY_PARAMETER)
  return url.toString()
}

const clearCallbackRetryParameter = (): void => {
  const cleanUrl = cleanRedirectUri(window.location.href)
  if (cleanUrl !== window.location.href) {
    window.history.replaceState({}, document.title, cleanUrl)
  }
}

const clearLegacyAuthorizationTransaction = (): void => {
  window.sessionStorage.removeItem(OIDC_STATE_STORAGE_KEY)
  window.sessionStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY)
  window.sessionStorage.removeItem(REDIRECT_URI_STORAGE_KEY)
}

const readLegacyAuthorizationTransaction = (
  receivedState: string,
): OidcTransaction | null => {
  const expectedState = window.sessionStorage.getItem(OIDC_STATE_STORAGE_KEY)
  const verifier = window.sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY)
  const redirectUri = window.sessionStorage.getItem(REDIRECT_URI_STORAGE_KEY)

  if (
    receivedState !== expectedState
    || !verifier
    || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)
    || !redirectUri
  ) {
    return null
  }

  try {
    if (new URL(redirectUri).origin !== window.location.origin) return null
  } catch {
    return null
  }

  return {
    state: receivedState,
    verifier,
    redirectUri,
    createdAt: Date.now(),
  }
}

const restartInvalidAuthorizationCallback = async (url: URL): Promise<never> => {
  const receivedState = url.searchParams.get('state')
  if (receivedState) removeOidcTransaction(transactionStorages(), receivedState)
  clearLegacyAuthorizationTransaction()

  const cleanUrl = new URL(currentUrlWithoutCallbackParameters())
  if (cleanUrl.searchParams.get(AUTH_CALLBACK_RETRY_PARAMETER) !== '1') {
    cleanUrl.searchParams.set(AUTH_CALLBACK_RETRY_PARAMETER, '1')
    window.location.replace(cleanUrl.toString())
    return new Promise<never>(() => undefined)
  }

  cleanUrl.searchParams.delete(AUTH_CALLBACK_RETRY_PARAMETER)
  window.history.replaceState({}, document.title, cleanUrl.toString())
  throw new Error("La session d'authentification a expiré. Rechargez la page pour réessayer.")
}

const clearTokens = (): void => {
  window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
  window.sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
  window.sessionStorage.removeItem(EXPIRES_AT_STORAGE_KEY)
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
}

const storeTokens = (tokens: TokenResponse): void => {
  if (!tokens.access_token || !Number.isFinite(tokens.expires_in)) {
    throw new Error('Réponse de jeton Keycloak invalide')
  }

  window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, tokens.access_token)
  window.sessionStorage.setItem(
    EXPIRES_AT_STORAGE_KEY,
    String(Date.now() + tokens.expires_in * 1000),
  )

  if (tokens.refresh_token) {
    window.sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refresh_token)
  }
}

const requestTokens = async (parameters: URLSearchParams): Promise<TokenResponse> => {
  const response = await window.fetch(keycloakEndpoint('token'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: parameters,
  })

  if (!response.ok) {
    throw new Error(`Keycloak a refusé la demande de jeton (${response.status})`)
  }

  return (await response.json()) as TokenResponse
}

const hasUsableAccessToken = (minimumLifetimeSeconds = 30): boolean => {
  const token = window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  const expiresAt = Number(window.sessionStorage.getItem(EXPIRES_AT_STORAGE_KEY))
  return Boolean(token) && Number.isFinite(expiresAt) && expiresAt > Date.now() + minimumLifetimeSeconds * 1000
}

const refreshAccessToken = async (): Promise<void> => {
  const refreshToken = window.sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
  if (!refreshToken) {
    throw new Error('Aucun jeton de renouvellement Keycloak disponible')
  }

  const parameters = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: appConfig.keycloak.clientId,
    refresh_token: refreshToken,
  })
  storeTokens(await requestTokens(parameters))
}

const ensureFreshToken = async (): Promise<void> => {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null
    })
  }
  await refreshPromise
}

const redirectToLogin = async (): Promise<never> => {
  const state = randomValue()
  const verifier = randomValue(64)
  const redirectUri = currentUrlWithoutCallbackParameters()

  pruneOidcTransactions(transactionStorages(), window.location.origin)
  storeOidcTransaction(transactionStorages(), {
    state,
    verifier,
    redirectUri,
    createdAt: Date.now(),
  })

  const parameters = new URLSearchParams({
    client_id: appConfig.keycloak.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    state,
    code_challenge: await createCodeChallenge(verifier),
    code_challenge_method: 'S256',
  })

  window.location.assign(`${keycloakEndpoint('auth')}?${parameters.toString()}`)
  return new Promise<never>(() => undefined)
}

const completeAuthorizationCallback = async (url: URL): Promise<void> => {
  const code = url.searchParams.get('code')
  const receivedState = url.searchParams.get('state')
  const receivedIssuer = url.searchParams.get('iss')
  const transaction = receivedState
    ? readOidcTransaction(transactionStorages(), receivedState, window.location.origin)
      ?? readLegacyAuthorizationTransaction(receivedState)
    : null

  if (
    !code
    || !receivedState
    || !transaction
    || (receivedIssuer !== null && receivedIssuer !== keycloakIssuer())
  ) {
    return restartInvalidAuthorizationCallback(url)
  }

  removeOidcTransaction(transactionStorages(), receivedState)
  clearLegacyAuthorizationTransaction()

  const parameters = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: appConfig.keycloak.clientId,
    code,
    code_verifier: transaction.verifier,
    redirect_uri: transaction.redirectUri,
  })

  storeTokens(await requestTokens(parameters))
  window.history.replaceState({}, document.title, cleanRedirectUri(transaction.redirectUri))
}

export const initializeAuth = async (): Promise<void> => {
  if (appConfig.authDisabled) return

  const url = new URL(window.location.href)
  const authorizationError = url.searchParams.get('error')
  if (authorizationError) {
    const description = url.searchParams.get('error_description')
    throw new Error(description || `Échec de l'authentification Keycloak (${authorizationError})`)
  }

  if (url.searchParams.has('code')) {
    await completeAuthorizationCallback(url)
    return
  }

  if (hasUsableAccessToken()) {
    clearCallbackRetryParameter()
    return
  }

  if (window.sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)) {
    try {
      await ensureFreshToken()
      clearCallbackRetryParameter()
      return
    } catch {
      clearTokens()
    }
  }

  await redirectToLogin()
}

export const getAccessToken = async (): Promise<string | null> => {
  if (appConfig.authDisabled) return null

  if (!hasUsableAccessToken()) {
    try {
      await ensureFreshToken()
    } catch {
      clearTokens()
      await redirectToLogin()
    }
  }

  return window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
}
