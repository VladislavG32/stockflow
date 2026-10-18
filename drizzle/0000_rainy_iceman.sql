CREATE TABLE "materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"name" varchar(160) NOT NULL,
	"category" varchar(100) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"minimum_stock" integer DEFAULT 0 NOT NULL,
	"target_stock" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "materials_code_unique" UNIQUE("code"),
	CONSTRAINT "materials_stock_limits" CHECK ("materials"."minimum_stock" >= 0 AND "materials"."target_stock" >= "materials"."minimum_stock" AND "materials"."target_stock" <= 1000000)
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" varchar(40) NOT NULL,
	"material_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"received_on" varchar(10) NOT NULL,
	"note" varchar(500) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receipts_number_unique" UNIQUE("number"),
	CONSTRAINT "receipts_positive_quantity" CHECK ("receipts"."quantity" > 0 AND "receipts"."quantity" <= 1000000)
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"contact" varchar(200) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receipts_material_idx" ON "receipts" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "receipts_supplier_idx" ON "receipts" USING btree ("supplier_id");