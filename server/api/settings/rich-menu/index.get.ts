import {
  getOrCreateStoreRichMenu,
  isStoreLineActive,
  toPublicRichMenuSettings,
} from '../../../utils/rich-menu-settings'
import { requireSessionStore } from '../../../utils/store'

export default defineEventHandler(async (event) => {
  const { store } = await requireSessionStore(event)
  const row = await getOrCreateStoreRichMenu(store)
  const lineActive = await isStoreLineActive(store.id)
  return toPublicRichMenuSettings(store, row, lineActive)
})
