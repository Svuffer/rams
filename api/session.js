// [SEC 100] Imports & helpers
// SEC 100  Imports & helpers          portalAuth imports · firebaseAdmin · APP_ID · readBody
// SEC 200  ensureFirebaseUser         Firebase user sync: get/create/update user, resolve email conflicts
// SEC 300  Request handler            entry · method check · dev bypass · session validation
// SEC 400  Token generation           ensureFirebaseUser call · custom token · response
const {
  getSessionCookieName,
  parseCookies,
  sanitizeRedirect,
  buildPortalLaunchUrl,
  buildPortalLogoutUrl,
  decodeSessionCookie,
  serializeCookie,
  getRequestOrigin,
  createSessionCookie,
  getPortalBaseUrl,
} = require('./utils/portalAuth')
const { getRamsAuth } = require('./utils/firebaseAdmin')

const APP_ID = 'rams'
// [SEC 100 END]

// [SEC 200] ensureFirebaseUser
function readBody(req) {
  if (req.method !== 'POST') {
    return {}
  }

  if (req.body && typeof req.body === 'object') {
    return req.body
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch (error) {
      return {}
    }
  }

  let raw = ''
  return new Promise((resolve) => {
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => {
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch (error) {
        resolve({})
      }
    })
    req.on('error', () => resolve({}))
  })
}

async function ensureFirebaseUser(auth, { uid, email, displayName }) {
  const syncDisplayName = async (targetUid, currentDisplayName) => {
    if (!displayName || currentDisplayName === displayName) {
      return
    }

    try {
      await auth.updateUser(targetUid, { displayName })
    } catch (updateError) {
      console.warn('[rams] syncDisplayName failed', { targetUid, displayName, updateError })
    }
  }

  const resolveEmailOwner = async () => {
    if (!email) {
      return null
    }

    try {
      const existing = await auth.getUserByEmail(email)
      await syncDisplayName(existing.uid, existing.displayName)
      return existing
    } catch (lookupError) {
      if (lookupError?.code !== 'auth/user-not-found') {
        console.warn('[rams] resolveEmailOwner lookup failed', { email, lookupError })
      }
      return null
    }
  }

  try {
    const record = await auth.getUser(uid)
    const updates = {}

    if (email) {
      if (!record.email) {
        updates.email = email
      } else if (record.email !== email) {
        const emailOwner = await resolveEmailOwner()
        if (emailOwner && emailOwner.uid !== uid) {
          return emailOwner
        }
        updates.email = email
      }
    }

    if (displayName && record.displayName !== displayName) {
      updates.displayName = displayName
    }

    if (Object.keys(updates).length > 0) {
      try {
        await auth.updateUser(uid, updates)
      } catch (updateError) {
        if (email && updateError?.code === 'auth/email-already-exists') {
          const emailOwner = await resolveEmailOwner()
          if (emailOwner) {
            return emailOwner
          }
        }
        console.warn('[rams] Failed to update Firebase user', { uid, updates, updateError })
      }
    }

    const refreshed = await auth.getUser(uid)
    await syncDisplayName(refreshed.uid, refreshed.displayName)
    return refreshed
  } catch (error) {
    if (error?.code === 'auth/user-not-found') {
      try {
        const created = await auth.createUser({
          uid,
          email: email ?? undefined,
          displayName: displayName ?? undefined,
        })
        return created
      } catch (createError) {
        if (email && createError?.code === 'auth/email-already-exists') {
          const emailOwner = await resolveEmailOwner()
          if (emailOwner) {
            return emailOwner
          }
        }
        console.error('[rams] createUser failed', { uid, createError })
        throw createError
      }
    }

    console.error('[rams] ensureFirebaseUser unexpected error', { uid, error })
    throw error
  }
}
// [SEC 200 END]

// [SEC 300] Request handler
module.exports = async (req, res) => {
  const method = req.method || 'GET'
  if (!['GET', 'POST', 'HEAD'].includes(method)) {
    res.statusCode = 405
    res.setHeader('Allow', 'GET,POST,HEAD')
    res.end('Method Not Allowed')
    return
  }

  const origin = getRequestOrigin(req)
  const body = method === 'POST' ? await readBody(req) : {}
  const redirectParam = method === 'POST'
    ? body.redirect
    : (Array.isArray(req.query.redirect) ? req.query.redirect[0] : req.query.redirect)

  const sanitizedRedirect = sanitizeRedirect(redirectParam, origin)
  const absoluteRedirect = new URL(sanitizedRedirect, origin).toString()

  const cookies = parseCookies(req.headers.cookie || '')
  const sessionCookieName = getSessionCookieName()
  const encodedSession = cookies[sessionCookieName]
  const launchUrl = buildPortalLaunchUrl(APP_ID, absoluteRedirect)

  const devBypassFlag = (process.env.RAMS_DEV_PORTAL_BYPASS || '').toLowerCase()
  const devBypassEnabled = ['1', 'true', 'yes'].includes(devBypassFlag)
  const devBypassSession = devBypassEnabled
    ? {
        uid: process.env.RAMS_DEV_PORTAL_UID || 'rams-dev-user',
        email: process.env.RAMS_DEV_PORTAL_EMAIL || null,
        displayName: process.env.RAMS_DEV_PORTAL_NAME || 'RAMS Dev User',
      }
    : null

  const portalUrl = getPortalBaseUrl()
  const secure = portalUrl ? portalUrl.startsWith('https://') : process.env.NODE_ENV === 'production'
  const clearCookieHeader = serializeCookie({
    name: sessionCookieName,
    value: '',
    attributes: {
      path: '/',
      httpOnly: true,
      secure,
      sameSite: 'Lax',
      maxAge: 0,
    },
  })

  const sendUnauthorized = (message) => {
    res.statusCode = 401
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Set-Cookie', clearCookieHeader)
    res.end(JSON.stringify({ error: message, launch: launchUrl }))
  }

  if (!encodedSession) {
    console.warn('[rams-dev-api] session cookie missing on request', {
      path: req.url,
      headers: req.headers.cookie,
    })
  }

  let session = null
  let setCookieHeader = null

  if (encodedSession) {
    session = decodeSessionCookie(encodedSession)
    if (!session) {
      console.warn('[rams-dev-api] session cookie could not be decoded')
      sendUnauthorized('Portal session invalid')
      return
    }
  } else if (devBypassSession) {
    console.info('[rams-dev-api] using dev bypass session for request')
    session = devBypassSession
    const sessionCookie = createSessionCookie(session)
    setCookieHeader = serializeCookie(sessionCookie)
  } else {
    console.warn('[rams-dev-api] no portal session available, redirecting to portal launch')
    sendUnauthorized('Portal session required')
    return
  }
// [SEC 300 END]

// [SEC 400] Token generation
  try {
    const auth = getRamsAuth()
    const firebaseUser = await ensureFirebaseUser(auth, session)

    if (firebaseUser.uid !== session.uid) {
      console.info('[rams] ensureFirebaseUser resolved alternate uid', {
        requestedUid: session.uid,
        resolvedUid: firebaseUser.uid,
      })
    }

    const resolvedEmail = firebaseUser.email || session.email || null
    const resolvedDisplayName = firebaseUser.displayName || session.displayName || null

    const tokenClaims = {
      portalApp: APP_ID,
    }
    if (resolvedEmail) {
      tokenClaims.email = resolvedEmail
    }
    if (resolvedDisplayName) {
      tokenClaims.displayName = resolvedDisplayName
    }

    const token = await auth.createCustomToken(firebaseUser.uid, tokenClaims)

    res.statusCode = 200
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Type', 'application/json')
    if (setCookieHeader) {
      res.setHeader('Set-Cookie', setCookieHeader)
    }
    res.end(JSON.stringify({
      token,
      email: resolvedEmail,
      displayName: resolvedDisplayName,
      uid: firebaseUser.uid,
      redirect: sanitizedRedirect,
    }))
  } catch (error) {
    console.error('[rams] session exchange failed', { error })
    const logoutUrl = buildPortalLogoutUrl(absoluteRedirect)
    res.statusCode = 500
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Failed to establish Firebase session', redirect: logoutUrl }))
  }
}
// [SEC 400 END]
