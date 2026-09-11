import { boolean, doublePrecision, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  imagem: text('imagem').notNull(),
  preco: doublePrecision('preco').notNull().default(0),
  precoAntigo: doublePrecision('preco_antigo').notNull().default(0),
  desconto: integer('desconto').notNull().default(0),
  categoria: text('categoria').notNull().default('Eletrônicos'),
  rating: doublePrecision('rating').notNull().default(4.5),
  reviews: integer('reviews').notNull().default(0),
  freteGratis: boolean('frete_gratis').notNull().default(false),
  link: text('link').notNull(),
  badge: text('badge'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const siteStats = pgTable('site_stats', {
  id: text('id').primaryKey(),
  totalVisitors: integer('total_visitors').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
