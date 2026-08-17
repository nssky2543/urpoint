export const BUSINESS_TYPES = ['barber', 'spa'] as const

export type BusinessType = (typeof BUSINESS_TYPES)[number]

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  barber: 'ร้านตัดผม',
  spa: 'ร้านสปา',
}

export const BUSINESS_TYPE_DESCRIPTIONS: Record<BusinessType, string> = {
  barber: 'เหมาะกับร้านที่มีช่าง เปิดจองช่างได้ตั้งแต่เริ่มต้น',
  spa: 'เน้นลูกค้าและคอร์ส ไม่เปิดจองช่างเป็นค่าเริ่มต้น',
}

export const BUSINESS_TYPE_ICONS = {
  barber: 'store',
  spa: 'spark',
} as const satisfies Record<BusinessType, 'store' | 'spark'>

export function isBusinessType(value: unknown): value is BusinessType {
  return typeof value === 'string'
    && (BUSINESS_TYPES as readonly string[]).includes(value)
}

export function defaultStaffBookingEnabled(businessType: BusinessType) {
  return businessType === 'barber'
}
