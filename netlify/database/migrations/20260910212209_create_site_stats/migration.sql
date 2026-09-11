CREATE TABLE "site_stats" (
	"id" text PRIMARY KEY,
	"total_visitors" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
