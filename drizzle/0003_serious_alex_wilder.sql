CREATE TYPE "public"."business_type" AS ENUM('barber', 'spa');--> statement-breakpoint
CREATE TYPE "public"."store_customer_status" AS ENUM('active');--> statement-breakpoint
CREATE TABLE "store_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"line_user_id" varchar(64) NOT NULL,
	"display_name" varchar(120),
	"picture_url" text,
	"status" "store_customer_status" DEFAULT 'active' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "business_type" "business_type" DEFAULT 'barber' NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "staff_booking_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "store_customers" ADD CONSTRAINT "store_customers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "store_customers_store_line_user_unique" ON "store_customers" USING btree ("store_id","line_user_id");--> statement-breakpoint
CREATE INDEX "store_customers_store_id_idx" ON "store_customers" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "store_customers_last_seen_at_idx" ON "store_customers" USING btree ("last_seen_at");