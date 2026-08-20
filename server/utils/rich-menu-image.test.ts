import { describe, expect, test } from 'bun:test'
import sharp from 'sharp'
import { defaultRichMenuSlots } from '../../shared/utils/rich-menu'
import { isObjectStorageConfigured } from './object-storage'
import { renderRichMenuPng } from './rich-menu-image'

describe('rich menu image renderer', () => {
  test('renders a six-slot PNG within LINE limits', async () => {
    const slots = defaultRichMenuSlots({
      layout: 'six',
      memberUrl: 'https://example.com/m/demo',
      phone: '0812345678',
    })

    const image = await renderRichMenuPng({
      layout: 'six',
      themeId: 'ink',
      slots,
      storeName: 'test barber',
    })

    expect(image.width).toBe(2500)
    expect(image.height).toBe(1686)
    expect(image.bytes).toBeGreaterThan(1000)
    expect(image.bytes).toBeLessThanOrEqual(1024 * 1024)
    expect(image.contentType).toBe('image/png')
  })

  test('renders half-height layouts', async () => {
    const image = await renderRichMenuPng({
      layout: 'three',
      themeId: 'amber',
      slots: defaultRichMenuSlots({
        layout: 'three',
        memberUrl: 'https://example.com/m/demo',
      }),
    })

    expect(image.width).toBe(2500)
    expect(image.height).toBe(843)
    expect(image.width / image.height).toBeGreaterThanOrEqual(1.45)
  })

  test('renders barber photo template for large_left', async () => {
    const image = await renderRichMenuPng({
      layout: 'large_left',
      themeId: 'ink',
      slots: defaultRichMenuSlots({
        layout: 'large_left',
        memberUrl: 'https://example.com/m/demo',
      }),
    })

    expect(image.width).toBe(2500)
    expect(image.height).toBe(1686)
    expect(image.contentType).toBe('image/jpeg')
    expect(image.bytes).toBeLessThanOrEqual(1024 * 1024)
  })

  test('prefers custom image buffer over photo template', async () => {
    const custom = await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: { r: 30, g: 120, b: 200 },
      },
    })
      .jpeg()
      .toBuffer()

    const image = await renderRichMenuPng({
      layout: 'large_left',
      themeId: 'ink',
      slots: defaultRichMenuSlots({
        layout: 'large_left',
        memberUrl: 'https://example.com/m/demo',
      }),
      customImageBuffer: custom,
    })

    expect(image.width).toBe(2500)
    expect(image.height).toBe(1686)
    expect(image.contentType).toBe('image/jpeg')
    expect(image.bytes).toBeLessThanOrEqual(1024 * 1024)
  })
})

describe('object storage config', () => {
  test('reports configured only when NUXT_S3_* is complete', () => {
    const previous = {
      endpoint: process.env.NUXT_S3_ENDPOINT,
      accessKeyId: process.env.NUXT_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.NUXT_S3_SECRET_ACCESS_KEY,
      bucket: process.env.NUXT_S3_BUCKET,
    }

    try {
      delete process.env.NUXT_S3_ENDPOINT
      delete process.env.NUXT_S3_ACCESS_KEY_ID
      delete process.env.NUXT_S3_SECRET_ACCESS_KEY
      delete process.env.NUXT_S3_BUCKET
      expect(isObjectStorageConfigured()).toBe(false)

      process.env.NUXT_S3_ENDPOINT = 'http://127.0.0.1:9000'
      process.env.NUXT_S3_ACCESS_KEY_ID = 'urpoint'
      process.env.NUXT_S3_SECRET_ACCESS_KEY = 'urpoint_minio_dev'
      process.env.NUXT_S3_BUCKET = 'urpoint'
      expect(isObjectStorageConfigured()).toBe(true)
    }
    finally {
      if (previous.endpoint === undefined) delete process.env.NUXT_S3_ENDPOINT
      else process.env.NUXT_S3_ENDPOINT = previous.endpoint
      if (previous.accessKeyId === undefined) delete process.env.NUXT_S3_ACCESS_KEY_ID
      else process.env.NUXT_S3_ACCESS_KEY_ID = previous.accessKeyId
      if (previous.secretAccessKey === undefined) delete process.env.NUXT_S3_SECRET_ACCESS_KEY
      else process.env.NUXT_S3_SECRET_ACCESS_KEY = previous.secretAccessKey
      if (previous.bucket === undefined) delete process.env.NUXT_S3_BUCKET
      else process.env.NUXT_S3_BUCKET = previous.bucket
    }
  })
})
