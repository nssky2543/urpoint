CREATE TABLE "line_oauth_states" (
	"state" varchar(64) PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"code_verifier" varchar(128) NOT NULL,
	"nonce" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "line_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"webhook_event_id" varchar(128) NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_line_connections" (
	"store_id" uuid PRIMARY KEY NOT NULL,
	"webhook_key" varchar(64) NOT NULL,
	"login_channel_id" varchar(64),
	"login_channel_secret_enc" text,
	"messaging_channel_id" varchar(64),
	"messaging_channel_secret_enc" text,
	"access_token_enc" text,
	"bot_user_id" varchar(64),
	"bot_display_name" varchar(120),
	"bot_basic_id" varchar(64),
	"liff_id" varchar(64),
	"setup_step" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"bot_verified_at" timestamp with time zone,
	"webhook_verified_at" timestamp with time zone,
	"connected_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"slug" varchar(48) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "line_oauth_states" ADD CONSTRAINT "line_oauth_states_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_webhook_events" ADD CONSTRAINT "line_webhook_events_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_line_connections" ADD CONSTRAINT "store_line_connections_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "line_oauth_states_store_id_idx" ON "line_oauth_states" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "line_oauth_states_expires_at_idx" ON "line_oauth_states" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "line_webhook_events_store_event_unique" ON "line_webhook_events" USING btree ("store_id","webhook_event_id");--> statement-breakpoint
CREATE INDEX "line_webhook_events_store_id_idx" ON "line_webhook_events" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_line_connections_webhook_key_unique" ON "store_line_connections" USING btree ("webhook_key");--> statement-breakpoint
CREATE UNIQUE INDEX "stores_owner_user_id_unique" ON "stores" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stores_slug_unique" ON "stores" USING btree ("slug");--> statement-breakpoint
INSERT INTO "stores" ("owner_user_id", "name", "slug")
SELECT "id", 'ร้าน ' || "username", "username"
FROM "users"
WHERE NOT EXISTS (
  SELECT 1 FROM "stores" AS "s" WHERE "s"."owner_user_id" = "users"."id"
);--> statement-breakpoint
INSERT INTO "store_line_connections" ("store_id", "webhook_key")
SELECT
  "id",
  md5(random()::text || clock_timestamp()::text || "id"::text)
  || md5(random()::text || "id"::text)
FROM "stores"
WHERE NOT EXISTS (
  SELECT 1 FROM "store_line_connections" AS "c" WHERE "c"."store_id" = "stores"."id"
);