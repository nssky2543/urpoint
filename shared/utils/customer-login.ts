export type CustomerLoginMethodsInput = {
  lineEnabled: boolean
  otpEnabled: boolean
  lineActive: boolean
}

export function canEnableLineLogin(lineActive: boolean) {
  return lineActive === true
}

export function effectiveCustomerLoginMethods(input: CustomerLoginMethodsInput) {
  return {
    lineEnabled: input.lineEnabled && input.lineActive,
    otpEnabled: input.otpEnabled,
  }
}

export function assertLoginMethods(input: CustomerLoginMethodsInput) {
  if (input.lineEnabled && !input.lineActive) {
    throw new Error('ต้องเชื่อมต่อ LINE OA ให้เสร็จก่อนจึงจะเปิดเข้าสู่ระบบด้วย LINE ได้')
  }

  if (!input.lineEnabled && !input.otpEnabled) {
    throw new Error('ต้องเปิดวิธีเข้าสู่ระบบอย่างน้อย 1 วิธี')
  }
}
