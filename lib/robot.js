// Robô automático de ofertas — busca, valida, categoriza, pontua, deduplica e
// substitui ofertas usando SOMENTE a API oficial do Mercado Livre.

import { getProductsCollection, getCollection } from './mongodb';
import {
  hasMlCredentials,
  findBestOffers,
  byBestRating,
  getItemStatus,
  getItemReviews,
  buildOutboundLink,
  mlFetch,
  PLATFORM_CATEGORIES,
} from './mercadolivre';

const CONFIG_ID = 'config';

export const DEFAULT_CONFIG = {
  _id: CONFIG_ID,
  ativo: true, // robô habilitado
  intervaloMin: 60, // minutos entre execuções automáticas
  maxPorCategoria: 25,
  maxProdutos: 300,
  precoMin: 0,
  precoMax: 0, // 0 = sem limite
  exigirFreteGratis: false,
  descontoMin: 0,
  categoriasPermitidas: [...PLATFORM_CATEGORIES],
  // Per-category target set by "adicionar"/"excluir" in the panel; overrides maxPorCategoria for that category.
  quotas: {},
  pesos: {
    desconto: 30,
    frete: 12,
    disponibilidade: 10,
    popularidade: 18,
    cliques: 15,
    recente: 8,
    preco: 7,
  },
  afiliado: { mercadolivre: '' },
  running: false,
  lastRun: null,
  nextRun: null,
  stats: {
    adicionadasHoje: 0,
    removidas: 0,
    expiradas: 0,
    erros: 0,
    ultimaAdicao: null,
  },
};

export async function getConfig() {
  const col = await getCollection('robot_config');
  let cfg = await col.findOne({ _id: CONFIG_ID });
  if (!cfg) {
    await col.insertOne({ ...DEFAULT_CONFIG }).catch(() => {});
    cfg = { ...DEFAULT_CONFIG };
  }
  // Preenche defaults para chaves novas.
  return {
    ...DEFAULT_CONFIG,
    ...cfg,
    pesos: { ...DEFAULT_CONFIG.pesos, ...(cfg.pesos || {}) },
    afiliado: { ...DEFAULT_CONFIG.afiliado, ...(cfg.afiliado || {}) },
    stats: { ...DEFAULT_CONFIG.stats, ...(cfg.stats || {}) },
  };
}

export async function saveConfig(patch) {
  const col = await getCollection('robot_config');
  const clean = { ...patch };
  delete clean._id;
  await col.updateOne({ _id: CONFIG_ID }, { $set: clean }, { upsert: true });
  return getConfig();
}

async function log(tipo, mensagem, detalhe = null) {
  try {
    const col = await getCollection('robot_logs');
    await col.insertOne({
      tipo, // 'info' | 'sucesso' | 'erro' | 'aviso'
      mensagem,
      detalhe,
      data: new Date().toISOString(),
    });
    // Mantém os logs enxutos (últimos 500).
    const total = await col.countDocuments();
    if (total > 500) {
      const old = await col
        .find({}, { projection: { _id: 1 } })
        .sort({ data: 1 })
        .limit(total - 500)
        .toArray();
      if (old.length) await col.deleteMany({ _id: { $in: old.map((o) => o._id) } });
    }
  } catch {
    // logging nunca deve quebrar o robô
  }
}

export async function getLogs(limit = 60) {
  const col = await getCollection('robot_logs');
  return col
    .find({}, { projection: { _id: 0 } })
    .sort({ data: -1 })
    .limit(limit)
    .toArray();
}

// Pontuação 0-100 combinando os fatores configurados.
export function computeScore(p, pesos) {
  const w = pesos || DEFAULT_CONFIG.pesos;
  const desconto = Math.min(1, (Number(p.desconto) || 0) / 60); // 60%+ = máximo
  const frete = p.freteGratis ? 1 : 0;
  const disponibilidade = p.disponivel === false ? 0 : 1;
  const popularidade = Math.min(1, Math.log10((Number(p.sold) || 0) + 1) / 4); // ~10k vendas = máx
  const cliques = Math.min(1, Math.log10((Number(p.cliques) || 0) + 1) / 3); // ~1k cliques = máx
  const idadeH = p.updatedAt ? (Date.now() - new Date(p.updatedAt).getTime()) / 3600000 : 999;
  const recente = Math.max(0, 1 - idadeH / 168); // decai ao longo de 7 dias
  const preco = 1 / (1 + (Number(p.preco) || 0) / 1500); // preços menores pontuam mais

  const total =
    desconto * w.desconto +
    frete * w.frete +
    disponibilidade * w.disponibilidade +
    popularidade * w.popularidade +
    cliques * w.cliques +
    recente * w.recente +
    preco * w.preco;
  const maxPeso = Object.values(w).reduce((a, b) => a + (Number(b) || 0), 0) || 1;
  return Math.round((total / maxPeso) * 100);
}

function passesCriteria(p, cfg) {
  if (!p.nome || !p.imagem || !p.preco || !p.permalink) return false;
  if (cfg.precoMin && p.preco < cfg.precoMin) return false;
  if (cfg.precoMax && p.preco > cfg.precoMax) return false;
  if (cfg.exigirFreteGratis && !p.freteGratis) return false;
  if (cfg.descontoMin && (p.desconto || 0) < cfg.descontoMin) return false;
  if (p.disponivel === false) return false;
  return true;
}

function badgeFor(p) {
  if ((p.desconto || 0) >= 25) return 'OFERTA RELÂMPAGO';
  if ((p.sold || 0) >= 500 || (p.reviews || 0) >= 1000) return 'MAIS VENDIDO';
  if ((p.rating || 0) >= 4.7 && (p.reviews || 0) >= 50) return 'MAIS BEM AVALIADO';
  if ((p.desconto || 0) > 0) return 'OFERTA';
  if (p.freteGratis) return 'FRETE GRÁTIS';
  return 'OFERTA';
}

// Verifica ofertas do robô já cadastradas via API oficial e desativa as que
// saíram do ar, perderam frete grátis exigido ou ficaram indisponíveis.
async function verifyExisting(col, cfg, categoria = null) {
  const robotProducts = await col
    .find(categoria ? { source: 'robot', categoria } : { source: 'robot' }, { projection: { _id: 0 } })
    .toArray();

  let expiradas = 0;
  const BATCH = 8;
  for (let i = 0; i < robotProducts.length; i += BATCH) {
    const slice = robotProducts.slice(i, i + BATCH);
    await Promise.all(
      slice.map(async (p) => {
        const status = await getItemStatus(p.mlId);
        if (!status) return; // indeterminado: mantém
        const now = new Date().toISOString();
        const invalida =
          !status.exists ||
          !status.active ||
          status.availableQuantity <= 0 ||
          (cfg.exigirFreteGratis && !status.freeShipping);
        if (invalida) {
          expiradas += 1;
          await col.updateOne(
            { id: p.id },
            {
              $set: {
                ativo: false,
                status: 'expirada',
                motivoInativa: !status.exists
                  ? 'Anúncio removido'
                  : !status.active
                    ? `Status ${status.status}`
                    : status.availableQuantity <= 0
                      ? 'Sem estoque'
                      : 'Perdeu frete grátis',
                lastCheckedAt: now,
                updatedAt: now,
              },
            }
          );
        } else {
          // Atualiza preço (com histórico) e mantém ativa.
          const set = { lastCheckedAt: now, ativo: true, status: 'ativa' };
          if (!p.rating || !p.reviews || !p.badge) {
            const r = await getItemReviews(p.mlId);
            if (r.reviews > 0) {
              set.rating = r.rating;
              set.reviews = r.reviews;
            }
            set.badge = badgeFor({ ...p, ...set, desconto: set.desconto ?? p.desconto });
          }
          if (status.price && status.originalPrice > status.price) {
            set.precoAntigo = status.originalPrice;
            set.desconto = Math.round(
              ((status.originalPrice - status.price) / status.originalPrice) * 100
            );
          }
          if (status.price && status.price !== p.preco) {
            set.preco = status.price;
            await col.updateOne(
              { id: p.id },
              {
                $set: { ...set, updatedAt: now },
                $push: { priceHistory: { preco: status.price, data: now } },
              }
            );
          } else {
            await col.updateOne({ id: p.id }, { $set: set });
          }
        }
      })
    );
  }
  return expiradas;
}

// Deixa cada categoria permitida com exatamente maxPorCategoria ofertas ativas,
// escolhendo as mais bem avaliadas e com frete grátis.
function quotaFor(cfg, categoria) {
  const q = cfg.quotas?.[categoria];
  if (Number.isFinite(Number(q)) && q !== null && q !== undefined) return Math.max(0, Number(q));
  return Math.max(1, Number(cfg.maxPorCategoria) || 1);
}

async function refill(col, cfg, deadline, somenteCategoria = null) {
  let adicionadas = 0;
  let substituidas = 0;
  let ultimaAdicao = null;
  const pendentes = [];

  const permitidas = (cfg.categoriasPermitidas || []).filter((c) => PLATFORM_CATEGORIES.includes(c));
  const categorias = somenteCategoria ? [somenteCategoria] : permitidas.length ? permitidas : PLATFORM_CATEGORIES;

  const processar = async (categoria) => {
    if (Date.now() >= deadline) {
      pendentes.push(categoria);
      return;
    }
    const quantidade = quotaFor(cfg, categoria);
    const todosAtivos = await col
      .find({ categoria, ativo: { $ne: false } }, { projection: { _id: 0, id: 1, source: 1, mlId: 1, permalink: 1, link: 1, rating: 1, reviews: 1, freteGratis: 1, desconto: 1 } })
      .toArray();
    // Manual offers don't count toward the robot's per-category quota and are never touched by it.
    const ativos = todosAtivos.filter((p) => p.source === 'robot');
    const manuais = todosAtivos.filter((p) => p.source !== 'robot');

    // Ofertas sem frete grátis não atendem à regra: saem primeiro.
    const semFrete = ativos.filter((p) => !p.freteGratis);
    const validos = ativos.filter((p) => p.freteGratis).sort(byBestRating);
    const excedentes = validos.slice(quantidade);
    const remover = [...semFrete, ...excedentes];
    const mantidos = validos.slice(0, quantidade);
    const now0 = new Date().toISOString();
    for (const p of remover) {
      await col.updateOne({ id: p.id }, { $set: { ativo: false, status: 'reserva', updatedAt: now0 } });
    }

    // Offers active in OTHER categories are off-limits: reusing them used to move them into this category.
    const deOutras = await col
      .find({ ativo: { $ne: false }, categoria: { $ne: categoria } }, { projection: { _id: 0, mlId: 1, permalink: 1, link: 1 } })
      .toArray();
    const jaAtivos = new Set(
      [...mantidos, ...manuais, ...deOutras].flatMap((p) => [p.mlId, p.permalink, p.link].filter(Boolean))
    );
    const faltam = quantidade - mantidos.length;
    // Categoria completa: ainda busca até 3 ofertas mais bem avaliadas para trocar.
    const trocas = faltam === 0 ? Math.min(3, quantidade) : 0;
    const buscar = faltam > 0 ? faltam : trocas;

    let candidatos;
    try {
      candidatos = await findBestOffers(categoria, {
        quantidade: buscar,
        deadline,
        accept: (o) => passesCriteria(o, cfg) && !jaAtivos.has(o.mlId) && !jaAtivos.has(o.permalink),
        // Only when replacing nothing: fill the chosen amount even if discount/price filters are too tight.
        fallback:
          faltam > 0
            ? (o) => passesCriteria(o, { exigirFreteGratis: true }) && !jaAtivos.has(o.mlId) && !jaAtivos.has(o.permalink)
            : () => false,
      });
    } catch (e) {
      await log('erro', `Falha ao buscar ofertas de ${categoria}`, e.message);
      return;
    }

    const piores = faltam === 0 ? [...mantidos].sort(byBestRating).reverse().slice(0, trocas) : [];
    let usados = 0;

    for (const cand of candidatos) {
      let substituir = null;
      if (faltam === 0) {
        substituir = piores[usados];
        if (!substituir || byBestRating(cand, substituir) >= 0) break;
      } else if (usados >= faltam) break;

      const now = new Date().toISOString();
      const link = buildOutboundLink(cand.permalink, cfg.afiliado);
      const dados = {
        mlId: cand.mlId,
        nome: cand.nome,
        imagem: cand.imagem,
        preco: cand.preco,
        precoAntigo: cand.precoAntigo,
        desconto: cand.desconto,
        categoria,
        categoryId: cand.categoryId,
        rating: Number(cand.rating) || 0,
        reviews: Number(cand.reviews) || 0,
        freteGratis: true,
        link,
        permalink: cand.permalink,
        badge: badgeFor(cand),
        sold: cand.sold,
        disponivel: true,
        ativo: true,
        status: 'ativa',
        updatedAt: now,
        lastCheckedAt: now,
      };
      dados.score = computeScore(dados, cfg.pesos);

      try {
        const existente = await col.findOne(
          { source: 'robot', $or: [{ mlId: cand.mlId }, { link: cand.permalink }, { permalink: cand.permalink }] },
          { projection: { id: 1, categoria: 1, ativo: 1 } }
        );
        if (existente && existente.ativo !== false && existente.categoria !== categoria) continue;
        if (existente) {
          await col.updateOne({ id: existente.id }, { $set: dados });
        } else {
          await col.insertOne({
            id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + Math.random(),
            source: 'robot',
            cliques: 0,
            priceHistory: [{ preco: cand.preco, data: now }],
            createdAt: now,
            ...dados,
          });
        }
      } catch {
        continue;
      }
      usados += 1;
      adicionadas += 1;
      ultimaAdicao = now;
      if (substituir) {
        await col.updateOne({ id: substituir.id }, { $set: { ativo: false, status: 'substituida', updatedAt: now } });
        substituidas += 1;
      }
    }

    if (faltam > 0 && usados < faltam) {
      if (Date.now() >= deadline) {
        pendentes.push(categoria);
      } else {
        await log('aviso', `${categoria}: encontradas ${mantidos.length + usados} de ${quantidade} ofertas com frete grátis`, 'O Mercado Livre não retornou mais produtos que atendam aos critérios nesta categoria.');
      }
    }
  };

  // Several categories at once so a single request covers all of them before the server time limit.
  const fila = [...categorias];
  const workers = Array.from({ length: Math.min(4, fila.length) }, async () => {
    while (fila.length) await processar(fila.shift());
  });
  await Promise.all(workers);

  return { adicionadas, substituidas, ultimaAdicao, pendentes };
}

// Recalcula pontuação de todas as ofertas do robô e aplica o teto de produtos.
async function rescoreAndCap(col, cfg) {
  const all = await col.find({ source: 'robot' }, { projection: { _id: 0 } }).toArray();
  for (const p of all) {
    const score = computeScore(p, cfg.pesos);
    if (score !== p.score) {
      await col.updateOne({ id: p.id }, { $set: { score } });
    }
  }
  // No global cap here: it used to deactivate offers from other categories when one category was filled.
  // The per-category quota in refill() already bounds how many robot offers each category has.
}

let runningLocal = false;

// Execução principal do robô.
async function countValidRobot(col, categoria) {
  return col.countDocuments({ source: 'robot', categoria, ativo: { $ne: false }, freteGratis: true });
}

const CRITERIOS_EXCLUSAO = {
  piores: (a, b) => byBestRating(b, a),
  menosCliques: (a, b) => (Number(a.cliques) || 0) - (Number(b.cliques) || 0),
  antigas: (a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')),
  menorDesconto: (a, b) => (Number(a.desconto) || 0) - (Number(b.desconto) || 0),
  maisCaras: (a, b) => (Number(b.preco) || 0) - (Number(a.preco) || 0),
};

// Exclui N ofertas ativas de uma categoria, escolhidas pelo critério, e baixa a cota
// da categoria para o robô automático não repor as excluídas.
export async function deleteOffers({ categoria, quantidade, criterio = 'piores', origem = 'robot' }) {
  if (!PLATFORM_CATEGORIES.includes(categoria)) return { ok: false, error: 'Categoria inválida.' };
  const n = Math.floor(Number(quantidade));
  if (!Number.isFinite(n) || n < 1) return { ok: false, error: 'Informe uma quantidade maior que zero.' };
  const ordenar = CRITERIOS_EXCLUSAO[criterio] || CRITERIOS_EXCLUSAO.piores;

  const col = await getProductsCollection();
  const filtro = { categoria, ativo: { $ne: false } };
  if (origem === 'robot') filtro.source = 'robot';
  else if (origem === 'manual') filtro.source = { $ne: 'robot' };

  const ofertas = await col
    .find(filtro, { projection: { _id: 0, id: 1, nome: 1, source: 1, rating: 1, reviews: 1, cliques: 1, createdAt: 1, desconto: 1, preco: 1 } })
    .toArray();
  const alvo = ofertas.sort(ordenar).slice(0, n);
  if (!alvo.length) return { ok: true, excluidas: 0, nomes: [] };

  await col.deleteMany({ id: { $in: alvo.map((p) => p.id) } });

  const cfg = await getConfig();
  const restantes = await countValidRobot(col, categoria);
  await saveConfig({ quotas: { ...(cfg.quotas || {}), [categoria]: restantes } });
  await log('info', `${alvo.length} oferta(s) excluída(s) de ${categoria}.`, alvo.map((p) => p.nome).join(' | ').slice(0, 900));

  return { ok: true, excluidas: alvo.length, nomes: alvo.map((p) => p.nome) };
}

function requisitosFaltando(p) {
  const f = [];
  if (!p.badge) f.push('selo');
  if (!p.nome) f.push('nome');
  if (!(Number(p.preco) > 0)) f.push('preço');
  if (!(Number(p.desconto) > 0)) f.push('desconto');
  if (!(Number(p.rating) > 0)) f.push('estrelas');
  if (!(Number(p.reviews) > 0)) f.push('avaliações');
  if (!p.freteGratis) f.push('frete grátis');
  return f;
}

// Completa ofertas ativas sem selo, nome, preço, desconto, estrelas, avaliações ou frete grátis
// com dados reais do Mercado Livre. Ofertas do robô que não têm conserto são trocadas por
// outras da MESMA categoria; ofertas manuais nunca são removidas, só listadas.
// `desde` evita reprocessar, nas rodadas seguintes, ofertas já verificadas nesta sessão.
export async function fixOffers({ desde = null } = {}) {
  if (!hasMlCredentials()) return { ok: false, error: 'Credenciais do Mercado Livre não configuradas.' };
  if (runningLocal) return { ok: false, error: 'O robô já está em execução. Tente de novo em instantes.' };
  runningLocal = true;
  const deadline = Date.now() + Number(process.env.ROBOT_TIME_BUDGET_MS || 40000);
  const resultado = { verificadas: 0, consertadas: 0, trocadas: 0, restantes: 0, semConserto: [] };
  try {
    const cfg = await getConfig();
    const col = await getProductsCollection();
    const ativos = await col.find({ ativo: { $ne: false } }, { projection: { _id: 0, priceHistory: 0 } }).toArray();
    const fila = ativos.filter(
      (p) => requisitosFaltando(p).length && !(desde && p.fixCheckedAt && p.fixCheckedAt >= desde)
    );
    const categoriasParaRepor = new Set();

    const BATCH = 6;
    let i = 0;
    for (; i < fila.length && Date.now() < deadline - 8000; i += BATCH) {
      await Promise.all(
        fila.slice(i, i + BATCH).map(async (p) => {
          const now = new Date().toISOString();
          const set = { fixCheckedAt: now };
          if (p.mlId) {
            const [status, revs, produto] = await Promise.all([
              getItemStatus(p.mlId),
              !(p.rating > 0) || !(p.reviews > 0) ? getItemReviews(p.mlId) : null,
              !p.nome ? mlFetch(`/products/${encodeURIComponent(p.mlId)}`).catch(() => null) : null,
            ]);
            if (status?.active) {
              if (status.price > 0) set.preco = status.price;
              if (status.originalPrice > status.price && status.price > 0) {
                set.precoAntigo = status.originalPrice;
                set.desconto = Math.round(((status.originalPrice - status.price) / status.originalPrice) * 100);
              }
              set.freteGratis = Boolean(status.freeShipping);
            }
            if (revs?.reviews > 0) {
              set.rating = revs.rating;
              set.reviews = revs.reviews;
            }
            if (produto?.name) set.nome = produto.name;
          } else if (Number(p.precoAntigo) > Number(p.preco) && Number(p.preco) > 0 && !(p.desconto > 0)) {
            set.desconto = Math.round(((p.precoAntigo - p.preco) / p.precoAntigo) * 100);
          }
          const atualizado = { ...p, ...set };
          if (!atualizado.badge) set.badge = badgeFor(atualizado);
          atualizado.badge = atualizado.badge || set.badge;

          const antes = requisitosFaltando(p).length;
          const faltam = requisitosFaltando(atualizado);
          if (faltam.length < antes) resultado.consertadas += 1;
          resultado.verificadas += 1;

          if (faltam.length && p.source === 'robot') {
            set.ativo = false;
            set.status = 'reserva';
            set.motivoInativa = `Sem ${faltam.join(', ')}`;
            categoriasParaRepor.add(p.categoria);
            resultado.trocadas += 1;
          } else if (faltam.length) {
            resultado.semConserto.push({ nome: p.nome || '(sem nome)', categoria: p.categoria, faltam });
          }
          set.updatedAt = now;
          await col.updateOne({ id: p.id }, { $set: set });
        })
      );
    }
    resultado.restantes = Math.max(0, fila.length - i);

    // Repõe só as categorias que perderam ofertas, sem mexer nas demais.
    resultado.pendentes = [];
    for (const categoria of categoriasParaRepor) {
      if (!PLATFORM_CATEGORIES.includes(categoria)) continue;
      const r = await refill(col, cfg, deadline, categoria);
      resultado.pendentes.push(...r.pendentes);
    }

    await log(
      'info',
      `Consertador: ${resultado.verificadas} verificadas, ${resultado.consertadas} consertadas, ${resultado.trocadas} trocadas.`
    );
    return { ok: true, ...resultado };
  } catch (e) {
    await log('erro', 'Falha no consertador de ofertas.', e.message);
    return { ok: false, error: e.message };
  } finally {
    runningLocal = false;
  }
}

export async function runRobot({ trigger = 'manual', categoria = null, adicionar = 0 } = {}) {
  if (!hasMlCredentials()) {
    await log('erro', 'Credenciais do Mercado Livre não configuradas.');
    return { ok: false, error: 'Credenciais do Mercado Livre não configuradas.' };
  }
  if (runningLocal) {
    return { ok: false, error: 'O robô já está em execução.' };
  }

  const cfg = await getConfig();
  if (!cfg.ativo && trigger === 'cron') {
    return { ok: false, error: 'Robô pausado.' };
  }
  if (categoria && !PLATFORM_CATEGORIES.includes(categoria)) {
    return { ok: false, error: 'Categoria inválida.' };
  }
  const extra = Math.floor(Number(adicionar) || 0);
  if (categoria && extra > 0) {
    const col = await getProductsCollection();
    const atuais = await countValidRobot(col, categoria);
    cfg.quotas = { ...(cfg.quotas || {}), [categoria]: Math.min(500, atuais + extra) };
    await saveConfig({ quotas: cfg.quotas });
  }

  runningLocal = true;
  const inicio = Date.now();
  await saveConfig({ running: true });
  await log('info', `Execução iniciada (${trigger}).`);

  const resultado = { adicionadas: 0, expiradas: 0, erros: 0 };
  try {
    const col = await getProductsCollection();
    await col.createIndex({ mlId: 1 }, { sparse: true }).catch(() => {});

    // Stay well inside serverless time limits; the admin panel re-runs until no category is pending.
    const deadline = inicio + Number(process.env.ROBOT_TIME_BUDGET_MS || 40000);
    resultado.expiradas = await verifyExisting(col, cfg, categoria);
    const { adicionadas, substituidas, ultimaAdicao, pendentes } = await refill(col, cfg, deadline, categoria);
    if (categoria) resultado.totalCategoria = await countValidRobot(col, categoria);
    resultado.adicionadas = adicionadas;
    resultado.substituidas = substituidas;
    resultado.pendentes = pendentes;
    await rescoreAndCap(col, cfg);

    const now = new Date();
    const nextRun = new Date(now.getTime() + cfg.intervaloMin * 60000).toISOString();

    // Estatísticas do dia.
    const hoje = now.toISOString().slice(0, 10);
    const jaHoje = (cfg.lastRun || '').slice(0, 10) === hoje ? cfg.stats.adicionadasHoje : 0;

    await saveConfig({
      running: false,
      lastRun: now.toISOString(),
      nextRun,
      stats: {
        ...cfg.stats,
        adicionadasHoje: jaHoje + adicionadas,
        expiradas: (cfg.stats.expiradas || 0) + resultado.expiradas,
        erros: cfg.stats.erros || 0,
        ultimaAdicao: ultimaAdicao || cfg.stats.ultimaAdicao,
      },
    });

    const dur = ((Date.now() - inicio) / 1000).toFixed(1);
    await log(
      'sucesso',
      `Execução concluída em ${dur}s: +${adicionadas} adicionadas, ${resultado.expiradas} expiradas.`
    );
    return { ok: true, ...resultado, nextRun };
  } catch (e) {
    resultado.erros = 1;
    await saveConfig({
      running: false,
      stats: { ...cfg.stats, erros: (cfg.stats.erros || 0) + 1 },
    });
    await log('erro', 'Falha na execução do robô.', e.message);
    return { ok: false, error: e.message, ...resultado };
  } finally {
    runningLocal = false;
  }
}

// Métricas para o painel administrativo.
export async function getMetrics() {
  const col = await getProductsCollection();
  const [
    ativas,
    inativas,
    expiradas,
    robotTotal,
    manualTotal,
    porCategoriaAgg,
    maisAcessadasArr,
    cliquesAgg,
  ] = await Promise.all([
    col.countDocuments({ ativo: { $ne: false } }),
    col.countDocuments({ ativo: false }),
    col.countDocuments({ status: 'expirada' }),
    col.countDocuments({ source: 'robot' }),
    col.countDocuments({ source: { $ne: 'robot' } }),
    col
      .aggregate([
        { $match: { ativo: { $ne: false } } },
        { $group: { _id: { $ifNull: ['$categoria', 'Outros'] }, total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ])
      .toArray(),
    col
      .find({ cliques: { $gt: 0 } }, { projection: { _id: 0, id: 1, nome: 1, cliques: 1, categoria: 1 } })
      .sort({ cliques: -1 })
      .limit(8)
      .toArray(),
    col.aggregate([{ $group: { _id: null, total: { $sum: { $ifNull: ['$cliques', 0] } } } }]).toArray(),
  ]);

  const cfg = await getConfig();
  const hoje = new Date().toISOString().slice(0, 10);
  const adicionadasHoje = await col.countDocuments({
    source: 'robot',
    createdAt: { $gte: hoje },
  });

  return {
    ativas,
    inativas,
    expiradas,
    robotTotal,
    manualTotal,
    adicionadasHoje,
    totalCliques: cliquesAgg[0]?.total || 0,
    porCategoria: porCategoriaAgg.map((c) => ({ categoria: c._id, total: c.total })),
    maisAcessadas: maisAcessadasArr,
    robo: {
      ativo: cfg.ativo,
      running: cfg.running,
      lastRun: cfg.lastRun,
      nextRun: cfg.nextRun,
      intervaloMin: cfg.intervaloMin,
    },
  };
}
