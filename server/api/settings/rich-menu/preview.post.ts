import {
  isRichMenuLayout,
  isRichMenuThemeId,
  normalizeRichMenuSlots,
  type RichMenuLayout,
  type RichMenuThemeId,
} from '../../../../shared/utils/rich-menu'
import { renderRichMenuPng } from '../../../utils/rich-menu-image'
import { getOrCreateStoreRichMenu } from '../../../utils/rich-menu-settings'
import { requireSessionStore } from '../../../utils/store'

export default defineEventHandler(async (event) => {
  const { store } = await requireSessionStore(event)
  const body = await readBody<Record<string, unknown>>(event)
  const draft = await getOrCreateStoreRichMenu(store)

  const layout: RichMenuLayout = isRichMenuLayout(body?.layout) ? body.layout : 'six'
  const themeId: RichMenuThemeId = isRichMenuThemeId(body?.themeId) ? body.themeId : 'ink'
  const slots = normalizeRichMenuSlots(layout, body?.slots)

  const image = await renderRichMenuPng({
    layout,
    themeId,
    slots,
    storeName: store.name,
    customImageKey: body?.useCustomImage === false ? null : draft.customImageKey,
  })

  setHeader(event, 'Content-Type', image.contentType)
  setHeader(event, 'Cache-Control', 'no-store')
  return new Uint8Array(image.buffer)
})
