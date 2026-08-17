CREATE TABLE "customer_otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"phone" varchar(16) NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_sessions" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"store_customer_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"delta" integer NOT NULL,
	"reason" varchar(120),
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "store_customers_store_line_user_unique";--> statement-breakpoint
ALTER TABLE "store_customers" ALTER COLUMN "line_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "line_oauth_states" ADD COLUMN "purpose" varchar(16) DEFAULT 'owner_test' NOT NULL;--> statement-breakpoint
ALTER TABLE "store_customers" ADD COLUMN "phone" varchar(16);--> statement-breakpoint
ALTER TABLE "store_customers" ADD COLUMN "points_balance" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "customer_login_line_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "customer_login_otp_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_otp_challenges" ADD CONSTRAINT "customer_otp_challenges_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_store_customer_id_store_customers_id_fk" FOREIGN KEY ("store_customer_id") REFERENCES "public"."store_customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_customer_id_store_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."store_customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_otp_challenges_store_phone_unique" ON "customer_otp_challenges" USING btree ("store_id","phone");--> statement-breakpoint
CREATE INDEX "customer_otp_challenges_expires_at_idx" ON "customer_otp_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "customer_sessions_store_customer_id_idx" ON "customer_sessions" USING btree ("store_customer_id");--> statement-breakpoint
CREATE INDEX "customer_sessions_expires_at_idx" ON "customer_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "point_ledger_store_id_idx" ON "point_ledger" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "point_ledger_customer_id_idx" ON "point_ledger" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_customers_store_phone_unique" ON "store_customers" USING btree ("store_id","phone") WHERE "store_customers"."phone" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "store_customers_store_line_user_unique" ON "store_customers" USING btree ("store_id","line_user_id") WHERE "store_customers"."line_user_id" is not null;--> statement-breakpoint
ALTER TABLE "store_customers" ADD CONSTRAINT "store_customers_has_identity" CHECK ("store_customers"."line_user_id" is not null or "store_customers"."phone" is not null);