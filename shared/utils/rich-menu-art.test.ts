import { describe, expect, test } from 'bun:test'
import { buildRichMenuSvg, RICH_MENU_THEME_CATALOG } from './rich-menu-art'
import { defaultRichMenuSlots } from './rich-menu'

describe('rich menu art', () => {
  test('exposes admin-editable theme catalog', () => {
    expect(RICH_MENU_THEME_CATALOG).toHaveLength(4)
    expect(RICH_MENU_THEME_CATALOG.every(theme => theme.editableByAdmin)).toBe(true)
    expect(RICH_MENU_THEME_CATALOG.map(theme => theme.assetKey)).toEqual([
      'builtin:ink',
      'builtin:amber',
      'builtin:slate',
      'builtin:forest',
    ])
    expect(RICH_MENU_THEME_CATALOG.every(theme => theme.thumbPath.startsWith('/images/rich-menu/'))).toBe(true)
  })

  test('builds illustrated svg for each theme', () => {
    const slots = defaultRichMenuSlots({
      layout: 'six',
      memberUrl: 'https://example.com/m/demo',
    })

    for (const theme of RICH_MENU_THEME_CATALOG) {
      const svg = buildRichMenuSvg({
        layout: 'six',
        themeId: theme.id,
        slots,
        storeName: 'test barber',
      })
      expect(svg).toContain('<svg')
      expect(svg).toContain('หน้าแรก')
      expect(svg).toContain('url(#panelGrad)')
    }
  })
})
