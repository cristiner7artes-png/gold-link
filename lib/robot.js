// Robô automático de ofertas — busca, valida, categoriza, pontua, deduplica e
// substitui ofertas usando SOMENTE a API oficial do Mercado Livre.

import { getProductsCollection, getCollection } from './mongodb';
import {
  hasMlCredentials,
  searchCategoryOffers,
  getItemStatus,
  buildOutboundLink,
  ALL_CATEGORIES,
} from './mercadolivre';

const CONFIG_ID = 'config';

export const DEFAULT_CONFIG = {
  _id: CONFIG_ID,
  ativo: true, // robô habilitado
  intervaloMin: 60, // minutos entre execuções automáticas
  maxPorCategoria: 12,
  maxProdutos: 150,
  precoMin: 0,
  precoMax: 0, // 0 = sem limite
  exigirFreteGratis: false,
  descontoMin: 0,
  categoriasPermitidas: [...ALL_CATEGORIES],
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
  if ((p.sold || 0) >= 500) return 'MAIS VENDIDO';
  return null;
}

// Verifica ofertas do robô já cadastradas via API oficial e desativa as que
// saíram do ar, perderam frete grátis exigido ou ficaram indisponíveis.
async function verifyExisting(col, cfg) {
  const robotProducts = await col
    .find({ source: 'robot' }, { projection: { _id: 0 } })
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
          if (status.price && status.price !== p.preco) {
            set.preco = status.price;
            if (status.originalPrice > status.price) {
              set.precoAntigo = status.originalPrice;
              set.desconto = Math.round(
                ((status.originalPrice - status.price) / status.originalPrice) * 100
              );
            }
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

// Reabastece cada categoria permitida até maxPorCategoria com ofertas reais.
async function refill(col, cfg) {
  let adicionadas = 0;
  let ultimaAdicao = null;

  for (const categoria of cfg.categoriasPermitidas) {
    const ativosNaCategoria = await col.countDocuments({
      categoria,
      ativo: { $ne: false },
    });
    const faltam = cfg.maxPorCategoria - ativosNaCategoria;
    if (faltam <= 0) continue;

    let ofertas;
    try {
      ofertas = await searchCategoryOffers(categoria, { limit: 50, onlyDeals: true });
    } catch (e) {
      await log('erro', `Falha ao buscar ofertas de ${categoria}`, e.message);
      continue;
    }

    // Ordena por pontuação e filtra pelos critérios.
    const candidatos = ofertas
      .filter((p) => passesCriteria(p, cfg))
      .map((p) => ({ ...p, cliques: 0 }))
      .sort((a, b) => computeScore(b, cfg.pesos) - computeScore(a, cfg.pesos));

    for (const cand of candidatos) {
      if (adicionadas >= faltam) break;
      // Dedup por mlId ou pelo permalink.
      const existe = await col.findOne(
        { $or: [{ mlId: cand.mlId }, { link: cand.permalink }, { permalink: cand.permalink }] },
        { projection: { id: 1, ativo: 1 } }
      );
      if (existe) {
        // Se existia mas estava inativa, reativa em vez de duplicar.
        if (existe.ativo === false) {
          await col.updateOne(
            { id: existe.id },
            { $set: { ativo: true, status: 'ativa', updatedAt: new Date().toISOString() } }
          );
        }
        continue;
      }

      const now = new Date().toISOString();
      const link = buildOutboundLink(cand.permalink, cfg.afiliado);
      const doc = {
        id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + Math.random(),
        source: 'robot',
        mlId: cand.mlId,
        nome: cand.nome,
        imagem: cand.imagem,
        preco: cand.preco,
        precoAntigo: cand.precoAntigo,
        desconto: cand.desconto,
        categoria: cand.categoria,
        categoryId: cand.categoryId,
        rating: Number(cand.rating) || 0,
        reviews: Number(cand.reviews) || 0,
        freteGratis: cand.freteGratis,
        link,
        permalink: cand.permalink,
        badge: badgeFor(cand),
        sold: cand.sold,
        disponivel: true,
        cliques: 0,
        ativo: true,
        status: 'ativa',
        score: 0,
        priceHistory: [{ preco: cand.preco, data: now }],
        createdAt: now,
        updatedAt: now,
        lastCheckedAt: now,
      };
      doc.score = computeScore(doc, cfg.pesos);
      try {
        await col.insertOne(doc);
        adicionadas += 1;
        ultimaAdicao = now;
      } catch (e) {
        // provável duplicidade por índice único — ignora
      }
    }
  }
  return { adicionadas, ultimaAdicao };
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
  // Teto global: desativa as de menor pontuação que excederem maxProdutos.
  const ativos = all
    .filter((p) => p.ativo !== false)
    .sort((a, b) => computeScore(b, cfg.pesos) - computeScore(a, cfg.pesos));
  if (ativos.length > cfg.maxProdutos) {
    const excedente = ativos.slice(cfg.maxProdutos);
    for (const p of excedente) {
      await col.updateOne(
        { id: p.id },
        { $set: { ativo: false, status: 'reserva', updatedAt: new Date().toISOString() } }
      );
    }
  }
}

let runningLocal = false;

// Execução principal do robô.
export async function runRobot({ trigger = 'manual' } = {}) {
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

  runningLocal = true;
  const inicio = Date.now();
  await saveConfig({ running: true });
  await log('info', `Execução iniciada (${trigger}).`);

  const resultado = { adicionadas: 0, expiradas: 0, erros: 0 };
  try {
    const col = await getProductsCollection();
    await col.createIndex({ mlId: 1 }, { sparse: true }).catch(() => {});

    resultado.expiradas = await verifyExisting(col, cfg);
    const { adicionadas, ultimaAdicao } = await refill(col, cfg);
    resultado.adicionadas = adicionadas;
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
