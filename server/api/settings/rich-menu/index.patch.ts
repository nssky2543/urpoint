import {
  isStoreLineActive,
  toPublicRichMenuSettings,
  updateStoreRichMenuDraft,
} from '../../../utils/rich-menu-settings'
import { requireSessionStore } from '../../../utils/store'

export default defineEventHandler(async (event) => {
  const { store } = await requireSessionStore(event)
  const body = await readBody<Record<string, unknown>>(event)
  const updated = await updateStoreRichMenuDraft(store, body || {})
  const lineActive = await isStoreLineActive(store.id)
  return toPublicRichMenuSettings(store, updated, lineActive)
})
