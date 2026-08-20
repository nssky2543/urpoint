import type { RichMenuLayout, RichMenuSlot } from './rich-menu'
import { normalizeRichMenuSlots } from './rich-menu'

/**
 * Photo / illustrated templates that replace generated SVG art for a layout.
 * Start with one template; admin can add more later.
 */
export type RichMenuPhotoTemplate = {
  id: string
  label: string
  vibe: string
  layout: RichMenuLayout
  /** Absolute public URL path for LINE publish source. */
  imagePath: string
  thumbPath: string
  /** Art already includes Thai copy — do not draw SVG labels on top. */
  artHasLabels: true
  defaultLabels: string[]
}

export const RICH_MENU_PHOTO_TEMPLATES: RichMenuPhotoTemplate[] = [
  {
    id: 'barber-promo-large-left',
    label: 'Barber Promo',
    vibe: 'โปรโมชันบาร์เบอร์ · ซ้ายใหญ่',
    layout: 'large_left',
    imagePath: '/images/rich-menu/templates/barber-promo-large-left.jpg',
    thumbPath: '/images/rich-menu/templates/barber-promo-large-left.thumb.jpg',
    artHasLabels: true,
    defaultLabels: ['จองคิว', 'สะสมแต้ม', 'แลกของรางวัล'],
  },
]

export function photoTemplateForLayout(layout: RichMenuLayout) {
  return RICH_MENU_PHOTO_TEMPLATES.find(template => template.layout === layout) ?? null
}

export function photoTemplateById(id: string | null | undefined) {
  if (!id) return null
  return RICH_MENU_PHOTO_TEMPLATES.find(template => template.id === id) ?? null
}

export function defaultSlotsForPhotoTemplate(input: {
  template: RichMenuPhotoTemplate
  memberUrl: string
  phone?: string | null
}): RichMenuSlot[] {
  const memberUrl = input.memberUrl.replace(/\/+$/, '')
  const pointsUrl = memberUrl
  const contactUri = input.phone
    ? `tel:${input.phone.replace(/[^\d+]/g, '')}`
    : memberUrl

  const uris = [
    `${memberUrl}/promotion`,
    pointsUrl,
    `${memberUrl}/rewards`,
    memberUrl,
    memberUrl,
    contactUri,
  ]
  const slots = input.template.defaultLabels.map((label, index) => ({
    label,
    uri: uris[index] || memberUrl,
    showLabel: false,
  }))

  return normalizeRichMenuSlots(input.template.layout, slots)
}
