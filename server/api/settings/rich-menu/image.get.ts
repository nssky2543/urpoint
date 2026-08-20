import { getObjectBuffer } from '../../../utils/object-storage'
import { getOrCreateStoreRichMenu } from '../../../utils/rich-menu-settings'
import { requireSessionStore } from '../../../utils/store'

export default defineEventHandler(async (event) => {
  const { store } = await requireSessionStore(event)
  const draft = await getOrCreateStoreRichMenu(store)

  if (!draft.customImageKey) {
    throw createError({
      statusCode: 404,
      statusMessage: 'ยังไม่มีรูปที่อัปโหลด',
    })
  }

  const stored = await getObjectBuffer(draft.customImageKey)
  setHeader(event, 'Content-Type', stored.contentType)
  setHeader(event, 'Cache-Control', 'private, no-store')
  return new Uint8Array(stored.buffer)
})
