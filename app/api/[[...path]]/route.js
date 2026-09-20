import { NextResponse } from 'next/server';
import { getStore } from '@netlify/blobs';
import productsData from '../../../products.json';
import { getProductsCollection } from '../../../lib/mongodb';

export const dynamic = 'force-dynamic';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'usergold';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '251831';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'gl_dev_token';

function ok(data, status = 200) {
  return NextResponse.json(data, { status });
}
function err(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

const SEED_PRODUCTS = Array.isArray(productsData) ? productsData : [];

// Seed the database with the 80 products from products.json the first time the
// collection is empty. After that the database is the single source of truth.
async function ensureSeeded(collection) {
  const count = await collection.countDocuments();
  if (count > 0) return;
  if (SEED_PRODUCTS.length === 0) return;
  const docs = SEED_PRODUCTS.map((p) => ({
    ...p,
    id: p.id || (globalThis.crypto?.randomUUID?.() ?? String(Date.now())),
  }));
  await collection.insertMany(docs, { ordered: false }).catch(() => {});
  await collection
    .createIndex({ id: 1 }, { unique: true })
    .catch(() => {});
}

function isAuthed(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token && token === ADMIN_TOKEN;
}

/* ---------- Handlers ---------- */

async function handleLogin(request) {
  try {
    const body = await request.json();
    const { username, password } = body || {};
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return ok({ token: ADMIN_TOKEN, username });
    }
    return err('Credenciais inválidas', 401);
  } catch (e) {
    return err('JSON inválido', 400);
  }
}

async function handleListProducts() {
  try {
    const collection = await getProductsCollection();
    await ensureSeeded(collection);
    const list = await collection
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    return ok(list);
  } catch (e) {
    console.error('[v0] Erro ao listar produtos:', e.message);
    return err('Não foi possível carregar as ofertas: ' + e.message, 500);
  }
}

async function handleCreateProduct(request) {
  if (!isAuthed(request)) return err('Não autorizado', 401);
  try {
    const body = await request.json();
    const preco = Number(body.preco) || 0;
    const precoAntigo = Number(body.precoAntigo) || 0;
    let desconto = Number(body.desconto) || 0;
    if (!desconto && precoAntigo > preco && precoAntigo > 0) {
      desconto = Math.round(((precoAntigo - preco) / precoAntigo) * 100);
    }
    const nome = String(body.nome || '').trim();
    const imagem = String(body.imagem || '').trim();
    if (!nome) return err('Informe o nome do produto', 400);
    if (!imagem) return err('Informe a URL da imagem', 400);
    if (!preco) return err('Informe o preço do produto', 400);

    const now = new Date().toISOString();
    const product = {
      id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
      nome,
      imagem,
      preco,
      precoAntigo,
      desconto,
      categoria: String(body.categoria || 'Eletrônicos'),
      rating: Number(body.rating) || 0,
      reviews: Number(body.reviews) || 0,
      freteGratis: Boolean(body.freteGratis),
      link: String(body.link || '').trim(),
      badge: body.badge || null,
      createdAt: now,
      updatedAt: now,
    };

    const collection = await getProductsCollection();
    await ensureSeeded(collection);
    await collection.insertOne({ ...product });
    return ok(product, 201);
  } catch (e) {
    console.error('[v0] Erro ao criar produto:', e.message);
    return err('Não foi possível salvar a oferta: ' + e.message, 500);
  }
}

async function handleUpdateProduct(request, id) {
  if (!isAuthed(request)) return err('Não autorizado', 401);
  try {
    const body = await request.json();
    const preco = Number(body.preco) || 0;
    const precoAntigo = Number(body.precoAntigo) || 0;
    let desconto = Number(body.desconto) || 0;
    if (!desconto && precoAntigo > preco && precoAntigo > 0) {
      desconto = Math.round(((precoAntigo - preco) / precoAntigo) * 100);
    }
    const nome = String(body.nome || '').trim();
    const imagem = String(body.imagem || '').trim();
    if (!nome) return err('Informe o nome do produto', 400);
    if (!imagem) return err('Informe a URL da imagem', 400);
    if (!preco) return err('Informe o preço do produto', 400);

    const update = {
      nome,
      imagem,
      preco,
      precoAntigo,
      desconto,
      categoria: String(body.categoria || 'Eletrônicos'),
      rating: Number(body.rating) || 0,
      reviews: Number(body.reviews) || 0,
      freteGratis: Boolean(body.freteGratis),
      link: String(body.link || '').trim(),
      badge: body.badge || null,
      updatedAt: new Date().toISOString(),
    };

    const collection = await getProductsCollection();
    await ensureSeeded(collection);
    const result = await collection.findOneAndUpdate(
      { id },
      { $set: update },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
    const doc = result?.value ?? result;
    if (!doc || !doc.id) return err('Oferta não encontrada', 404);
    return ok(doc);
  } catch (e) {
    console.error('[v0] Erro ao atualizar produto:', e.message);
    return err('Não foi possível atualizar a oferta: ' + e.message, 500);
  }
}

async function handleDeleteProduct(request, id) {
  if (!isAuthed(request)) return err('Não autorizado', 401);
  try {
    const collection = await getProductsCollection();
    await ensureSeeded(collection);
    const result = await collection.deleteOne({ id });
    if (!result.deletedCount) return err('Oferta não encontrada', 404);
    return ok({ deleted: true, id });
  } catch (e) {
    console.error('[v0] Erro ao remover produto:', e.message);
    return err('Não foi possível remover a oferta: ' + e.message, 500);
  }
}

async function handleVerify(request) {
  return ok({ valid: isAuthed(request) });
}

/* ---------- Mercado Livre scraper (preenchimento automático) ---------- */

const ALLOWED_PRODUCT_HOSTS = [
  'meli.la',
  'mercadolivre.com',
  'www.mercadolivre.com',
  'mercadolivre.com.br',
  'www.mercadolivre.com.br',
  'produto.mercadolivre.com.br',
  'lista.mercadolivre.com.br',
];

function validateProductUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Cole um link válido do Mercado Livre.');
  }

  const hostname = url.hostname.toLowerCase();
  const allowedHost =
    ALLOWED_PRODUCT_HOSTS.includes(hostname) ||
    hostname.endsWith('.mercadolivre.com.br') ||
    hostname.endsWith('.mercadolivre.com');
  if (url.protocol !== 'https:' || !allowedHost) {
    throw new Error('Use um link HTTPS do Mercado Livre ou meli.la.');
  }
  return url;
}

async function fetchProductPage(rawUrl) {
  let currentUrl = validateProductUrl(rawUrl);

  for (let redirect = 0; redirect <= 5; redirect += 1) {
    const response = await fetch(currentUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });

    if (response.status < 300 || response.status >= 400) {
      return { response, finalUrl: currentUrl.toString() };
    }

    const location = response.headers.get('location');
    if (!location) throw new Error('O link de oferta retornou um redirecionamento inválido.');
    currentUrl = validateProductUrl(new URL(location, currentUrl).toString());
  }

  throw new Error('O link de oferta tem redirecionamentos demais.');
}

function findProductJson(value) {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findProductJson(item);
      if (found) return found;
    }
    return null;
  }
  const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  if (types.includes('Product')) return value;
  for (const child of Object.values(value)) {
    const found = findProductJson(child);
    if (found) return found;
  }
  return null;
}

function extractStructuredProduct(html) {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const script of scripts) {
    const content = script.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '').trim();
    try {
      const product = findProductJson(JSON.parse(content));
      if (product) return product;
    } catch {
      // Some marketplace scripts are not valid JSON; the HTML fallbacks below still apply.
    }
  }
  return null;
}

function extractMercadoLivreItemId(finalUrl, html) {
  const candidates = [
    finalUrl.match(/\b(MLB)-?(\d{6,})\b/i),
    html.match(/["']item_id["']\s*:\s*["'](MLB)-?(\d{6,})["']/i),
    html.match(/["']itemId["']\s*:\s*["'](MLB)-?(\d{6,})["']/i),
    html.match(/\b(MLB)-?(\d{6,})\b/i),
  ];
  const match = candidates.find(Boolean);
  return match ? `${match[1].toUpperCase()}${match[2]}` : null;
}

async function fetchMercadoLivreJson(path) {
  const response = await fetch(`https://api.mercadolibre.com${path}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  return response.json();
}

async function fetchMercadoLivreDetails(itemId) {
  if (!itemId) return { item: null, reviewSummary: null };
  const [item, reviewSummary] = await Promise.all([
    fetchMercadoLivreJson(`/items/${encodeURIComponent(itemId)}`).catch(() => null),
    fetchMercadoLivreJson(`/reviews/item/${encodeURIComponent(itemId)}`).catch(() => null),
  ]);
  return { item, reviewSummary };
}

// The catalog reviews widget endpoint is NOT behind the aggressive anti-bot
// that guards the product page, so it is reachable from server IPs. When the
// product page is blocked, this is often the only place we can still read the
// aggregate rating / review count.
async function fetchMercadoLivreReviewWidget(itemId) {
  if (!itemId) return { rating: 0, reviews: 0 };
  try {
    const url = `https://www.mercadolivre.com.br/noindex/catalog/reviews/${encodeURIComponent(
      itemId
    )}?noIndex=true`;
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return { rating: 0, reviews: 0 };
    const html = await response.text();
    if (html.includes('account-verification') || html.includes('suspicious-traffic-frontend')) {
      return { rating: 0, reviews: 0 };
    }
    return extractReviewsFromHtml(html);
  } catch {
    return { rating: 0, reviews: 0 };
  }
}

function extractReviewsFromHtml(html) {
  let rating = 0;
  let reviews = 0;

  // 1) ld+json aggregateRating — ratingCount is the number ML shows as "avaliações".
  const agg = html.match(
    /"aggregateRating"\s*:\s*\{[^{}]*"ratingValue"\s*:\s*(\d+(?:[.,]\d+)?)[^{}]*\}/
  );
  if (agg) {
    rating = Number(String(agg[1]).replace(',', '.')) || 0;
    const count =
      agg[0].match(/"ratingCount"\s*:\s*(\d+)/) || agg[0].match(/"reviewCount"\s*:\s*(\d+)/);
    reviews = count ? Number(count[1]) : 0;
  }

  // 2) Screen-reader summary: "Avaliação 4,6 de 5. (172 avaliações)" / "Avaliação 5.0 de 5. 13 opiniões."
  if (!rating) {
    const h = html.match(
      /Avaliação\s*(\d+(?:[.,]\d+)?)\s*de\s*5\.?\s*\(?\s*(\d+)?\s*\)?\s*(?:opini|avalia)/i
    );
    if (h) {
      rating = Number(h[1].replace(',', '.')) || 0;
      reviews = Number(h[2]) || 0;
    }
  }

  // 3) Review widget elements (ui-review-capability on product pages)
  if (!rating) {
    const avg = html.match(/ui-review-capability__rating__average[^>]*>(\d+(?:[.,]\d+)?)</);
    if (avg) {
      rating = Number(avg[1].replace(',', '.')) || 0;
      const lbl = html.match(
        /ui-review-capability__rating__label[^>]*>(\d+(?:[.,]\d+)?)\s*avalia/i
      );
      reviews = lbl ? Number(lbl[1].replace(/\./g, '')) : 0;
    }
  }

  // 4) Polycard JSON (search/list pages): "reviews":{"rating_average":4.6,"total":172}
  if (!rating) {
    const p = html.match(
      /"reviews"\s*:\s*\{[^{}]*"rating_average"\s*:\s*(\d+(?:[.,]\d+)?)[^{}]*\}/
    );
    if (p) {
      rating = Number(String(p[1]).replace(',', '.')) || 0;
      const t = p[0].match(/"total"\s*:\s*(\d+)/);
      reviews = t ? Number(t[1]) : 0;
    }
  }

  return { rating: Math.min(5, Math.max(0, rating)), reviews: Math.max(0, reviews) };
}

// Extract the promotional badge shown on the Mercado Livre product/card.
// Returns one of the allowed admin badge labels or '' when none is found.
function extractBadgeFromHtml(html) {
  if (!html) return '';
  // "Mais vendido" — pill/highlight on best-seller items
  if (
    /mais\s+vendido/i.test(html) ||
    /"best_seller"/i.test(html) ||
    /"(?:label|text)"\s*:\s*"[^"]*mais\s+vendido[^"]*"/i.test(html)
  ) {
    return 'MAIS VENDIDO';
  }
  // Lightning / daily deal
  if (
    /oferta\s+rel[aâ]mpago/i.test(html) ||
    /lightning[_-]?deal/i.test(html) ||
    /deal_of_the_day/i.test(html) ||
    /oferta\s+do\s+dia/i.test(html)
  ) {
    return 'OFERTA RELÂMPAGO';
  }
  return '';
}

async function handleScrapeProduct(request) {
  try {
    const body = await request.json();
    const rawUrl = String(body.url || '').trim();
    if (!rawUrl) return err('URL obrigatória', 400);

    // This read-only endpoint does not depend on an admin token. Strict host and
    // redirect validation prevents it from becoming an unrestricted URL fetcher.
    const { response: res, finalUrl } = await fetchProductPage(rawUrl);
    const html = await res.text();

    // Anti-bot page detection
    if (
      finalUrl.includes('account-verification') ||
      finalUrl.includes('suspicious-traffic') ||
      html.includes('suspicious-traffic-frontend')
    ) {
      return err(
        'O Mercado Livre bloqueou o acesso a esta página. Use um link de afiliado meli.la ou tente novamente em alguns minutos.',
        502
      );
    }

    if (!res.ok) return err(`Erro ${res.status} ao acessar o link`, 502);

    // HTML entity decoder
    const decode = (s) =>
      !s
        ? s
        : s
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&#x27;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&nbsp;/g, ' ');

    const findMeta = (attr, value) => {
      const re1 = new RegExp(
        `<meta[^>]+${attr}=["']${value}["'][^>]*content=["']([^"']+)["']`,
        'i'
      );
      const m1 = html.match(re1);
      if (m1) return decode(m1[1]);
      const re2 = new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]*${attr}=["']${value}["']`,
        'i'
      );
      const m2 = html.match(re2);
      return m2 ? decode(m2[1]) : null;
    };

    let nome =
      findMeta('property', 'og:title') || findMeta('name', 'twitter:title') || '';
    let imagem =
      findMeta('property', 'og:image') || findMeta('name', 'twitter:image') || '';
    if (imagem && imagem.startsWith('http:')) imagem = imagem.replace(/^http:/, 'https:');

    // Clean common suffixes
    if (nome) nome = nome.replace(/\s*\|\s*Mercado Livre.*$/i, '').trim();

    let preco = 0;
    let precoAntigo = 0;
    let desconto = 0;
    let rating = 0;
    let reviews = 0;

    const structured = extractStructuredProduct(html);
    if (!nome && structured?.name) nome = decode(String(structured.name)).trim();
    const structuredImage = Array.isArray(structured?.image) ? structured.image[0] : structured?.image;
    if (!imagem && structuredImage) imagem = String(structuredImage);

    const structuredOffers = Array.isArray(structured?.offers) ? structured.offers[0] : structured?.offers;
    if (structuredOffers) {
      preco = Number(structuredOffers.price ?? structuredOffers.lowPrice) || 0;
    }

    // Strategy 1: locate the polycard block that contains this title
    if (nome && nome.length > 8) {
      const searchNeedle = nome.slice(0, Math.min(nome.length, 40));
      const escaped = searchNeedle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Look for the title embedded in the polycard JSON, then look ~3000 chars ahead for price block
      const pattern = new RegExp(
        `"text":"${escaped}[^"]*"[\\s\\S]{0,4000}?"price":\\{[\\s\\S]{0,1200}?\\}`,
        'i'
      );
      const m = html.match(pattern);
      if (m) {
        const block = m[0];
        const cur = block.match(/"current_price":\s*\{[^{}]*?"value":\s*(\d+(?:\.\d+)?)/);
        const prev = block.match(/"previous_price":\s*\{[^{}]*?"value":\s*(\d+(?:\.\d+)?)/);
        const disc = block.match(/"discount_label":\s*\{[^{}]*?"text":"(\d+)%/);
        if (cur) preco = parseFloat(cur[1]);
        if (prev) precoAntigo = parseFloat(prev[1]);
        if (disc) desconto = parseInt(disc[1], 10);
      }
    }

    // Strategy 2: fallback to FIRST current_price in the HTML
    if (!preco) {
      const cur = html.match(/"current_price":\s*\{[^{}]*?"value":\s*(\d+(?:\.\d+)?)/);
      if (cur) preco = parseFloat(cur[1]);
      const prev = html.match(/"previous_price":\s*\{[^{}]*?"value":\s*(\d+(?:\.\d+)?)/);
      if (prev) precoAntigo = parseFloat(prev[1]);
      const disc = html.match(/"discount_label":\s*\{[^{}]*?"text":"(\d+)%/);
      if (disc) desconto = parseInt(disc[1], 10);
    }

    // Strategy 3: plain "price": number
    if (!preco) {
      const p = html.match(/"price":\s*(\d+(?:\.\d+)?)/);
      if (p) preco = parseFloat(p[1]);
      const op = html.match(/"original_price":\s*(\d+(?:\.\d+)?)/);
      if (op) precoAntigo = parseFloat(op[1]);
    }

    // Compute discount if missing
    if (!desconto && preco && precoAntigo && precoAntigo > preco) {
      desconto = Math.round((1 - preco / precoAntigo) * 100);
    }

    // Ratings: robust multi-source extraction from the page HTML itself.
    // Recent Mercado Livre pages often omit aggregateRating, but always render
    // the review widget (ui-review-capability) and/or the screen-reader summary.
    const htmlReviews = extractReviewsFromHtml(html);
    rating = htmlReviews.rating;
    reviews = htmlReviews.reviews;

    // The item and reviews endpoints are supplements — they may be blocked or
    // unavailable; HTML extraction above is the primary source.
    const itemId = extractMercadoLivreItemId(finalUrl, html);
    const { item, reviewSummary } = await fetchMercadoLivreDetails(itemId);
    const apiRating = Number(reviewSummary?.rating_average);
    const apiReviews = Number(reviewSummary?.paging?.total ?? reviewSummary?.reviews_count);
    if (Number.isFinite(apiRating) && apiRating > 0) rating = apiRating;
    if (Number.isFinite(apiReviews) && apiReviews > 0) reviews = Math.round(apiReviews);

    // Last resort: the product page is often anti-bot blocked, but the catalog
    // reviews widget endpoint stays reachable. Query it when we still have no rating.
    if (!rating && itemId) {
      const widget = await fetchMercadoLivreReviewWidget(itemId);
      if (widget.rating > 0) {
        rating = widget.rating;
        if (widget.reviews > 0) reviews = widget.reviews;
      }
    }

    const badge = extractBadgeFromHtml(html);

    const htmlHasShipping =
      /"free_shipping"\s*:\s*(?:true|false)|"freeShipping"\s*:\s*(?:true|false)|Frete\s+gr[aá]tis/i.test(html);
    const apiHasShipping = typeof item?.shipping?.free_shipping === 'boolean';
    const freteGratis = apiHasShipping
      ? item.shipping.free_shipping
      : /"free_shipping"\s*:\s*true|"freeShipping"\s*:\s*true|Frete\s+gr[aá]tis/i.test(html);

    // Category guess (from title + URL keywords)
    let categoria = 'Eletrônicos';
    const catMap = [
      { keys: ['smart tv', 'tv ', 'notebook', 'celular', 'smartphone', 'iphone', 'galaxy', 'xiaomi', 'fone', 'headphone', 'headset', 'áudio', 'audio', 'cabo', 'carregador', 'monitor', 'tablet', 'roku'], v: 'Eletrônicos' },
      { keys: ['air fryer', 'geladeira', 'fogão', 'panela', 'cafeteira', 'liquidificador', 'cozinha', 'sofá', 'móveis', 'aspirador', 'colchão'], v: 'Casa' },
      { keys: ['tênis', 'tenis', 'nike', 'adidas', 'camisa', 'camiseta', 'calça', 'sapato', 'bolsa', 'jaqueta', 'blusa'], v: 'Moda' },
      { keys: ['bicicleta', 'esporte', 'fitness', 'bike', 'academia', 'suplemento', 'whey'], v: 'Esportes' },
      { keys: ['perfume', 'beleza', 'maquiagem', 'shampoo', 'creme', 'batom', 'cosmético'], v: 'Beleza' },
      { keys: ['bebê', 'bebe', 'infantil', 'brinquedo', 'lego', 'boneca'], v: 'Infantil' },
    ];
    const low = (nome + ' ' + finalUrl).toLowerCase();
    for (const c of catMap) {
      if (c.keys.some((k) => low.includes(k))) { categoria = c.v; break; }
    }

    if (!nome && !imagem && !preco) {
      return err(
        'Não conseguimos extrair dados dessa página. Cole um link de afiliado meli.la ou um link direto do produto.',
        422
      );
    }

    return ok({
      nome,
      imagem,
      preco,
      precoAntigo,
      desconto,
      categoria,
      link: rawUrl, // keep the original affiliate link
      rating: Math.min(5, Math.max(0, rating)),
      reviews: Math.max(0, reviews),
      freteGratis,
      badge,
      found: {
        rating: rating > 0,
        reviews: reviews > 0,
        freteGratis: apiHasShipping || htmlHasShipping,
        badge: !!badge,
      },
    });
  } catch (e) {
    if (e.name === 'TimeoutError') {
      return err('A página do produto demorou para responder. Tente novamente em alguns instantes.', 504);
    }
    if (/^(Cole um link válido|Use um link HTTPS)/.test(e.message)) {
      return err(e.message, 400);
    }
    return err('Falha ao buscar: ' + e.message, 500);
  }
}

const DEFAULT_BANNER = {
  ativo: false,
  titulo: '',
  subtitulo: '',
  imagem: '',
  link: '',
  cta: 'Ver Ofertas',
};

function bannerStore() {
  return getStore({ name: 'goldlink-settings', consistency: 'strong' });
}

async function handleGetBanner() {
  try {
    const saved = await bannerStore().get('banner', { type: 'json' });
    return ok({ ...DEFAULT_BANNER, ...(saved || {}) });
  } catch (e) {
    return ok(DEFAULT_BANNER);
  }
}

async function handleSaveBanner(request) {
  if (!isAuthed(request)) return err('Não autorizado', 401);
  try {
    const b = await request.json();
    const banner = {
      ativo: Boolean(b.ativo),
      titulo: String(b.titulo || '').trim(),
      subtitulo: String(b.subtitulo || '').trim(),
      imagem: String(b.imagem || '').trim(),
      link: String(b.link || '').trim(),
      cta: String(b.cta || 'Ver Ofertas').trim(),
      updatedAt: new Date().toISOString(),
    };
    if (banner.ativo && !banner.imagem && !banner.titulo) {
      return err('Informe uma imagem ou um título para o banner', 400);
    }
    await bannerStore().setJSON('banner', banner);
    return ok(banner);
  } catch (e) {
    return err('Erro ao salvar banner: ' + e.message, 500);
  }
}

/* ---------- Router ---------- */

async function router(request, context) {
  const params = await context.params;
  const path = (params?.path || []).join('/');
  const method = request.method;

  try {
    // /api
    if (!path) {
      return ok({ service: 'Gold Link API', version: '1.0.0' });
    }

    if (path === 'admin/login' && method === 'POST') return handleLogin(request);
    if (path === 'admin/verify' && method === 'GET') return handleVerify(request);
    if (path === 'admin/scrape' && method === 'POST') return handleScrapeProduct(request);

    if (path === 'banner' && method === 'GET') return handleGetBanner();
    if (path === 'banner' && (method === 'PUT' || method === 'POST')) return handleSaveBanner(request);

    if (path === 'products' && method === 'GET') return handleListProducts();
    if (path === 'products' && method === 'POST') return handleCreateProduct(request);

    if (path.startsWith('products/')) {
      const id = decodeURIComponent(path.slice('products/'.length));
      if (id) {
        if (method === 'PUT' || method === 'PATCH') return handleUpdateProduct(request, id);
        if (method === 'DELETE') return handleDeleteProduct(request, id);
      }
    }

    return err('Rota não encontrada: ' + path, 404);
  } catch (e) {
    return err('Erro interno: ' + e.message, 500);
  }
}

export const GET = router;
export const POST = router;
export const PUT = router;
export const PATCH = router;
export const DELETE = router;
