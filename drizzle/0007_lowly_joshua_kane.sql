CREATE TYPE "public"."rich_menu_layout" AS ENUM('six', 'three', 'two', 'four', 'large_left', 'large_right');--> statement-breakpoint
CREATE TABLE "store_rich_menus" (
	"store_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"name" varchar(80) DEFAULT 'เมนูแชทร้าน' NOT NULL,
	"chat_bar_text" varchar(14) DEFAULT 'เมนู' NOT NULL,
	"layout" "rich_menu_layout" DEFAULT 'six' NOT NULL,
	"theme_id" varchar(32) DEFAULT 'ink' NOT NULL,
	"slots" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"line_rich_menu_id" varchar(64),
	"draft_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"last_publish_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "store_rich_menus" ADD CONSTRAINT "store_rich_menus_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;