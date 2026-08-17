ALTER TABLE "stores" ADD COLUMN "phone" varchar(32);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "onboarded_at" timestamp with time zone;--> statement-breakpoint
UPDATE "stores" SET "onboarded_at" = "created_at" WHERE "onboarded_at" IS NULL;