import { getSessionUser } from '../../utils/session'
import { requireSessionStore } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'กรุณาเข้าสู่ระบบ',
    })
  }

  const { store } = await requireSessionStore(event)

  return {
    user,
    store: {
      onboarded: Boolean(store.onboardedAt),
    },
  }
})
