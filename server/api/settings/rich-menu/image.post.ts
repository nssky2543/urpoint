import {
  isStoreLineActive,
  toPublicRichMenuSettings,
  uploadStoreRichMenuCustomImage,
} from '../../../utils/rich-menu-settings'
import { requireSessionStore } from '../../../utils/store'

export default defineEventHandler(async (event) => {
  const { store } = await requireSessionStore(event)
  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file' && part.data?.length)
    ?? parts?.find(part => Boolean(part.filename) && part.data?.length)

  if (!file?.data?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'กรุณาเลือกไฟล์รูป PNG หรือ JPEG',
    })
  }

  const updated = await uploadStoreRichMenuCustomImage(store, {
    data: Buffer.from(file.data),
    contentType: file.type,
    filename: file.filename,
  })
  const lineActive = await isStoreLineActive(store.id)
  return toPublicRichMenuSettings(store, updated, lineActive)
})
