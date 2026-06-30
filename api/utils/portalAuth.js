// Section map -- grep "[SEC NNN]" to jump to any section; numbers are stable even as line numbers drift.
// SEC 100  Imports & constants        crypto · SESSION_COOKIE · SESSION_DURATION_SECONDS · getPortalBaseUrl · getSecret
// SEC 200  Token verification         verifyPortalToken (HMAC-SHA256 validate + payload decode)
// SEC 300  Cookie management          encodeSessionValue · decodeSessionCookie · createSessionCookie · serializeCookie · parseCookies
// SEC 400  URL builders               sanitizeRedirect · buildPortalLoginUrl · buildPortalLaunchUrl · buildPortalLogoutUrl
// SEC 500  Request origin & exports   resolveProto · getRequestOrigin · module.exports

// [SEC 100] Imports & constants
const crypto = require('crypto')
const { Buffer } = require('node:buffer')

const SESSION_COOKIE = process.env.PORTAL_SESSION_COOKIE_NAME || 'uctel_rams_session'
const SESSION_DURATION_SECONDS = 60 * 60 * 5 // 5 hours

function getPortalBaseUrl() {
  return process.env.REACT_APP_PORTAL_URL
    || process.env.NEXT_PUBLIC_PORTAL_URL
    || process.env.PORTAL_URL
  || 'http://localhost:3300'
}

function getSecret() {
  const secret = process.env.PORTAL_SIGNING_SECRET
  if (!secret) {
    throw new Error('PORTAL_SIGNING_SECRET must be configured')
  }
  return secret
}
// [SEC 100 END]

// [SEC 200] Token verification
function verifyPortalToken(token) {
  if (!token || typeof token !== 'string') {
    return null
  }

  const [data, signature] = token.split('.')
  if (!data || !signature) {
    return null
  }

  const expectedSignature = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url')
  const providedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (providedBuffer.length !== expectedBuffer.length) {
    return null
  }

  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString())
    if (!payload || typeof payload.uid !== 'string' || typeof payload.appId !== 'string' || typeof payload.exp !== 'number') {
      return null
    }
    if (payload.exp < Date.now()) {
      return null
    }
    return {
      uid: payload.uid,
      appId: payload.appId,
      exp: payload.exp,
      email: typeof payload.email === 'string' ? payload.email : null,
      displayName: typeof payload.displayName === 'string' ? payload.displayName : null,
    }
  } catch (error) {
    return null
  }
}
// [SEC 200 END]

// [SEC 300] Cookie management
function encodeSessionValue(value) {
  const payload = typeof value === 'string'
    ? { uid: value, email: null, displayName: null }
    : {
        uid: value.uid,
        email: value.email ?? null,
        displayName: value.displayName ?? null,
      }
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

function decodeSessionCookie(cookieValue) {
  if (!cookieValue) {
    return null
  }

  try {
    const decoded = Buffer.from(cookieValue, 'base64url').toString('utf8')
    const parsed = JSON.parse(decoded)
    if (!parsed || typeof parsed.uid !== 'string') {
      return null
    }
    return {
      uid: parsed.uid,
      email: typeof parsed.email === 'string' ? parsed.email : null,
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName : null,
    }
  } catch (error) {
    return {
      uid: cookieValue,
      email: null,
      displayName: null,
    }
  }
}

function createSessionCookie(value) {
  const portalUrl = getPortalBaseUrl()
  const secure = portalUrl ? portalUrl.startsWith('https://') : process.env.NODE_ENV === 'production'

  return {
    name: SESSION_COOKIE,
    value: encodeSessionValue(value),
    attributes: {
      httpOnly: true,
      secure,
      sameSite: 'Lax',
      path: '/',
      maxAge: SESSION_DURATION_SECONDS,
    },
  }
}

function serializeCookie({ name, value, attributes }) {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  if (typeof attributes.maxAge === 'number') {
    parts.push(`Max-Age=${Math.floor(attributes.maxAge)}`)
  }
  if (attributes.expires) {
    parts.push(`Expires=${attributes.expires.toUTCString()}`)
  }
  if (attributes.domain) {
    parts.push(`Domain=${attributes.domain}`)
  }
  if (attributes.path) {
    parts.push(`Path=${attributes.path}`)
  }
  if (attributes.httpOnly) {
    parts.push('HttpOnly')
  }
  if (attributes.secure) {
    parts.push('Secure')
  }
  if (attributes.sameSite) {
    parts.push(`SameSite=${attributes.sameSite}`)
  }
  return parts.join('; ')
}

function getSessionCookieName() {
  return SESSION_COOKIE
}

function parseCookies(header = '') {
  return header
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, entry) => {
      const separatorIndex = entry.indexOf('=')
      if (separatorIndex === -1) {
        return acc
      }
      const name = entry.slice(0, separatorIndex).trim()
      const value = entry.slice(separatorIndex + 1).trim()
      if (!name) {
        return acc
      }
      acc[name] = decodeURIComponent(value)
      return acc
    }, {})
}
// [SEC 300 END]

// [SEC 400] URL builders
function sanitizeRedirect(target, origin) {
  if (!target) {
    return '/'
  }
  try {
    const candidate = new URL(target, origin)
    if (candidate.origin !== origin) {
      return '/'
    }
    return candidate.pathname + candidate.search + candidate.hash
  } catch (error) {
    if (typeof target === 'string' && target.startsWith('/')) {
      return target
    }
    return '/'
  }
}

function buildPortalLoginUrl(redirect) {
  const baseUrl = getPortalBaseUrl()
  const loginUrl = new URL('/login', baseUrl)
  if (redirect) {
    loginUrl.searchParams.set('redirect', redirect)
  }
  return loginUrl.toString()
}

function buildPortalLaunchUrl(appId, redirect) {
  const baseUrl = getPortalBaseUrl()
  const launchUrl = new URL(`/launch/${appId}`, baseUrl)
  if (redirect) {
    launchUrl.searchParams.set('redirect', redirect)
  }
  return launchUrl.toString()
}

function buildPortalLogoutUrl(redirect) {
  const baseUrl = getPortalBaseUrl()
  const url = new URL('/login', baseUrl)
  if (redirect) {
    url.searchParams.set('redirect', redirect)
  }
  url.searchParams.set('logout', '1')
  return url.toString()
}
// [SEC 400 END]

// [SEC 500] Request origin & exports
function resolveProto(req) {
  const protoHeader = req.headers['x-forwarded-proto']
  if (protoHeader) {
    const candidate = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader
    if (candidate) {
      return candidate.split(',')[0].trim().toLowerCase()
    }
  }

  if (typeof req.protocol === 'string' && req.protocol.length > 0) {
    return req.protocol
  }

  return 'http'
}

function getRequestOrigin(req) {
  const proto = resolveProto(req)
  const host = req.headers['x-forwarded-host'] || req.headers.host || `${req.socket?.localAddress || 'localhost'}:${req.socket?.localPort || ''}`
  return `${proto}://${host}`
}

module.exports = {
  verifyPortalToken,
  createSessionCookie,
  serializeCookie,
  encodeSessionValue,
  decodeSessionCookie,
  getSessionCookieName,
  parseCookies,
  sanitizeRedirect,
  buildPortalLoginUrl,
  buildPortalLaunchUrl,
  buildPortalLogoutUrl,
  getRequestOrigin,
  getPortalBaseUrl,
}
// [SEC 500 END]
