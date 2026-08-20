import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import {
  assertRichMenuReadyToPublish,
  defaultRichMenuSlots,
  isRichMenuLayout,
  isRichMenuThemeId,
  normalizeRichMenuSlots,
  RICH_MENU_LAYOUTS,
  richMenuCanvasSizeHint,
  richMenuLayoutLabel,
  type RichMenuLayout,
  type RichMenuSlot,
  type RichMenuThemeId,
} from '../../shared/utils/rich-menu'
import { RICH_MENU_THEME_CATALOG } from '../../shared/utils/rich-menu-art'
import { buildRichMenuGallery } from '../../shared/utils/rich-menu-gallery'
import {
  photoTemplateForLayout,
  RICH_MENU_PHOTO_TEMPLATES,
} from '../../shared/utils/rich-menu-templates'
import { useDb } from '../database/client'
import { storeRichMenus, storeLineConnections } from '../database/schema'
import {
  buildLineRichMenuObject,
  cancelDefaultRichMenu,
  createRichMenu,
  deleteRichMenu,
  getAppBaseUrl,
  setDefaultRichMenu,
  uploadRichMenuImage,
  validateRichMenu,
} from './line'
import { decryptSecret } from './line-crypto'
import { deleteObject, putObject } from './object-storage'
import { renderRichMenuPng } from './rich-menu-image'
import type { SessionStore } from './store'

export async function getOrCreateStoreRichMenu(store: SessionStore) {
  const db = useDb()
  const [existing] = await db
    .select()
    .from(storeRichMenus)
    .where(eq(storeRichMenus.storeId, store.id))
    .limit(1)

  if (existing) {
    return existing
  }

  const memberUrl = `${getAppBaseUrl()}/m/${store.slug}`
  const slots = defaultRichMenuSlots({
    layout: 'six',
    memberUrl,
    phone: store.phone,
  })

  const [created] = await db
    .insert(storeRichMenus)
    .values({
      storeId: store.id,
      name: `เมนู${store.name}`.slice(0, 80),
      chatBarText: 'เมนู',
      layout: 'six',
      themeId: 'ink',
      slots,
      enabled: false,
    })
    .returning()

  return created!
}

export function toPublicRichMenuSettings(
  store: SessionStore,
  row: typeof storeRichMenus.$inferSelect,
  lineActive: boolean,
) {
  const memberUrl = `${getAppBaseUrl()}/m/${store.slug}`
  const layout = isRichMenuLayout(row.layout) ? row.layout : 'six'
  const themeId = isRichMenuThemeId(row.themeId) ? row.themeId : 'ink'
  const slots = normalizeRichMenuSlots(layout, row.slots)

  return {
    lineActive,
    suggested: {
      memberUrl,
      pointsUrl: memberUrl,
      promotionUrl: `${memberUrl}/promotion`,
      rewardsUrl: `${memberUrl}/rewards`,
      contactUri: store.phone
        ? `tel:${store.phone.replace(/[^\d+]/g, '')}`
        : memberUrl,
    },
    gallery: buildRichMenuGallery(),
    themes: RICH_MENU_THEME_CATALOG.map(theme => ({
      id: theme.id,
      label: theme.label,
      vibe: theme.vibe,
      assetKey: theme.assetKey,
      thumbPath: theme.thumbPath,
    })),
    templates: RICH_MENU_PHOTO_TEMPLATES.map(template => ({
      id: template.id,
      label: template.label,
      vibe: template.vibe,
      layout: template.layout,
      imagePath: template.imagePath,
      thumbPath: template.thumbPath,
      artHasLabels: template.artHasLabels,
    })),
    activeTemplate: (() => {
      const template = photoTemplateForLayout(layout)
      return template
        ? {
            id: template.id,
            label: template.label,
            vibe: template.vibe,
            layout: template.layout,
            imagePath: template.imagePath,
            thumbPath: template.thumbPath,
            artHasLabels: template.artHasLabels,
          }
        : null
    })(),
    layouts: RICH_MENU_LAYOUTS.map(id => ({
      id,
      label: richMenuLayoutLabel(id),
      sizeLabel: richMenuCanvasSizeHint(id),
    })),
    storeName: store.name,
    customImage: {
      present: Boolean(row.customImageKey),
      updatedAt: row.customImageUpdatedAt?.toISOString() ?? null,
      previewUrl: row.customImageKey
        ? `/api/settings/rich-menu/image?t=${row.customImageUpdatedAt?.getTime() ?? 0}`
        : null,
    },
    menu: {
      enabled: row.enabled,
      name: row.name,
      chatBarText: row.chatBarText,
      layout,
      themeId,
      slots,
      lineRichMenuId: row.lineRichMenuId,
      draftUpdatedAt: row.draftUpdatedAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      lastPublishError: row.lastPublishError,
    },
  }
}

export async function updateStoreRichMenuDraft(
  store: SessionStore,
  body: Record<string, unknown>,
) {
  const current = await getOrCreateStoreRichMenu(store)
  const layout = isRichMenuLayout(body.layout) ? body.layout : current.layout
  const themeId = isRichMenuThemeId(body.themeId) ? body.themeId : current.themeId
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : current.name
  const chatBarText = typeof body.chatBarText === 'string'
    ? body.chatBarText.trim().slice(0, 14)
    : current.chatBarText
  const slots = normalizeRichMenuSlots(layout as RichMenuLayout, body.slots ?? current.slots)
  const enabled = typeof body.enabled === 'boolean' ? body.enabled : current.enabled

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'กรุณาใส่ชื่อเมนู' })
  }
  if (!chatBarText) {
    throw createError({ statusCode: 400, statusMessage: 'กรุณาใส่ข้อความบนแถบแชท' })
  }

  const clearCustomImage = body.clearCustomImage === true
  if (clearCustomImage && current.customImageKey) {
    await deleteObject(current.customImageKey).catch(() => undefined)
  }

  const now = new Date()
  const [updated] = await useDb()
    .update(storeRichMenus)
    .set({
      enabled,
      name,
      chatBarText,
      layout: layout as RichMenuLayout,
      themeId: themeId as RichMenuThemeId,
      slots,
      ...(clearCustomImage
        ? {
            customImageKey: null,
            customImageUpdatedAt: null,
          }
        : {}),
      draftUpdatedAt: now,
      updatedAt: now,
      lastPublishError: null,
    })
    .where(eq(storeRichMenus.storeId, store.id))
    .returning()

  return updated!
}

export async function requireActiveMessagingToken(storeId: string) {
  const [row] = await useDb()
    .select()
    .from(storeLineConnections)
    .where(eq(storeLineConnections.storeId, storeId))
    .limit(1)

  if (!row?.isActive || !row.accessTokenEnc) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ต้องเชื่อมต่อ LINE OA ให้เสร็จก่อนจึงจะส่งเมนูขึ้น LINE ได้',
    })
  }

  return {
    connection: row,
    accessToken: decryptSecret(row.accessTokenEnc),
  }
}

export async function publishStoreRichMenu(store: SessionStore) {
  const draft = await getOrCreateStoreRichMenu(store)
  const slots = assertRichMenuReadyToPublish({
    name: draft.name,
    chatBarText: draft.chatBarText,
    layout: draft.layout as RichMenuLayout,
    slots: draft.slots as RichMenuSlot[],
  })

  const { accessToken } = await requireActiveMessagingToken(store.id)
  const richMenu = buildLineRichMenuObject({
    name: draft.name,
    chatBarText: draft.chatBarText,
    layout: draft.layout as RichMenuLayout,
    slots,
  })

  try {
    const image = await renderRichMenuPng({
      layout: draft.layout as RichMenuLayout,
      themeId: (isRichMenuThemeId(draft.themeId) ? draft.themeId : 'ink'),
      slots,
      storeName: store.name,
      customImageKey: draft.customImageKey,
    })

    await validateRichMenu(accessToken, richMenu)
    const created = await createRichMenu(accessToken, richMenu)
    await uploadRichMenuImage(accessToken, created.richMenuId, image.buffer, image.contentType)
    await setDefaultRichMenu(accessToken, created.richMenuId)

    const previousId = draft.lineRichMenuId
    if (previousId && previousId !== created.richMenuId) {
      await deleteRichMenu(accessToken, previousId).catch(() => undefined)
    }

    const now = new Date()
    const [updated] = await useDb()
      .update(storeRichMenus)
      .set({
        enabled: true,
        slots,
        lineRichMenuId: created.richMenuId,
        publishedAt: now,
        lastPublishError: null,
        updatedAt: now,
      })
      .where(eq(storeRichMenus.storeId, store.id))
      .returning()

    return updated!
  }
  catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'ส่ง Rich Menu ขึ้น LINE ไม่สำเร็จ'

    await useDb()
      .update(storeRichMenus)
      .set({
        lastPublishError: message,
        updatedAt: new Date(),
      })
      .where(eq(storeRichMenus.storeId, store.id))

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 400,
      statusMessage: message,
    })
  }
}

export async function disableStoreRichMenu(store: SessionStore) {
  const draft = await getOrCreateStoreRichMenu(store)
  const { accessToken } = await requireActiveMessagingToken(store.id)

  await cancelDefaultRichMenu(accessToken)
  if (draft.lineRichMenuId) {
    await deleteRichMenu(accessToken, draft.lineRichMenuId).catch(() => undefined)
  }

  const [updated] = await useDb()
    .update(storeRichMenus)
    .set({
      enabled: false,
      lineRichMenuId: null,
      lastPublishError: null,
      updatedAt: new Date(),
    })
    .where(eq(storeRichMenus.storeId, store.id))
    .returning()

  return updated!
}

export async function isStoreLineActive(storeId: string) {
  const [row] = await useDb()
    .select({ isActive: storeLineConnections.isActive })
    .from(storeLineConnections)
    .where(eq(storeLineConnections.storeId, storeId))
    .limit(1)

  return Boolean(row?.isActive)
}

const MAX_CUSTOM_IMAGE_BYTES = 8 * 1024 * 1024

function extensionForContentType(contentType: string) {
  if (contentType === 'image/png') return 'png'
  return 'jpg'
}

function normalizeUploadContentType(
  value: string | undefined | null,
  filename?: string | null,
) {
  const raw = (value || '').split(';')[0]?.trim().toLowerCase() || ''
  if (raw === 'image/jpg') return 'image/jpeg'
  if (raw === 'image/png' || raw === 'image/jpeg') return raw

  const name = (filename || '').toLowerCase()
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  return raw
}

export async function uploadStoreRichMenuCustomImage(
  store: SessionStore,
  input: {
    data: Buffer
    contentType?: string | null
    filename?: string | null
  },
) {
  const contentType = normalizeUploadContentType(input.contentType, input.filename)
  const resolvedType = contentType === 'image/png' ? 'image/png' : contentType === 'image/jpeg' ? 'image/jpeg' : null
  if (!resolvedType) {
    throw createError({
      statusCode: 400,
      statusMessage: 'อัปโหลดได้เฉพาะไฟล์ PNG หรือ JPEG',
    })
  }
  if (!input.data.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ไม่พบไฟล์รูป',
    })
  }
  if (input.data.byteLength > MAX_CUSTOM_IMAGE_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ไฟล์ใหญ่เกิน 8MB กรุณาลดขนาดแล้วลองใหม่',
    })
  }

  const draft = await getOrCreateStoreRichMenu(store)
  const key = `rich-menu/${store.id}/${randomUUID()}.${extensionForContentType(resolvedType)}`

  await putObject({
    key,
    body: input.data,
    contentType: resolvedType,
  })

  if (draft.customImageKey && draft.customImageKey !== key) {
    await deleteObject(draft.customImageKey).catch(() => undefined)
  }

  const now = new Date()
  const [updated] = await useDb()
    .update(storeRichMenus)
    .set({
      customImageKey: key,
      customImageUpdatedAt: now,
      draftUpdatedAt: now,
      updatedAt: now,
      lastPublishError: null,
    })
    .where(eq(storeRichMenus.storeId, store.id))
    .returning()

  return updated!
}

export async function deleteStoreRichMenuCustomImage(store: SessionStore) {
  const draft = await getOrCreateStoreRichMenu(store)
  if (draft.customImageKey) {
    await deleteObject(draft.customImageKey).catch(() => undefined)
  }

  const now = new Date()
  const [updated] = await useDb()
    .update(storeRichMenus)
    .set({
      customImageKey: null,
      customImageUpdatedAt: null,
      draftUpdatedAt: now,
      updatedAt: now,
      lastPublishError: null,
    })
    .where(eq(storeRichMenus.storeId, store.id))
    .returning()

  return updated!
}
