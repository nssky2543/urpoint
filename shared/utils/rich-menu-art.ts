import type { RichMenuLayout, RichMenuSlot, RichMenuThemeId } from './rich-menu'
import { richMenuBoundsForLayout, richMenuCanvasSize, richMenuThemeColors } from './rich-menu'

/** Registry for built-in theme art — future admin uploads can override `assetKey`. */
export type RichMenuThemeCatalogItem = {
  id: RichMenuThemeId
  label: string
  vibe: string
  /** Built-in key today; later may point at uploaded object storage. */
  assetKey: `builtin:${RichMenuThemeId}`
  /** Default preview / publish artwork served from public/. Admin can replace later. */
  thumbPath: string
  editableByAdmin: true
}

export const RICH_MENU_THEME_CATALOG: RichMenuThemeCatalogItem[] = [
  {
    id: 'ink',
    label: 'Ink Orange',
    vibe: 'บาร์เบอร์กลางคืน · ส้มอุ่นบนพื้นถ่าน',
    assetKey: 'builtin:ink',
    thumbPath: '/images/rich-menu/ink.png',
    editableByAdmin: true,
  },
  {
    id: 'amber',
    label: 'Amber Shop',
    vibe: 'ร้านบริการอบอุ่น · โทนไม้และทองแดง',
    assetKey: 'builtin:amber',
    thumbPath: '/images/rich-menu/amber.png',
    editableByAdmin: true,
  },
  {
    id: 'slate',
    label: 'Slate Night',
    vibe: 'คลินิก/สปาสมัยใหม่ · น้ำเงินเย็น',
    assetKey: 'builtin:slate',
    thumbPath: '/images/rich-menu/slate.png',
    editableByAdmin: true,
  },
  {
    id: 'forest',
    label: 'Forest Soft',
    vibe: 'ร้านกรีน · นุ่ม สบายตา',
    assetKey: 'builtin:forest',
    thumbPath: '/images/rich-menu/forest.png',
    editableByAdmin: true,
  },
]

type SlotIconId = 'home' | 'points' | 'contact' | 'promo' | 'booking' | 'about'

const SLOT_ICONS: SlotIconId[] = ['home', 'points', 'contact', 'promo', 'booking', 'about']

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function wrapLabel(label: string, maxChars: number) {
  const text = label.trim() || 'เมนู'
  if (text.length <= maxChars) return [text]
  const mid = Math.ceil(text.length / 2)
  return [text.slice(0, mid), text.slice(mid)].filter(Boolean)
}

function iconGlyph(id: SlotIconId, cx: number, cy: number, size: number, color: string) {
  const s = size / 24
  const x = cx - size / 2
  const y = cy - size / 2
  const paths: Record<SlotIconId, string> = {
    home: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z',
    points: 'M12 3.2 14.4 9h6.1l-4.9 3.7 1.9 5.9L12 15.4 6.5 18.6l1.9-5.9L3.5 9h6.1z',
    contact: 'M7 4h3l1.2 3.2-1.8 1.8a11 11 0 0 0 5.6 5.6l1.8-1.8L20 14v3a2 2 0 0 1-2.2 2A15 15 0 0 1 4 6.2 2 2 0 0 1 6 4z',
    promo: 'M6 8.5v9.2a1.2 1.2 0 0 0 1.8 1l3.7-2.2 3.7 2.2a1.2 1.2 0 0 0 1.8-1V8.5A3.5 3.5 0 0 0 12 5a3.5 3.5 0 0 0-6 3.5z',
    booking: 'M7 4h2v2h6V4h2v2h1.5A1.5 1.5 0 0 1 20 7.5v11A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H7zm-1 6h12v8H6zm3 2.5h2.5V15H9zm4.5 0H16V15h-2.5z',
    about: 'M12 3.5A8.5 8.5 0 1 1 3.5 12 8.5 8.5 0 0 1 12 3.5zm0 3.2a1.2 1.2 0 1 0 1.2 1.2A1.2 1.2 0 0 0 12 6.7zm-1.4 3.6h2.8v7.1h-2.8z',
  }

  return `
    <g transform="translate(${x} ${y}) scale(${s})">
      <circle cx="12" cy="12" r="11" fill="${color}" fill-opacity="0.16"/>
      <path d="${paths[id]}" fill="${color}"/>
    </g>
  `
}

function themeDecor(themeId: RichMenuThemeId, width: number, height: number, accent: string, muted: string) {
  if (themeId === 'amber') {
    return `
      <circle cx="${width * 0.12}" cy="${height * 0.18}" r="${width * 0.16}" fill="${accent}" fill-opacity="0.12"/>
      <circle cx="${width * 0.88}" cy="${height * 0.78}" r="${width * 0.2}" fill="${muted}" fill-opacity="0.12"/>
      <path d="M${width * 0.72} ${height * 0.08}c40 60 90 70 140 20" fill="none" stroke="${accent}" stroke-opacity="0.25" stroke-width="18" stroke-linecap="round"/>
    `
  }
  if (themeId === 'slate') {
    return `
      <rect x="${width * 0.7}" y="${-height * 0.05}" width="${width * 0.4}" height="${height * 0.35}" rx="80" fill="${accent}" fill-opacity="0.1" transform="rotate(18 ${width * 0.9} ${height * 0.1})"/>
      <circle cx="${width * 0.1}" cy="${height * 0.85}" r="${width * 0.14}" fill="${accent}" fill-opacity="0.12"/>
    `
  }
  if (themeId === 'forest') {
    return `
      <ellipse cx="${width * 0.18}" cy="${height * 0.22}" rx="${width * 0.18}" ry="${height * 0.12}" fill="${accent}" fill-opacity="0.14"/>
      <ellipse cx="${width * 0.82}" cy="${height * 0.7}" rx="${width * 0.2}" ry="${height * 0.14}" fill="${muted}" fill-opacity="0.14"/>
      <path d="M${width * 0.55} ${height * 0.05} Q ${width * 0.7} ${height * 0.25} ${width * 0.95} ${height * 0.12}" fill="none" stroke="${accent}" stroke-opacity="0.22" stroke-width="16"/>
    `
  }
  // ink — barber night: soft blade arcs + warm glow
  return `
    <circle cx="${width * 0.9}" cy="${height * 0.12}" r="${width * 0.18}" fill="${accent}" fill-opacity="0.16"/>
    <circle cx="${width * 0.08}" cy="${height * 0.88}" r="${width * 0.14}" fill="${accent}" fill-opacity="0.1"/>
    <path d="M${width * 0.62} ${height * 0.04}c30 90 -20 150 -90 190" fill="none" stroke="${accent}" stroke-opacity="0.22" stroke-width="20" stroke-linecap="round"/>
    <path d="M${width * 0.68} ${height * 0.02}c40 100 -10 170 -100 220" fill="none" stroke="${muted}" stroke-opacity="0.18" stroke-width="10" stroke-linecap="round"/>
  `
}

/**
 * Builds the full-bleed SVG used for LINE upload and live admin preview.
 * Style target: polished illustrated loyalty menu (UrPoint shop themes — not PointUp clones).
 */
export function buildRichMenuSvg(input: {
  layout: RichMenuLayout
  themeId: RichMenuThemeId
  slots: RichMenuSlot[]
  storeName?: string
  /** Override background later when admin uploads custom art. */
  backgroundHref?: string | null
}) {
  const size = richMenuCanvasSize(input.layout)
  const bounds = richMenuBoundsForLayout(input.layout)
  const colors = richMenuThemeColors(input.themeId)
  void input.storeName

  const panels = bounds.map((box, index) => {
    const slot = input.slots[index]
    const showLabel = slot?.showLabel !== false
    const label = escapeXml((slot?.label || `ช่อง ${index + 1}`).slice(0, 20))
    const maxChars = box.width > 1200 ? 14 : box.width > 800 ? 10 : 7
    const lines = showLabel ? wrapLabel(label, maxChars) : []
    const iconId = SLOT_ICONS[index % SLOT_ICONS.length]!
    const pad = Math.max(22, Math.round(Math.min(box.width, box.height) * 0.04))
    const innerX = box.x + pad
    const innerY = box.y + pad
    const innerW = box.width - pad * 2
    const innerH = box.height - pad * 2
    const iconSize = Math.min(148, Math.round(Math.min(innerW, innerH) * (showLabel ? 0.28 : 0.36)))
    const iconCy = showLabel
      ? innerY + innerH * 0.38
      : innerY + innerH * 0.5
    const fontSize = box.width > 1200 ? 64 : box.width > 900 ? 50 : 40
    const lineHeight = Math.round(fontSize * 1.18)
    const textBlockH = lines.length * lineHeight
    const textStartY = innerY + innerH * 0.72 - textBlockH / 2 + fontSize * 0.35

    const textNodes = lines.map((line, lineIndex) => `
      <text
        x="${box.x + box.width / 2}"
        y="${textStartY + lineIndex * lineHeight}"
        fill="${colors.text}"
        font-size="${fontSize}"
        font-family="Sarabun, Noto Sans Thai, Segoe UI, sans-serif"
        font-weight="700"
        text-anchor="middle"
      >${escapeXml(line)}</text>
    `).join('')

    return `
      <g>
        <rect
          x="${innerX}"
          y="${innerY}"
          width="${innerW}"
          height="${innerH}"
          rx="${Math.min(48, Math.round(innerW * 0.06))}"
          fill="url(#panelGrad)"
          stroke="${colors.line}"
          stroke-opacity="0.85"
          stroke-width="3"
        />
        <rect
          x="${innerX}"
          y="${innerY}"
          width="${innerW}"
          height="${Math.min(innerH * 0.45, 220)}"
          rx="${Math.min(48, Math.round(innerW * 0.06))}"
          fill="url(#panelSheen)"
        />
        ${iconGlyph(iconId, box.x + box.width / 2, iconCy, iconSize, colors.accent)}
        ${textNodes}
      </g>
    `
  }).join('')

  const bgImage = input.backgroundHref
    ? `<image href="${escapeXml(input.backgroundHref)}" x="0" y="0" width="${size.width}" height="${size.height}" preserveAspectRatio="xMidYMid slice"/>`
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colors.background}"/>
      <stop offset="55%" stop-color="${colors.panel}"/>
      <stop offset="100%" stop-color="${colors.background}"/>
    </linearGradient>
    <linearGradient id="panelGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${colors.panel}" stop-opacity="0.96"/>
      <stop offset="100%" stop-color="${colors.background}" stop-opacity="0.88"/>
    </linearGradient>
    <linearGradient id="panelSheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${colors.text}" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="${colors.text}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  ${bgImage}
  ${themeDecor(input.themeId, size.width, size.height, colors.accent, colors.muted)}
  ${panels}
</svg>`
}
