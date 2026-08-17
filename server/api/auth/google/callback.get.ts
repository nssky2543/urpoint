import { and, eq, gt } from 'drizzle-orm'
import { useDb } from '../../../database/client'
import {
  googleOauthStates,
  stores,
  userIdentities,
  users,
} from '../../../database/schema'
import { createSession } from '../../../utils/session'
import { createDefaultStore } from '../../../utils/store'
import {
  exchangeGoogleCode,
  fetchGoogleProfile,
  getGoogleCallbackUrl,
  getGoogleCredentials,
  GOOGLE_PROVIDER,
  googleAuthErrorRedirect,
  usernameFromEmail,
  type GoogleOAuthIntent,
} from '../../../utils/google'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = typeof query.code === 'string' ? query.code : ''
  const state = typeof query.state === 'string' ? query.state : ''
  const oauthError = typeof query.error === 'string' ? query.error : ''
  let intent: GoogleOAuthIntent = 'login'

  try {
    if (oauthError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'cancelled',
      })
    }

    if (!code || !state) {
      throw createError({
        statusCode: 400,
        statusMessage: 'invalid_state',
      })
    }

    const db = useDb()
    const [oauth] = await db
      .select()
      .from(googleOauthStates)
      .where(and(
        eq(googleOauthStates.state, state),
        gt(googleOauthStates.expiresAt, new Date()),
      ))
      .limit(1)

    if (!oauth) {
      throw createError({
        statusCode: 400,
        statusMessage: 'invalid_state',
      })
    }

    intent = oauth.intent === 'register' ? 'register' : 'login'
    await db.delete(googleOauthStates).where(eq(googleOauthStates.state, state))

    const { clientId, clientSecret } = getGoogleCredentials()
    const tokens = await exchangeGoogleCode({
      code,
      redirectUri: getGoogleCallbackUrl(),
      clientId,
      clientSecret,
      codeVerifier: oauth.codeVerifier,
    })

    const profile = await fetchGoogleProfile(tokens.access_token!)

    const [identity] = await db
      .select({
        userId: userIdentities.userId,
      })
      .from(userIdentities)
      .where(and(
        eq(userIdentities.provider, GOOGLE_PROVIDER),
        eq(userIdentities.providerAccountId, profile.sub),
      ))
      .limit(1)

    let userId = identity?.userId

    if (!userId) {
      const [existingEmail] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, profile.email))
        .limit(1)

      if (existingEmail) {
        await db.insert(userIdentities).values({
          userId: existingEmail.id,
          provider: GOOGLE_PROVIDER,
          providerAccountId: profile.sub,
        })
        userId = existingEmail.id
      } else {
        const created = await db.transaction(async (tx) => {
          const [user] = await tx
            .insert(users)
            .values({
              email: profile.email,
              name: profile.name,
              username: usernameFromEmail(profile.email),
              avatarUrl: profile.picture,
            })
            .returning({ id: users.id })

          if (!user) {
            throw new Error('User was not created')
          }

          await tx.insert(userIdentities).values({
            userId: user.id,
            provider: GOOGLE_PROVIDER,
            providerAccountId: profile.sub,
          })

          await createDefaultStore(user.id, profile.name, 'barber', tx)
          return user
        })
        userId = created.id
      }
    } else {
      await db
        .update(users)
        .set({
          name: profile.name,
          avatarUrl: profile.picture,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
    }

    await createSession(event, userId)

    const [store] = await db
      .select({
        onboardedAt: stores.onboardedAt,
      })
      .from(stores)
      .where(eq(stores.ownerUserId, userId))
      .limit(1)

    if (!store?.onboardedAt) {
      return sendRedirect(event, '/settings/store')
    }

    return sendRedirect(event, '/dashboard')
  } catch (error) {
    const statusMessage = (error as { statusMessage?: string }).statusMessage || 'google_failed'
    const known = ['cancelled', 'invalid_state', 'อีเมล Google ยังไม่ได้ยืนยัน']
    const codeName = statusMessage === 'อีเมล Google ยังไม่ได้ยืนยัน'
      ? 'email_unverified'
      : known.includes(statusMessage)
        ? statusMessage
        : 'google_failed'
    return sendRedirect(event, googleAuthErrorRedirect(intent, codeName))
  }
})
