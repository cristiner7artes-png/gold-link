import { ToolLoopAgent, tool, createAgentUIStreamResponse } from 'ai';
import { z } from 'zod';
import { getStore } from '@netlify/blobs';
import { getProductsCollection } from '../../../../lib/mongodb';
import { runRobot, getConfig, saveConfig, getMetrics } from '../../../../lib/robot';
import { hasMlCredentials, PLATFORM_CATEGORIES } from '../../../../lib/mercadolivre';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'gl_dev_token';
const BADGES = ['MAIS VENDIDO', 'OFERTA RELÂMPAGO', 'FRETE GRÁTIS', 'NOVO'];
const MUTATING_TOOLS = ['excluirOfertas', 'atualizarOferta', 'ativarDesativarOfertas', 'controlarRobo', 'atualizarBanner'];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const descricao = z
  .string()
  .describe('Resumo curto em português da alteração, mostrado ao administrador para aprovação.');

const tools = {
  resumoSite: tool({
    description: 'Mostra um resumo do site: total de ofertas, ativas, inativas, por categoria, cliques e status do robô.',
    inputSchema: z.object({}),
    execute: async () => {
      const collection = await getProductsCollection();
      const [total, ativas, porCategoria, cfg, metrics] = await Promise.all([
        collection.countDocuments(),
        collection.countDocuments({ ativo: { $ne: false } }),
        collection
          .aggregate([{ $group: { _id: '$categoria', total: { $sum: 1 }, cliques: { $sum: { $ifNull: ['$cliques', 0] } } } }])
          .toArray(),
        getConfig(),
        getMetrics().catch(() => null),
      ]);
      return {
        total,
        ativas,
        inativas: total - ativas,
        porCategoria: porCategoria.map((c) => ({ categoria: c._id || 'Sem categoria', total: c.total, cliques: c.cliques })),
        robo: { ativo: cfg.ativo, rodando: cfg.running, ultimaExecucao: cfg.lastRun, credenciaisML: hasMlCredentials() },
        metricas: metrics,
      };
    },
  }),

  buscarOfertas: tool({
    description: 'Busca ofertas cadastradas. Use antes de editar ou excluir para obter os IDs.',
    inputSchema: z.object({
      texto: z.string().optional().describe('Trecho do nome do produto'),
      categoria: z.string().optional(),
      ativo: z.boolean().optional(),
      descontoMax: z.number().optional().describe('Somente ofertas com desconto menor ou igual a este valor (%)'),
      semCliques: z.boolean().optional().describe('Somente ofertas sem nenhum clique'),
      limite: z.number().int().min(1).max(200).default(30),
    }),
    execute: async ({ texto, categoria, ativo, descontoMax, semCliques, limite }) => {
      const filter = {};
      if (texto) filter.nome = { $regex: escapeRegex(texto), $options: 'i' };
      if (categoria) filter.categoria = { $regex: `^${escapeRegex(categoria)}$`, $options: 'i' };
      if (ativo === true) filter.ativo = { $ne: false };
      if (ativo === false) filter.ativo = false;
      if (typeof descontoMax === 'number') filter.desconto = { $lte: descontoMax };
      if (semCliques) filter.$or = [{ cliques: { $exists: false } }, { cliques: 0 }];
      const collection = await getProductsCollection();
      const [total, itens] = await Promise.all([
        collection.countDocuments(filter),
        collection
          .find(filter, {
            projection: { _id: 0, id: 1, nome: 1, preco: 1, precoAntigo: 1, desconto: 1, categoria: 1, ativo: 1, cliques: 1, badge: 1, freteGratis: 1 },
          })
          .sort({ createdAt: -1 })
          .limit(limite)
          .toArray(),
      ]);
      return { total, retornados: itens.length, itens };
    },
  }),

  excluirOfertas: tool({
    description: 'Exclui permanentemente ofertas pelos IDs.',
    inputSchema: z.object({ descricao, ids: z.array(z.string()).min(1).max(200) }),
    execute: async ({ ids }) => {
      const collection = await getProductsCollection();
      const result = await collection.deleteMany({ id: { $in: ids } });
      return { excluidas: result.deletedCount };
    },
  }),

  ativarDesativarOfertas: tool({
    description: 'Ativa (mostra na vitrine) ou desativa (esconde da vitrine) ofertas pelos IDs, sem excluí-las.',
    inputSchema: z.object({ descricao, ids: z.array(z.string()).min(1).max(200), ativo: z.boolean() }),
    execute: async ({ ids, ativo }) => {
      const collection = await getProductsCollection();
      const result = await collection.updateMany(
        { id: { $in: ids } },
        { $set: { ativo, updatedAt: new Date().toISOString() } }
      );
      return { alteradas: result.modifiedCount, ativo };
    },
  }),

  atualizarOferta: tool({
    description: 'Altera campos de uma oferta. Envie apenas os campos que devem mudar.',
    inputSchema: z.object({
      descricao,
      id: z.string(),
      campos: z.object({
        nome: z.string().min(1).optional(),
        preco: z.number().positive().optional(),
        precoAntigo: z.number().min(0).optional(),
        categoria: z.enum(PLATFORM_CATEGORIES).optional(),
        badge: z.enum(BADGES).nullable().optional().describe('Selo da oferta; null remove o selo'),
        freteGratis: z.boolean().optional(),
        link: z.string().url().optional(),
        imagem: z.string().url().optional(),
      }),
    }),
    execute: async ({ id, campos }) => {
      const collection = await getProductsCollection();
      const atual = await collection.findOne({ id }, { projection: { _id: 0 } });
      if (!atual) return { erro: 'Oferta não encontrada' };
      const update = { ...campos, updatedAt: new Date().toISOString() };
      if (campos.preco !== undefined || campos.precoAntigo !== undefined) {
        const preco = campos.preco ?? atual.preco;
        const precoAntigo = campos.precoAntigo ?? atual.precoAntigo;
        update.desconto = precoAntigo > preco ? Math.round(((precoAntigo - preco) / precoAntigo) * 100) : 0;
      }
      await collection.updateOne({ id }, { $set: update });
      return { atualizada: true, id, campos: update };
    },
  }),

  controlarRobo: tool({
    description: 'Controla o robô de ofertas: executar agora, pausar ou retomar.',
    inputSchema: z.object({ descricao, acao: z.enum(['executar', 'pausar', 'retomar']) }),
    execute: async ({ acao }) => {
      if (acao === 'pausar' || acao === 'retomar') {
        const cfg = await saveConfig({ ativo: acao === 'retomar' });
        return { ativo: cfg.ativo };
      }
      if (!hasMlCredentials()) return { erro: 'Credenciais do Mercado Livre não configuradas.' };
      const result = await runRobot({ trigger: 'manual' });
      return result.ok ? result : { erro: result.error || 'Falha ao executar o robô' };
    },
  }),

  atualizarBanner: tool({
    description: 'Altera o banner da página inicial. Envie apenas os campos que devem mudar.',
    inputSchema: z.object({
      descricao,
      ativo: z.boolean().optional(),
      titulo: z.string().optional(),
      subtitulo: z.string().optional(),
      cta: z.string().optional(),
      link: z.string().optional(),
      imagem: z.string().optional(),
    }),
    execute: async ({ descricao: _descricao, ...campos }) => {
      const store = getStore({ name: 'goldlink-settings', consistency: 'strong' });
      const atual = (await store.get('banner', { type: 'json' }).catch(() => null)) || {};
      const banner = { cta: 'Ver Ofertas', ...atual, ...campos, updatedAt: new Date().toISOString() };
      await store.setJSON('banner', banner);
      return banner;
    },
  }),
};

const agent = new ToolLoopAgent({
  model: 'anthropic/claude-sonnet-4.6',
  instructions: `Você é o assistente do painel administrativo do Gold Link, um site de ofertas do Mercado Livre.
Responda sempre em português do Brasil, de forma curta e clara.
Você pode consultar e alterar o site usando as ferramentas disponíveis.
Categorias válidas: ${PLATFORM_CATEGORIES.join(', ')}.
Regras:
- Antes de editar, ativar/desativar ou excluir, use buscarOfertas para obter os IDs reais. Nunca invente IDs.
- Quando o pedido for ambíguo e puder afetar muitas ofertas, mostre o que encontrou e pergunte antes.
- Toda alteração precisa da aprovação do administrador. Preencha "descricao" com um resumo claro (ex.: "Excluir 12 ofertas de Moda sem cliques").
- Se uma alteração não for aprovada, não tente de novo; pergunte o que o administrador prefere.
- Depois de cada alteração, informe o resultado em uma frase.
- Você não altera o código, o layout ou as cores do site; só os dados (ofertas, banner e robô).`,
  tools,
  toolApproval: Object.fromEntries(MUTATING_TOOLS.map((name) => [name, 'user-approval'])),
});

export async function POST(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || token !== ADMIN_TOKEN) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { messages } = await request.json();
  return createAgentUIStreamResponse({ agent, uiMessages: messages });
}
