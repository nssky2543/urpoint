import { getCustomerSession } from '../../utils/customer-session'

export default defineEventHandler(async (event) => {
  const slug = typeof getQuery(event).slug === 'string'
    ? String(getQuery(event).slug).trim()
    : ''

  const session = await getCustomerSession(event, slug || undefined)

  if (!session) {
    return { customer: null }
  }

  return session
})
