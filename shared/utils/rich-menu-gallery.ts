import type { RichMenuLayout, RichMenuThemeId } from './rich-menu'
import { richMenuLayoutLabel, slotCountForLayout } from './rich-menu'
import { RICH_MENU_THEME_CATALOG } from './rich-menu-art'
import { RICH_MENU_PHOTO_TEMPLATES } from './rich-menu-templates'

export type RichMenuGalleryItem = {
  id: string
  label: string
  vibe: string
  /** e.g. "6 ช่อง" or "ซ้ายใหญ่ · 3 ช่อง" */
  meta: string
  thumbPath: string
  layout: RichMenuLayout
  themeId: RichMenuThemeId
  photoTemplateId?: string
  kind: 'photo' | 'theme'
}

function slotMeta(layout: RichMenuLayout) {
  const count = slotCountForLayout(layout)
  if (layout === 'large_left' || layout === 'large_right') {
    return `${richMenuLayoutLabel(layout)} · ${count} ช่อง`
  }
  return `${count} ช่อง`
}

/** Unified gallery for PointUp-style template picker. */
export function buildRichMenuGallery(): RichMenuGalleryItem[] {
  const photoItems: RichMenuGalleryItem[] = RICH_MENU_PHOTO_TEMPLATES.map(template => ({
    id: `photo:${template.id}`,
    label: template.label,
    vibe: template.vibe,
    meta: slotMeta(template.layout),
    thumbPath: template.thumbPath,
    layout: template.layout,
    themeId: 'ink',
    photoTemplateId: template.id,
    kind: 'photo',
  }))

  const themeItems: RichMenuGalleryItem[] = RICH_MENU_THEME_CATALOG.map(theme => ({
    id: `theme:${theme.id}:six`,
    label: theme.label,
    vibe: theme.vibe,
    meta: '6 ช่อง',
    thumbPath: theme.thumbPath,
    layout: 'six',
    themeId: theme.id,
    kind: 'theme',
  }))

  // Photo templates first (featured), then generated themes.
  return [...photoItems, ...themeItems]
}

export function resolveGallerySelection(input: {
  layout: RichMenuLayout
  themeId: RichMenuThemeId
}) {
  const gallery = buildRichMenuGallery()
  const photoMatch = gallery.find(
    item => item.kind === 'photo' && item.layout === input.layout,
  )
  if (photoMatch) return photoMatch

  if (input.layout === 'six') {
    return gallery.find(
      item => item.kind === 'theme' && item.themeId === input.themeId,
    ) ?? null
  }

  return null
}
