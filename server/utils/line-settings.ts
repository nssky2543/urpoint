import { eq } from 'drizzle-orm'
import { useDb } from '../database/client'
import { storeLineConnections } from '../database/schema'
import {
  buildLineUrls,
  computeConnectionCompleteness,
} from './line'
import { decryptSecret, maskSecret } from './line-crypto'
import type { SessionStore } from './store'

export type LineConnectionRow = typeof storeLineConnections.$inferSelect

export async function getStoreLineConnection(storeId: string) {
  const [row] = await useDb()
    .select()
    .from(storeLineConnections)
    .where(eq(storeLineConnections.storeId, storeId))
    .limit(1)

  return row ?? null
}

export function toPublicLineSettings(store: SessionStore, row: LineConnectionRow) {
  const urls = buildLineUrls({
    storeSlug: store.slug,
    webhookKey: row.webhookKey,
    liffId: row.liffId,
  })

  const completeness = computeConnectionCompleteness({
    loginChannelId: row.loginChannelId,
    hasLoginSecret: Boolean(row.loginChannelSecretEnc),
    loginVerifiedAt: row.loginVerifiedAt,
    liffId: row.liffId,
    liffVerifiedAt: row.liffVerifiedAt,
    messagingChannelId: row.messagingChannelId,
    hasMessagingSecret: Boolean(row.messagingChannelSecretEnc),
    hasAccessToken: Boolean(row.accessTokenEnc),
    botVerifiedAt: row.botVerifiedAt,
    webhookVerifiedAt: row.webhookVerifiedAt,
  })

  let loginChannelSecretMasked = ''
  let messagingChannelSecretMasked = ''
  let accessTokenMasked = ''

  if (row.loginChannelSecretEnc) {
    try {
      loginChannelSecretMasked = maskSecret(decryptSecret(row.loginChannelSecretEnc))
    } catch {
      loginChannelSecretMasked = '****'
    }
  }

  if (row.messagingChannelSecretEnc) {
    try {
      messagingChannelSecretMasked = maskSecret(decryptSecret(row.messagingChannelSecretEnc))
    } catch {
      messagingChannelSecretMasked = '****'
    }
  }

  if (row.accessTokenEnc) {
    try {
      accessTokenMasked = maskSecret(decryptSecret(row.accessTokenEnc))
    } catch {
      accessTokenMasked = '****'
    }
  }

  const statusLabel = !completeness.complete
    ? 'ยังตั้งค่าไม่ครบ'
    : row.isActive
      ? 'เชื่อมต่อแล้ว · ใช้งานอยู่'
      : 'ตั้งค่าครบ · ปิดใช้งานอยู่'

  return {
    store: {
      id: store.id,
      name: store.name,
      slug: store.slug,
    },
    loginChannelId: row.loginChannelId ?? '',
    loginChannelSecretMasked,
    messagingChannelId: row.messagingChannelId ?? '',
    messagingChannelSecretMasked,
    accessTokenMasked,
    liffId: row.liffId ?? '',
    setupStep: row.setupStep,
    isActive: row.isActive,
    botUserId: row.botUserId,
    botDisplayName: row.botDisplayName,
    botBasicId: row.botBasicId,
    loginVerifiedAt: row.loginVerifiedAt?.toISOString() ?? null,
    liffVerifiedAt: row.liffVerifiedAt?.toISOString() ?? null,
    botVerifiedAt: row.botVerifiedAt?.toISOString() ?? null,
    webhookVerifiedAt: row.webhookVerifiedAt?.toISOString() ?? null,
    connectedAt: row.connectedAt?.toISOString() ?? null,
    urls,
    completeness,
    statusLabel,
  }
}
