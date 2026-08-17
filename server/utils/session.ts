import { and, eq, gt } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDb } from '../database/client'
import { sessions, users } from '../database/schema'
import { createSessionToken, hashSessionToken } from './auth'

const COOKIE_NAME = 'urpoint_session'
const SESSION_SECONDS = 60 * 60 * 24 * 7

export type SessionUser = {
  id: string
  email: string
  name: string
  username: string
  avatarUrl: string | null
}

export async function createSession(event: H3Event, userId: string) {
  const token = createSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000)

  await useDb().insert(sessions).values({
    tokenHash: hashSessionToken(token),
    userId,
    expiresAt,
  })

  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_SECONDS,
  })
}

export async function getSessionUser(event: H3Event): Promise<SessionUser | null> {
  const token = getCookie(event, COOKIE_NAME)

  if (!token) {
    return null
  }

  const [result] = await useDb()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(
      eq(sessions.tokenHash, hashSessionToken(token)),
      gt(sessions.expiresAt, new Date()),
    ))
    .limit(1)

  return result ?? null
}

export async function deleteSession(event: H3Event) {
  const token = getCookie(event, COOKIE_NAME)

  if (token) {
    await useDb()
      .delete(sessions)
      .where(eq(sessions.tokenHash, hashSessionToken(token)))
  }

  deleteCookie(event, COOKIE_NAME, { path: '/' })
}
