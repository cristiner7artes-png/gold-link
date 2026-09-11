CREATE TABLE "products" (
	"id" text PRIMARY KEY,
	"nome" text NOT NULL,
	"imagem" text NOT NULL,
	"preco" double precision DEFAULT 0 NOT NULL,
	"preco_antigo" double precision DEFAULT 0 NOT NULL,
	"desconto" integer DEFAULT 0 NOT NULL,
	"categoria" text DEFAULT 'Eletrônicos' NOT NULL,
	"rating" double precision DEFAULT 4.5 NOT NULL,
	"reviews" integer DEFAULT 0 NOT NULL,
	"frete_gratis" boolean DEFAULT false NOT NULL,
	"link" text NOT NULL,
	"badge" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
