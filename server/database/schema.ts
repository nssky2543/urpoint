import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import type { RichMenuLayout, RichMenuSlot, RichMenuThemeId } from '../../shared/utils/rich-menu'

export const businessTypeEnum = pgEnum('business_type', ['barber', 'spa'])

export const storeCustomerStatusEnum = pgEnum('store_customer_status', ['active'])

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 254 }).notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  username: varchar('username', { length: 32 }).notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  uniqueIndex('users_email_unique').on(table.email),
  uniqueIndex('users_username_unique').on(table.username),
])

export const userIdentities = pgTable('user_identities', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 32 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 128 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  uniqueIndex('user_identities_provider_account_unique').on(table.provider, table.providerAccountId),
  uniqueIndex('user_identities_user_provider_unique').on(table.userId, table.provider),
  index('user_identities_user_id_idx').on(table.userId),
])

export const googleOauthStates = pgTable('google_oauth_states', {
  state: varchar('state', { length: 64 }).primaryKey(),
  codeVerifier: varchar('code_verifier', { length: 128 }).notNull(),
  nonce: varchar('nonce', { length: 64 }).notNull(),
  intent: varchar('intent', { length: 16 }).notNull(),
  businessType: businessTypeEnum('business_type'),
  redirect: varchar('redirect', { length: 255 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index('google_oauth_states_expires_at_idx').on(table.expiresAt),
])

export const sessions = pgTable('sessions', {
  tokenHash: varchar('token_hash', { length: 64 }).primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index('sessions_user_id_idx').on(table.userId),
  index('sessions_expires_at_idx').on(table.expiresAt),
])

// ponytail: one store per owner for MVP; upgrade to store_members when multi-store roles are needed
export const stores = pgTable('stores', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerUserId: uuid('owner_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 80 }).notNull(),
  slug: varchar('slug', { length: 48 }).notNull(),
  phone: varchar('phone', { length: 32 }),
  businessType: businessTypeEnum('business_type').notNull().default('barber'),
  staffBookingEnabled: boolean('staff_booking_enabled').notNull().default(true),
  customerLoginLineEnabled: boolean('customer_login_line_enabled').notNull().default(false),
  customerLoginOtpEnabled: boolean('customer_login_otp_enabled').notNull().default(true),
  onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  uniqueIndex('stores_owner_user_id_unique').on(table.ownerUserId),
  uniqueIndex('stores_slug_unique').on(table.slug),
])

export const storeCustomers = pgTable('store_customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  lineUserId: varchar('line_user_id', { length: 64 }),
  phone: varchar('phone', { length: 16 }),
  displayName: varchar('display_name', { length: 120 }),
  pictureUrl: text('picture_url'),
  pointsBalance: integer('points_balance').notNull().default(0),
  status: storeCustomerStatusEnum('status').notNull().default('active'),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  uniqueIndex('store_customers_store_line_user_unique')
    .on(table.storeId, table.lineUserId)
    .where(sql`${table.lineUserId} is not null`),
  uniqueIndex('store_customers_store_phone_unique')
    .on(table.storeId, table.phone)
    .where(sql`${table.phone} is not null`),
  check(
    'store_customers_has_identity',
    sql`${table.lineUserId} is not null or ${table.phone} is not null`,
  ),
  index('store_customers_store_id_idx').on(table.storeId),
  index('store_customers_last_seen_at_idx').on(table.lastSeenAt),
])

export const storeLineConnections = pgTable('store_line_connections', {
  storeId: uuid('store_id')
    .primaryKey()
    .references(() => stores.id, { onDelete: 'cascade' }),
  webhookKey: varchar('webhook_key', { length: 64 }).notNull(),
  loginChannelId: varchar('login_channel_id', { length: 64 }),
  loginChannelSecretEnc: text('login_channel_secret_enc'),
  messagingChannelId: varchar('messaging_channel_id', { length: 64 }),
  messagingChannelSecretEnc: text('messaging_channel_secret_enc'),
  accessTokenEnc: text('access_token_enc'),
  botUserId: varchar('bot_user_id', { length: 64 }),
  botDisplayName: varchar('bot_display_name', { length: 120 }),
  botBasicId: varchar('bot_basic_id', { length: 64 }),
  liffId: varchar('liff_id', { length: 64 }),
  setupStep: integer('setup_step').notNull().default(1),
  isActive: boolean('is_active').notNull().default(false),
  loginVerifiedAt: timestamp('login_verified_at', { withTimezone: true }),
  liffVerifiedAt: timestamp('liff_verified_at', { withTimezone: true }),
  botVerifiedAt: timestamp('bot_verified_at', { withTimezone: true }),
  webhookVerifiedAt: timestamp('webhook_verified_at', { withTimezone: true }),
  connectedAt: timestamp('connected_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  uniqueIndex('store_line_connections_webhook_key_unique').on(table.webhookKey),
])

export const lineWebhookEvents = pgTable('line_webhook_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  webhookEventId: varchar('webhook_event_id', { length: 128 }).notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  uniqueIndex('line_webhook_events_store_event_unique').on(table.storeId, table.webhookEventId),
  index('line_webhook_events_store_id_idx').on(table.storeId),
])

export const lineOauthStates = pgTable('line_oauth_states', {
  state: varchar('state', { length: 64 }).primaryKey(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  purpose: varchar('purpose', { length: 16 }).notNull().default('owner_test'),
  codeVerifier: varchar('code_verifier', { length: 128 }).notNull(),
  nonce: varchar('nonce', { length: 64 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index('line_oauth_states_store_id_idx').on(table.storeId),
  index('line_oauth_states_expires_at_idx').on(table.expiresAt),
])

export const customerSessions = pgTable('customer_sessions', {
  tokenHash: varchar('token_hash', { length: 64 }).primaryKey(),
  storeCustomerId: uuid('store_customer_id')
    .notNull()
    .references(() => storeCustomers.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index('customer_sessions_store_customer_id_idx').on(table.storeCustomerId),
  index('customer_sessions_expires_at_idx').on(table.expiresAt),
])

export const customerOtpChallenges = pgTable('customer_otp_challenges', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  phone: varchar('phone', { length: 16 }).notNull(),
  codeHash: varchar('code_hash', { length: 64 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  attemptCount: integer('attempt_count').notNull().default(0),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  uniqueIndex('customer_otp_challenges_store_phone_unique').on(table.storeId, table.phone),
  index('customer_otp_challenges_expires_at_idx').on(table.expiresAt),
])

export const pointLedger = pgTable('point_ledger', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => storeCustomers.id, { onDelete: 'cascade' }),
  delta: integer('delta').notNull(),
  reason: varchar('reason', { length: 120 }),
  createdByUserId: uuid('created_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index('point_ledger_store_id_idx').on(table.storeId),
  index('point_ledger_customer_id_idx').on(table.customerId),
])

export const richMenuLayoutEnum = pgEnum('rich_menu_layout', [
  'six',
  'three',
  'two',
  'four',
  'large_left',
  'large_right',
])

export const storeRichMenus = pgTable('store_rich_menus', {
  storeId: uuid('store_id')
    .primaryKey()
    .references(() => stores.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull().default(false),
  name: varchar('name', { length: 80 }).notNull().default('เมนูแชทร้าน'),
  chatBarText: varchar('chat_bar_text', { length: 14 }).notNull().default('เมนู'),
  layout: richMenuLayoutEnum('layout').notNull().default('six'),
  themeId: varchar('theme_id', { length: 32 }).notNull().default('ink').$type<RichMenuThemeId>(),
  slots: jsonb('slots').$type<RichMenuSlot[]>().notNull().default([]),
  customImageKey: text('custom_image_key'),
  customImageUpdatedAt: timestamp('custom_image_updated_at', { withTimezone: true }),
  lineRichMenuId: varchar('line_rich_menu_id', { length: 64 }),
  draftUpdatedAt: timestamp('draft_updated_at', { withTimezone: true }).defaultNow().notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  lastPublishError: text('last_publish_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type StoreRichMenuRow = typeof storeRichMenus.$inferSelect
export type StoreRichMenuLayout = RichMenuLayout
