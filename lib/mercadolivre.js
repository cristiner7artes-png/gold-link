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

// Upgrade a thumbnail to a larger, https image when the thumbnail_id is known.
function bestImage(result) {
  const id = result.thumbnail_id;
  if (id) return `https://http2.mlstatic.com/D_NQ_NP_2X_${id}-F.webp`;
  const thumb = result.thumbnail || '';
  return thumb.startsWith('http:') ? thumb.replace(/^http:/, 'https:') : thumb;
}

// Normalise a raw ML search result into our product shape.
export function normalizeResult(result, categoryLabel) {
  const preco = Number(result.price) || 0;
  const precoAntigo = Number(result.original_price) || 0;
  let desconto = 0;
  if (precoAntigo > preco && precoAntigo > 0) {
    desconto = Math.round(((precoAntigo - preco) / precoAntigo) * 100);
  }
  const freteGratis = Boolean(result.shipping?.free_shipping);
  return {
    mlId: result.id,
    nome: String(result.title || '').trim(),
    imagem: bestImage(result),
    preco,
    precoAntigo,
    desconto,
    freteGratis,
    permalink: result.permalink || '',
    categoria: categoryLabel || mapMlCategory(result.category_id),
    categoryId: result.category_id || null,
    sold: Number(result.sold_quantity) || 0,
    disponivel: (Number(result.available_quantity) || 0) > 0 || result.available_quantity == null,
    condicao: result.condition || '',
  };
}

// Search official offers for a given platform category.
// Returns an array of normalized products (real data only).
export async function searchCategoryOffers(categoryLabel, { limit = 50, onlyDeals = true } = {}) {
  const categoryId = CATEGORY_MAP[categoryLabel];
  const params = new URLSearchParams();
  if (categoryId) params.set('category', categoryId);
  params.set('limit', String(Math.min(50, Math.max(1, limit))));
  // Bring the most relevant/popular first.
  params.set('sort', 'relevance');
  // Only physical, buyable listings.
  params.set('condition', 'new');

  const data = await mlFetch(`/sites/${SITE}/search?${params.toString()}`);
  const results = Array.isArray(data.results) ? data.results : [];
  let normalized = results
    .filter((r) => r && r.id && r.price)
    .map((r) => normalizeResult(r, categoryLabel));

  if (onlyDeals) {
    // A "deal" is a listing that actually has a discount (original_price > price).
    const deals = normalized.filter((p) => p.desconto > 0);
    // If ML returns few discounted items, keep the rest as valid offers too.
    normalized = deals.length >= 5 ? deals : normalized;
  }
  return normalized;
}

// Live status of an item via the official API. Reliable (no scraping).
// Returns { exists, active, availableQuantity, price, freeShipping } or null.
export async function getItemStatus(mlId) {
  if (!mlId) return null;
  try {
    const item = await mlFetch(`/items/${encodeURIComponent(mlId)}`);
    return {
      exists: true,
      active: item.status === 'active',
      status: item.status,
      availableQuantity: Number(item.available_quantity) || 0,
      price: Number(item.price) || 0,
      originalPrice: Number(item.original_price) || 0,
      freeShipping: Boolean(item.shipping?.free_shipping),
      permalink: item.permalink || '',
    };
  } catch (e) {
    if (e.status === 404) return { exists: false, active: false, status: 'closed' };
    return null; // indeterminate (rate limit, timeout) — caller keeps the offer
  }
}

// Build the outbound link. We only append affiliate parameters that the admin
// has explicitly configured (their own data) — never invented ones. Without a
// configured affiliate tag we return the official permalink unchanged.
export function buildOutboundLink(permalink, affiliate) {
  if (!permalink) return '';
  const tag = affiliate?.mercadolivre?.trim();
  if (!tag) return permalink;
  try {
    const url = new URL(permalink);
    // The admin provides the exact query string they got from ML Afiliados,
    // e.g. "matt_tool=12345&matt_word=goldlink". We attach it verbatim.
    const extra = new URLSearchParams(tag.replace(/^\?/, ''));
    for (const [k, v] of extra.entries()) url.searchParams.set(k, v);
    return url.toString();
  } catch {
    return permalink;
  }
}
