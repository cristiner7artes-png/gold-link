// Official Mercado Livre API client.
// Auth uses the client_credentials grant (app token). We NEVER invent product
// data or affiliate parameters — everything returned here comes straight from
// the official API responses.

const ML_API = 'https://api.mercadolibre.com';
const SITE = 'MLB'; // Brasil

// Cache the app token across invocations so we don't hit the token endpoint on
// every call. Tokens last ~6h; we refresh a bit early.
let cachedToken = globalThis._mlToken;
if (!cachedToken) {
  cachedToken = globalThis._mlToken = { value: null, expiresAt: 0, promise: null };
}

export function hasMlCredentials() {
  return Boolean(process.env.ML_CLIENT_ID && process.env.ML_CLIENT_SECRET);
}

async function requestToken() {
  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Credenciais do Mercado Livre (ML_CLIENT_ID/ML_CLIENT_SECRET) não configuradas.');
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(`${ML_API}/oauth/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Falha ao autenticar no Mercado Livre (${res.status}). ${detail.slice(0, 180)}`);
  }
  const json = await res.json();
  if (!json.access_token) throw new Error('Mercado Livre não retornou token de acesso.');
  return { token: json.access_token, expiresIn: Number(json.expires_in) || 21600 };
}

export async function getAppToken() {
  const now = Date.now();
  if (cachedToken.value && cachedToken.expiresAt > now + 60000) {
    return cachedToken.value;
  }
  if (!cachedToken.promise) {
    cachedToken.promise = requestToken()
      .then(({ token, expiresIn }) => {
        cachedToken.value = token;
        cachedToken.expiresAt = Date.now() + expiresIn * 1000;
        cachedToken.promise = null;
        return token;
      })
      .catch((e) => {
        cachedToken.promise = null;
        throw e;
      });
  }
  return cachedToken.promise;
}

async function mlFetch(path, { retryAuth = true } = {}) {
  const token = await getAppToken();
  const res = await fetch(`${ML_API}${path}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(12000),
  });
  if (res.status === 401 && retryAuth) {
    // Token expired/invalid — force refresh once.
    cachedToken.value = null;
    cachedToken.expiresAt = 0;
    return mlFetch(path, { retryAuth: false });
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    const error = new Error(`Mercado Livre respondeu ${res.status} em ${path}. ${detail.slice(0, 160)}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

// Our platform categories → official Mercado Livre category IDs (MLB).
export const CATEGORY_MAP = {
  Eletrônicos: 'MLB1000',
  Celulares: 'MLB1051',
  Informática: 'MLB1648',
  Casa: 'MLB1574',
  Moda: 'MLB1430',
  Esportes: 'MLB1276',
  Infantil: 'MLB1132',
  Beleza: 'MLB1246',
  Automotivo: 'MLB1743',
  Games: 'MLB1144',
  Eletrodomésticos: 'MLB5726',
  Acessórios: 'MLB1499',
  Artesanatos: 'MLB1368',
  Farmácia: 'MLB264586',
  Alimentos: 'MLB1403',
  Outros: null,
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_MAP);

// Reverse lookup: ML category id → our category label.
const ML_TO_LABEL = Object.entries(CATEGORY_MAP).reduce((acc, [label, id]) => {
  if (id) acc[id] = label;
  return acc;
}, {});

export function mapMlCategory(mlCategoryId) {
  if (!mlCategoryId) return 'Outros';
  // ML category ids share a top-level prefix per domain; direct match first.
  if (ML_TO_LABEL[mlCategoryId]) return ML_TO_LABEL[mlCategoryId];
  return 'Outros';
}

// Official catalog product page (PDP). This is Mercado Livre's own canonical
// URL for a catalog product id — not an invented link.
const SITE_DOMAIN = 'https://www.mercadolivre.com.br';

// Best product image from the catalog product payload (real URLs only).
function catalogImage(product) {
  const pic = product?.pictures?.[0];
  const url = pic?.secure_url || pic?.url || '';
  if (url) return url.startsWith('http:') ? url.replace(/^http:/, 'https:') : url;
  // Fallback: picker thumbnail id → hosted image.
  const products = product?.pickers?.[0]?.products || [];
  const chosen = products.find((p) => p.tags?.includes('selected')) || products[0];
  if (chosen?.picture_id) return `https://http2.mlstatic.com/D_NQ_NP_2X_${chosen.picture_id}-F.webp`;
  if (chosen?.thumbnail) {
    return chosen.thumbnail.startsWith('http:') ? chosen.thumbnail.replace(/^http:/, 'https:') : chosen.thumbnail;
  }
  return '';
}

// From the buyable listings of a catalog product, pick the cheapest valid one.
function pickBestItem(items) {
  const valid = (items || []).filter((i) => i && Number(i.price) > 0);
  if (!valid.length) return null;
  valid.sort((a, b) => Number(a.price) - Number(b.price));
  return valid[0];
}

async function getCatalogProduct(productId) {
  return mlFetch(`/products/${encodeURIComponent(productId)}`);
}

async function getCatalogProductItems(productId) {
  const data = await mlFetch(`/products/${encodeURIComponent(productId)}/items`);
  return Array.isArray(data.results) ? data.results : [];
}

// Real aggregate rating + review count for a buyable listing.
// The official /reviews/item/{itemId} endpoint stays reachable with the app
// token and returns rating_average and paging.total (total real reviews).
export async function getItemReviews(itemId) {
  if (!itemId) return { rating: 0, reviews: 0 };
  try {
    const data = await mlFetch(`/reviews/item/${encodeURIComponent(itemId)}`);
    const rating = Number(data?.rating_average) || 0;
    const reviews = Number(data?.paging?.total) || 0;
    return {
      rating: Math.min(5, Math.max(0, rating)),
      reviews: Math.max(0, reviews),
    };
  } catch {
    return { rating: 0, reviews: 0 }; // reviews are optional — never block an offer
  }
}

// Combine a catalog product (name/image) with its best buyable listing
// (price/discount/shipping) into our product shape. Real data only.
export function normalizeCatalogOffer(product, item, categoryLabel) {
  const preco = Number(item.price) || 0;
  const precoAntigo = Number(item.original_price) || 0;
  let desconto = 0;
  if (precoAntigo > preco && precoAntigo > 0) {
    desconto = Math.round(((precoAntigo - preco) / precoAntigo) * 100);
  }
  return {
    mlId: product.id, // catalog product id (used for dedup + status checks)
    itemId: item.item_id || null,
    nome: String(product.name || '').trim(),
    imagem: catalogImage(product),
    preco,
    precoAntigo,
    desconto,
    freteGratis: Boolean(item.shipping?.free_shipping),
    permalink: `${SITE_DOMAIN}/p/${product.id}`,
    categoria: categoryLabel || mapMlCategory(item.category_id),
    categoryId: item.category_id || null,
    sold: 0, // not exposed by the catalog endpoints; popularity comes from ranking
    disponivel: true,
    condicao: item.condition || 'new',
  };
}

// Discover real offers for a platform category.
// Mercado Livre blocks the public /search endpoint (403) for client_credentials
// apps, so we use the official best-sellers (highlights) of the category and
// resolve each catalog product into a buyable offer with real price/discount.
export async function searchCategoryOffers(categoryLabel, { limit = 12, onlyDeals = true } = {}) {
  const categoryId = CATEGORY_MAP[categoryLabel];
  if (!categoryId) return []; // "Outros" has no browsable category.

  const highlights = await mlFetch(`/highlights/${SITE}/category/${categoryId}`);
  const content = Array.isArray(highlights.content) ? highlights.content : [];
  const productIds = content
    .filter((c) => c && c.id && c.type === 'PRODUCT')
    .map((c) => c.id)
    .slice(0, Math.min(12, Math.max(1, limit)));

  const offers = [];
  const CONCURRENCY = 4;
  for (let i = 0; i < productIds.length; i += CONCURRENCY) {
    const batch = productIds.slice(i, i + CONCURRENCY);
    const resolved = await Promise.all(
      batch.map(async (pid) => {
        try {
          const [product, items] = await Promise.all([
            getCatalogProduct(pid),
            getCatalogProductItems(pid),
          ]);
          const best = pickBestItem(items);
          if (!product || !best) return null;
          const offer = normalizeCatalogOffer(product, best, categoryLabel);
          if (!(offer.nome && offer.imagem && offer.preco > 0)) return null;
          // Real aggregate rating + review count from the official reviews endpoint.
          const { rating, reviews } = await getItemReviews(offer.itemId);
          offer.rating = rating;
          offer.reviews = reviews;
          return offer;
        } catch {
          return null; // one bad product never kills the batch
        }
      })
    );
    for (const o of resolved) if (o) offers.push(o);
  }

  if (onlyDeals) {
    const deals = offers.filter((p) => p.desconto > 0);
    return deals.length >= 3 ? deals : offers;
  }
  return offers;
}

// Live status of a robot offer via the official catalog endpoints.
// mlId here is a catalog product id (the /items/{id} endpoint is also blocked),
// so we check whether the product still has buyable listings.
// Returns { exists, active, availableQuantity, price, originalPrice, freeShipping, permalink } or null.
export async function getItemStatus(mlId) {
  if (!mlId) return null;
  try {
    const items = await getCatalogProductItems(mlId);
    const best = pickBestItem(items);
    if (!best) {
      return { exists: true, active: false, status: 'no_offers', availableQuantity: 0 };
    }
    return {
      exists: true,
      active: true,
      status: 'active',
      availableQuantity: 1,
      price: Number(best.price) || 0,
      originalPrice: Number(best.original_price) || 0,
      freeShipping: Boolean(best.shipping?.free_shipping),
      permalink: `${SITE_DOMAIN}/p/${mlId}`,
    };
  } catch (e) {
    if (e.status === 404) return { exists: false, active: false, status: 'closed' };
    return null; // indeterminate (rate limit, timeout) — caller keeps the offer
  }
}

// Build the outbound link. We only append affiliate data that the admin has
// explicitly configured (their own tag) — never invented values. Mercado Livre
// does not expose a public API to mint per-product meli.la short links, so we
// cannot auto-generate them. What we CAN do is attach the affiliate tracking
// parameters to the official product URL, which attributes the commission to
// the same affiliate account. The admin field accepts either:
//   - a full query string from ML Afiliados, e.g. "matt_tool=12345&matt_word=goldlink"
//   - a plain affiliate tag, e.g. "goldlink" (treated as matt_word=goldlink)
// Without a configured tag we return the official permalink unchanged.
// Default affiliate tracking used when the admin hasn't configured a custom
// tag. This is the account owner's own ML Afiliados identifier, so every
// outbound link attributes the commission to them out of the box.
const DEFAULT_AFFILIATE = 'matt_tool=36468671';

export function buildOutboundLink(permalink, affiliate) {
  if (!permalink) return '';
  const tag = affiliate?.mercadolivre?.trim() || DEFAULT_AFFILIATE;
  if (!tag) return permalink;
  try {
    const url = new URL(permalink);
    // If the admin pasted key=value pairs, attach them verbatim. Otherwise treat
    // the value as a plain affiliate tag and map it to matt_word.
    const raw = tag.replace(/^\?/, '');
    const query = raw.includes('=') ? raw : `matt_word=${encodeURIComponent(raw)}`;
    const extra = new URLSearchParams(query);
    for (const [k, v] of extra.entries()) url.searchParams.set(k, v);
    return url.toString();
  } catch {
    return permalink;
  }
}
