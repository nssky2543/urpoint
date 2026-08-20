export const RICH_MENU_LAYOUTS = [
  'six',
  'three',
  'two',
  'four',
  'large_left',
  'large_right',
] as const

export type RichMenuLayout = typeof RICH_MENU_LAYOUTS[number]

export const RICH_MENU_THEMES = [
  'ink',
  'amber',
  'slate',
  'forest',
] as const

export type RichMenuThemeId = typeof RICH_MENU_THEMES[number]

export type RichMenuSlot = {
  label: string
  uri: string
  showLabel: boolean
}

export type RichMenuBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type RichMenuSize = {
  width: number
  height: number
}

export function isRichMenuLayout(value: unknown): value is RichMenuLayout {
  return typeof value === 'string' && (RICH_MENU_LAYOUTS as readonly string[]).includes(value)
}

export function isRichMenuThemeId(value: unknown): value is RichMenuThemeId {
  return typeof value === 'string' && (RICH_MENU_THEMES as readonly string[]).includes(value)
}

export function slotCountForLayout(layout: RichMenuLayout) {
  switch (layout) {
    case 'two':
      return 2
    case 'three':
      return 3
    case 'four':
      return 4
    case 'large_left':
    case 'large_right':
      return 3
    case 'six':
    default:
      return 6
  }
}

export function richMenuCanvasSize(layout: RichMenuLayout): RichMenuSize {
  if (layout === 'two' || layout === 'three') {
    return { width: 2500, height: 843 }
  }
  return { width: 2500, height: 1686 }
}

export function richMenuCanvasSizeLabel(layout: RichMenuLayout) {
  const size = richMenuCanvasSize(layout)
  return `${size.width} × ${size.height} px`
}

export function richMenuCanvasSizeHint(layout: RichMenuLayout) {
  const size = richMenuCanvasSize(layout)
  if (size.height === 843) {
    return `${size.width} × ${size.height} px · แบบเตี้ย (compact)`
  }
  return `${size.width} × ${size.height} px · แบบเต็มสูง`
}

export function richMenuBoundsForLayout(layout: RichMenuLayout): RichMenuBounds[] {
  const { width, height } = richMenuCanvasSize(layout)

  if (layout === 'two') {
    const half = Math.floor(width / 2)
    return [
      { x: 0, y: 0, width: half, height },
      { x: half, y: 0, width: width - half, height },
    ]
  }

  if (layout === 'three') {
    const w0 = 833
    const w1 = 834
    const w2 = 833
    return [
      { x: 0, y: 0, width: w0, height },
      { x: w0, y: 0, width: w1, height },
      { x: w0 + w1, y: 0, width: w2, height },
    ]
  }

  if (layout === 'four') {
    const halfW = Math.floor(width / 2)
    const halfH = Math.floor(height / 2)
    return [
      { x: 0, y: 0, width: halfW, height: halfH },
      { x: halfW, y: 0, width: width - halfW, height: halfH },
      { x: 0, y: halfH, width: halfW, height: height - halfH },
      { x: halfW, y: halfH, width: width - halfW, height: height - halfH },
    ]
  }

  if (layout === 'large_left') {
    const largeW = 1666
    const smallW = width - largeW
    const halfH = Math.floor(height / 2)
    return [
      { x: 0, y: 0, width: largeW, height },
      { x: largeW, y: 0, width: smallW, height: halfH },
      { x: largeW, y: halfH, width: smallW, height: height - halfH },
    ]
  }

  if (layout === 'large_right') {
    const smallW = 834
    const largeW = width - smallW
    const halfH = Math.floor(height / 2)
    return [
      { x: 0, y: 0, width: smallW, height: halfH },
      { x: 0, y: halfH, width: smallW, height: height - halfH },
      { x: smallW, y: 0, width: largeW, height },
    ]
  }

  // six
  const w0 = 833
  const w1 = 834
  const w2 = 833
  const halfH = Math.floor(height / 2)
  return [
    { x: 0, y: 0, width: w0, height: halfH },
    { x: w0, y: 0, width: w1, height: halfH },
    { x: w0 + w1, y: 0, width: w2, height: halfH },
    { x: 0, y: halfH, width: w0, height: height - halfH },
    { x: w0, y: halfH, width: w1, height: height - halfH },
    { x: w0 + w1, y: halfH, width: w2, height: height - halfH },
  ]
}

export function normalizeRichMenuSlots(
  layout: RichMenuLayout,
  slots: unknown,
): RichMenuSlot[] {
  const count = slotCountForLayout(layout)
  const source = Array.isArray(slots) ? slots : []
  const result: RichMenuSlot[] = []

  for (let i = 0; i < count; i += 1) {
    const item = source[i] as Partial<RichMenuSlot> | undefined
    result.push({
      label: typeof item?.label === 'string' ? item.label.trim().slice(0, 20) : '',
      uri: typeof item?.uri === 'string' ? item.uri.trim().slice(0, 1000) : '',
      showLabel: item?.showLabel !== false,
    })
  }

  return result
}

export function isValidRichMenuUri(uri: string) {
  const value = uri.trim()
  if (!value) {
    return false
  }
  if (value.startsWith('tel:') || value.startsWith('mailto:') || value.startsWith('line://')) {
    return value.length > 4
  }
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  }
  catch {
    return false
  }
}

export function assertRichMenuReadyToPublish(input: {
  name: string
  chatBarText: string
  layout: RichMenuLayout
  slots: RichMenuSlot[]
}) {
  if (!input.name.trim()) {
    throw new Error('กรุณาใส่ชื่อ Rich Menu')
  }
  if (!input.chatBarText.trim()) {
    throw new Error('กรุณาใส่ข้อความบนแถบแชท')
  }
  if (input.chatBarText.trim().length > 14) {
    throw new Error('ข้อความบนแถบแชทยาวได้ไม่เกิน 14 ตัวอักษร')
  }

  const slots = normalizeRichMenuSlots(input.layout, input.slots)
  for (const [index, slot] of slots.entries()) {
    if (!slot.label.trim()) {
      throw new Error(`กรุณาใส่ชื่อปุ่มช่องที่ ${index + 1}`)
    }
    if (!isValidRichMenuUri(slot.uri)) {
      throw new Error(`ลิงก์ช่องที่ ${index + 1} ไม่ถูกต้อง (ใช้ https หรือ tel:)`)
    }
  }

  return slots
}

export function defaultRichMenuSlots(input: {
  layout: RichMenuLayout
  memberUrl: string
  phone?: string | null
}): RichMenuSlot[] {
  const memberUrl = input.memberUrl.replace(/\/+$/, '')
  const contactUri = input.phone
    ? `tel:${input.phone.replace(/[^\d+]/g, '')}`
    : memberUrl

  if (input.layout === 'large_left') {
    return normalizeRichMenuSlots(input.layout, [
      { label: 'จองคิว', uri: `${memberUrl}/promotion`, showLabel: false },
      { label: 'สะสมแต้ม', uri: memberUrl, showLabel: false },
      { label: 'แลกของรางวัล', uri: `${memberUrl}/rewards`, showLabel: false },
    ])
  }

  const presets: RichMenuSlot[] = [
    { label: 'หน้าแรก', uri: memberUrl, showLabel: true },
    { label: 'พอยท์', uri: memberUrl, showLabel: true },
    { label: 'ติดต่อร้าน', uri: contactUri, showLabel: true },
    { label: 'โปรโมชัน', uri: `${memberUrl}/promotion`, showLabel: true },
    { label: 'จองคิว', uri: memberUrl, showLabel: true },
    { label: 'เกี่ยวกับเรา', uri: memberUrl, showLabel: true },
  ]

  return normalizeRichMenuSlots(input.layout, presets)
}

export function richMenuThemeColors(themeId: RichMenuThemeId) {
  switch (themeId) {
    case 'amber':
      return {
        background: '#1c1410',
        panel: '#2a1c14',
        accent: '#ff6b1a',
        text: '#fff6ee',
        muted: '#c9b2a3',
        line: '#4a3428',
      }
    case 'slate':
      return {
        background: '#0f1720',
        panel: '#182433',
        accent: '#7dd3fc',
        text: '#f8fafc',
        muted: '#94a3b8',
        line: '#334155',
      }
    case 'forest':
      return {
        background: '#0f1712',
        panel: '#16241b',
        accent: '#4ade80',
        text: '#f0fdf4',
        muted: '#86a897',
        line: '#274233',
      }
    case 'ink':
    default:
      return {
        background: '#0b0b0c',
        panel: '#17171a',
        accent: '#ff8a3d',
        text: '#ffffff',
        muted: '#a1a1aa',
        line: '#2f2f35',
      }
  }
}

export function richMenuLayoutLabel(layout: RichMenuLayout) {
  switch (layout) {
    case 'two':
      return '2 ช่อง'
    case 'three':
      return '3 ช่อง'
    case 'four':
      return '4 ช่อง'
    case 'large_left':
      return 'ซ้ายใหญ่'
    case 'large_right':
      return 'ขวาใหญ่'
    case 'six':
    default:
      return '6 ช่อง'
  }
}

export function richMenuThemeLabel(themeId: RichMenuThemeId) {
  switch (themeId) {
    case 'amber':
      return 'Amber Shop'
    case 'slate':
      return 'Slate Night'
    case 'forest':
      return 'Forest Soft'
    case 'ink':
    default:
      return 'Ink Orange'
  }
}
