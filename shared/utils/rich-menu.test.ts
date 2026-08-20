import { describe, expect, test } from 'bun:test'
import {
  assertRichMenuReadyToPublish,
  defaultRichMenuSlots,
  isValidRichMenuUri,
  normalizeRichMenuSlots,
  richMenuBoundsForLayout,
  richMenuCanvasSize,
  slotCountForLayout,
} from './rich-menu'

describe('rich menu helpers', () => {
  test('maps layout to slot counts and canvas sizes', () => {
    expect(slotCountForLayout('six')).toBe(6)
    expect(slotCountForLayout('three')).toBe(3)
    expect(richMenuCanvasSize('six')).toEqual({ width: 2500, height: 1686 })
    expect(richMenuCanvasSize('two')).toEqual({ width: 2500, height: 843 })
    expect(richMenuCanvasSize('three')).toEqual({ width: 2500, height: 843 })
    expect(richMenuBoundsForLayout('six')).toHaveLength(6)
    expect(richMenuBoundsForLayout('large_left')).toHaveLength(3)
  })

  test('normalizes slots and validates uris', () => {
    const slots = normalizeRichMenuSlots('two', [
      { label: '  หน้าแรก ', uri: 'https://example.com/m/demo', showLabel: true },
    ])
    expect(slots).toHaveLength(2)
    expect(slots[0]?.label).toBe('หน้าแรก')
    expect(slots[1]?.uri).toBe('')
    expect(isValidRichMenuUri('https://example.com')).toBe(true)
    expect(isValidRichMenuUri('tel:0812345678')).toBe(true)
    expect(isValidRichMenuUri('ftp://bad')).toBe(false)
  })

  test('builds default slots and blocks incomplete publish payloads', () => {
    const defaults = defaultRichMenuSlots({
      layout: 'three',
      memberUrl: 'https://app.example/m/demo',
      phone: '081-234-5678',
    })
    expect(defaults).toHaveLength(3)
    expect(defaults[1]?.uri).toBe('https://app.example/m/demo')
    expect(defaults[2]?.uri).toBe('tel:0812345678')

    const largeLeft = defaultRichMenuSlots({
      layout: 'large_left',
      memberUrl: 'https://app.example/m/demo',
    })
    expect(largeLeft.map(slot => slot.label)).toEqual(['จองคิว', 'สะสมแต้ม', 'แลกของรางวัล'])
    expect(largeLeft[0]?.uri).toContain('/promotion')
    expect(largeLeft[1]?.uri).toBe('https://app.example/m/demo')
    expect(largeLeft[2]?.uri).toContain('/rewards')
    expect(largeLeft.every(slot => slot.showLabel === false)).toBe(true)

    expect(() => assertRichMenuReadyToPublish({
      name: 'เมนู',
      chatBarText: 'เมนู',
      layout: 'two',
      slots: [
        { label: 'A', uri: 'https://example.com', showLabel: true },
        { label: 'B', uri: '', showLabel: true },
      ],
    })).toThrow(/ลิงก์ช่องที่ 2/)
  })
})
