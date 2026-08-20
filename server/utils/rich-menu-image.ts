import { join } from 'node:path'
import { existsSync } from 'node:fs'
import sharp from 'sharp'
import { buildRichMenuSvg } from '../../shared/utils/rich-menu-art'
import {
  photoTemplateForLayout,
  type RichMenuPhotoTemplate,
} from '../../shared/utils/rich-menu-templates'
import {
  richMenuCanvasSize,
  type RichMenuLayout,
  type RichMenuSlot,
  type RichMenuThemeId,
} from '../../shared/utils/rich-menu'

function resolvePublicAssetPath(publicPath: string) {
  const relative = publicPath.replace(/^\/+/, '')
  const candidates = [
    join(process.cwd(), 'public', relative),
    join(process.cwd(), relative),
  ]
  return candidates.find(path => existsSync(path)) ?? candidates[0]!
}

async function renderRasterToCanvas(
  source: string | Buffer,
  size: { width: number, height: number },
  tooLargeMessage: string,
) {
  const jpeg = await sharp(source)
    .resize(size.width, size.height, { fit: 'fill' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer()

  if (jpeg.byteLength > 1024 * 1024) {
    const smaller = await sharp(source)
      .resize(size.width, size.height, { fit: 'fill' })
      .jpeg({ quality: 68, mozjpeg: true })
      .toBuffer()

    if (smaller.byteLength > 1024 * 1024) {
      throw createError({
        statusCode: 400,
        statusMessage: tooLargeMessage,
      })
    }

    return finalizeImage(smaller, 'image/jpeg')
  }

  return finalizeImage(jpeg, 'image/jpeg')
}

async function renderPhotoTemplate(
  template: RichMenuPhotoTemplate,
  size: { width: number, height: number },
) {
  const filePath = resolvePublicAssetPath(template.imagePath)
  if (!existsSync(filePath)) {
    throw createError({
      statusCode: 500,
      statusMessage: `ไม่พบไฟล์เทมเพลต ${template.id}`,
    })
  }

  return renderRasterToCanvas(
    filePath,
    size,
    'รูปเทมเพลตใหญ่เกิน 1MB กรุณาลดคุณภาพไฟล์ต้นฉบับ',
  )
}

async function renderCustomImage(
  source: Buffer,
  size: { width: number, height: number },
) {
  return renderRasterToCanvas(
    source,
    size,
    'รูปที่อัปโหลดใหญ่เกิน 1MB หลังย่อขนาด กรุณาใช้ไฟล์ที่เบากว่า',
  )
}

export async function renderRichMenuPng(input: {
  layout: RichMenuLayout
  themeId: RichMenuThemeId
  slots: RichMenuSlot[]
  storeName?: string
  /** Future: admin-uploaded background image (https or local file path). */
  backgroundHref?: string | null
  /** Prefer a photo template when available for this layout. */
  usePhotoTemplate?: boolean
  /** Store-uploaded full-panel image object key in S3/MinIO. */
  customImageKey?: string | null
  /** Test/helper path: raw custom image bytes without hitting object storage. */
  customImageBuffer?: Buffer | null
}) {
  const size = richMenuCanvasSize(input.layout)

  if (input.customImageBuffer?.length) {
    return renderCustomImage(input.customImageBuffer, size)
  }

  if (input.customImageKey) {
    const { getObjectBuffer } = await import('./object-storage')
    const stored = await getObjectBuffer(input.customImageKey)
    return renderCustomImage(stored.buffer, size)
  }

  const photoTemplate = input.usePhotoTemplate === false
    ? null
    : photoTemplateForLayout(input.layout)

  if (photoTemplate) {
    return renderPhotoTemplate(photoTemplate, size)
  }

  const svg = buildRichMenuSvg({
    layout: input.layout,
    themeId: input.themeId,
    slots: input.slots,
    storeName: input.storeName,
    backgroundHref: input.backgroundHref,
  })

  const png = await sharp(Buffer.from(svg))
    .resize(size.width, size.height, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toBuffer()

  if (png.byteLength > 1024 * 1024) {
    const jpeg = await sharp(Buffer.from(svg))
      .resize(size.width, size.height, { fit: 'fill' })
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer()

    if (jpeg.byteLength > 1024 * 1024) {
      throw createError({
        statusCode: 400,
        statusMessage: 'รูป Rich Menu ใหญ่เกิน 1MB กรุณาลดข้อความปุ่มแล้วลองใหม่',
      })
    }

    return finalizeImage(jpeg, 'image/jpeg')
  }

  return finalizeImage(png, 'image/png')
}

async function finalizeImage(
  buffer: Buffer,
  contentType: 'image/png' | 'image/jpeg',
) {
  const meta = await sharp(buffer).metadata()
  if (!meta.width || !meta.height) {
    throw createError({
      statusCode: 500,
      statusMessage: 'สร้างรูป Rich Menu ไม่สำเร็จ',
    })
  }

  const ratio = meta.width / meta.height
  if (meta.width < 800 || meta.width > 2500 || meta.height < 250 || ratio < 1.45) {
    throw createError({
      statusCode: 500,
      statusMessage: 'ขนาดรูป Rich Menu ไม่ผ่านเงื่อนไขของ LINE',
    })
  }

  return {
    buffer,
    width: meta.width,
    height: meta.height,
    bytes: buffer.byteLength,
    contentType,
  }
}
