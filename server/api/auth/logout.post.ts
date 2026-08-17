import { deleteSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await deleteSession(event)
  setResponseStatus(event, 204)
  return null
})
