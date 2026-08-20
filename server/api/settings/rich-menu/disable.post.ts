import {
  disableStoreRichMenu,
  isStoreLineActive,
  toPublicRichMenuSettings,
} from '../../../utils/rich-menu-settings'
import { requireSessionStore } from '../../../utils/store'

export default defineEventHandler(async (event) => {
  const { store } = await requireSessionStore(event)
  const updated = await disableStoreRichMenu(store)
  const lineActive = await isStoreLineActive(store.id)
  return toPublicRichMenuSettings(store, updated, lineActive)
})
