import { deleteCustomerSession } from '../../utils/customer-session'

export default defineEventHandler(async (event) => {
  await deleteCustomerSession(event)
  return { ok: true }
})
