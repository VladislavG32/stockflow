ALTER TABLE "materials" ADD COLUMN "additional_units" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "tax_id" varchar(12) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "legal_address" varchar(250) DEFAULT '' NOT NULL;