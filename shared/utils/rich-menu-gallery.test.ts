import { describe, expect, test } from 'bun:test'
import { buildRichMenuGallery, resolveGallerySelection } from './rich-menu-gallery'

describe('rich menu gallery', () => {
  test('builds PointUp-style gallery with photo and theme cards', () => {
    const gallery = buildRichMenuGallery()
    expect(gallery.length).toBeGreaterThanOrEqual(5)
    expect(gallery[0]?.kind).toBe('photo')
    expect(gallery[0]?.label).toBe('Barber Promo')
    expect(gallery.some(item => item.id === 'theme:ink:six')).toBe(true)
  })

  test('resolves selected gallery card from layout and theme', () => {
    expect(resolveGallerySelection({ layout: 'large_left', themeId: 'ink' })?.id)
      .toBe('photo:barber-promo-large-left')
    expect(resolveGallerySelection({ layout: 'six', themeId: 'slate' })?.id)
      .toBe('theme:slate:six')
    expect(resolveGallerySelection({ layout: 'three', themeId: 'ink' })).toBeNull()
  })
})
