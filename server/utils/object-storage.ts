import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

export type ObjectStorageConfig = {
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  forcePathStyle: boolean
}

function readConfig(): ObjectStorageConfig | null {
  const endpoint = process.env.NUXT_S3_ENDPOINT?.trim() || ''
  const accessKeyId = process.env.NUXT_S3_ACCESS_KEY_ID?.trim() || ''
  const secretAccessKey = process.env.NUXT_S3_SECRET_ACCESS_KEY?.trim() || ''
  const bucket = process.env.NUXT_S3_BUCKET?.trim() || ''
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    return null
  }

  return {
    endpoint,
    region: process.env.NUXT_S3_REGION?.trim() || 'us-east-1',
    accessKeyId,
    secretAccessKey,
    bucket,
    forcePathStyle: process.env.NUXT_S3_FORCE_PATH_STYLE !== 'false',
  }
}

export function isObjectStorageConfigured() {
  return Boolean(readConfig())
}

export function requireObjectStorageConfig() {
  const config = readConfig()
  if (!config) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Service Unavailable',
      message: 'ยังไม่ได้ตั้งค่า object storage (NUXT_S3_*)',
    })
  }
  return config
}

let cachedClient: { key: string, client: S3Client } | null = null

function getS3Client(config: ObjectStorageConfig) {
  const key = [
    config.endpoint,
    config.region,
    config.accessKeyId,
    config.bucket,
    config.forcePathStyle ? '1' : '0',
  ].join('|')

  if (cachedClient?.key === key) {
    return cachedClient.client
  }

  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
  cachedClient = { key, client }
  return client
}

async function streamToBuffer(body: unknown) {
  if (!body) {
    return Buffer.alloc(0)
  }
  if (Buffer.isBuffer(body)) {
    return body
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body)
  }
  if (typeof body === 'string') {
    return Buffer.from(body)
  }

  const maybeTransform = body as { transformToByteArray?: () => Promise<Uint8Array> }
  if (typeof maybeTransform.transformToByteArray === 'function') {
    return Buffer.from(await maybeTransform.transformToByteArray())
  }

  const chunks: Buffer[] = []
  for await (const chunk of body as AsyncIterable<Uint8Array | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export async function putObject(input: {
  key: string
  body: Buffer
  contentType: string
}) {
  const config = requireObjectStorageConfig()
  const client = getS3Client(config)
  await client.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: input.key,
    Body: input.body,
    ContentType: input.contentType,
  }))
  return {
    bucket: config.bucket,
    key: input.key,
  }
}

export async function getObjectBuffer(key: string) {
  const config = requireObjectStorageConfig()
  const client = getS3Client(config)
  const result = await client.send(new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  }))
  const buffer = await streamToBuffer(result.Body)
  return {
    buffer,
    contentType: result.ContentType || 'application/octet-stream',
  }
}

export async function deleteObject(key: string) {
  const config = requireObjectStorageConfig()
  const client = getS3Client(config)
  await client.send(new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  }))
}
