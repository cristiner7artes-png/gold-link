'use client';

import { useState } from 'react';
import { PlusCircle, Trash2, Wrench } from 'lucide-react';

const inputCls =
  'w-full min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30 focus:border-[#1565C0]';

const CRITERIOS = [
  { value: 'piores', label: 'Piores avaliadas' },
  { value: 'menosCliques', label: 'Menos clicadas' },
  { value: 'antigas', label: 'Mais antigas' },
  { value: 'menorDesconto', label: 'Menor desconto' },
  { value: 'maisCaras', label: 'Mais caras' },
];

const ORIGENS = [
  { value: 'robot', label: 'Somente do robô' },
  { value: 'manual', label: 'Somente manuais' },
  { value: 'todas', label: 'Todas' },
];

async function readJson(r, fallback) {
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || fallback);
  return d;
}

function Label({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
      {children}
    </label>
  );
}

export default function RobotCategoryTools({ token, categorias, porCategoria, disabled, onDone }) {
  const auth = { Authorization: `Bearer ${token}` };
  const totalDe = (cat) => porCategoria?.find((c) => c.categoria === cat)?.total ?? 0;

  const [addCat, setAddCat] = useState(categorias[0] || '');
  const [addQtd, setAddQtd] = useState(10);
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState(null);

  const [delCat, setDelCat] = useState(categorias[0] || '');
  const [delQtd, setDelQtd] = useState(5);
  const [criterio, setCriterio] = useState('piores');
  const [origem, setOrigem] = useState('robot');
  const [deleting, setDeleting] = useState(false);
  const [delMsg, setDelMsg] = useState(null);

  const [fixing, setFixing] = useState(false);
  const [fixMsg, setFixMsg] = useState(null);

  async function consertar() {
    setFixing(true);
    setFixMsg(null);
    const desde = new Date().toISOString();
    const soma = { verificadas: 0, consertadas: 0, trocadas: 0, semConserto: [] };
    try {
      for (let rodada = 0; rodada < 15; rodada++) {
        const r = await fetch('/api/admin/robot/fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...auth },
          body: JSON.stringify({ desde }),
        });
        const d = await readJson(r, 'Não foi possível consertar as ofertas');
        soma.verificadas += d.verificadas || 0;
        soma.consertadas += d.consertadas || 0;
        soma.trocadas += d.trocadas || 0;
        soma.semConserto.push(...(d.semConserto || []));
        setFixMsg({ tipo: 'ok', texto: `Consertando... ${soma.verificadas} ofertas verificadas.` });
        if (!d.restantes && !d.pendentes?.length) break;
      }
      setFixMsg({
        tipo: soma.semConserto.length ? 'aviso' : 'ok',
        texto: soma.verificadas
          ? `${soma.verificadas} ofertas incompletas verificadas: ${soma.consertadas} consertadas e ${soma.trocadas} do robô trocadas por ofertas completas da mesma categoria.`
          : 'Todas as ofertas já têm selo, nome, preço, desconto, estrelas, avaliações e frete grátis.',
        itens: soma.semConserto.map((s) => `${s.nome} (${s.categoria}) — falta: ${s.faltam.join(', ')}`),
      });
      onDone?.();
    } catch (err) {
      setFixMsg({ tipo: 'erro', texto: err.message });
    } finally {
      setFixing(false);
    }
  }

  async function adicionar(e) {
    e.preventDefault();
    const qtd = Math.floor(Number(addQtd));
    if (!addCat || !qtd || qtd < 1) return;
    setAdding(true);
    setAddMsg(null);
    try {
      let total = 0;
      let d;
      // First call sets the category target; later calls only finish the same category.
      for (let rodada = 0; rodada < 10; rodada++) {
        const body = rodada === 0 ? { categoria: addCat, adicionar: qtd } : { categoria: addCat };
        const r = await fetch('/api/admin/robot/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...auth },
          body: JSON.stringify(body),
        });
        d = await readJson(r, 'Não foi possível buscar ofertas');
        total += d.adicionadas || 0;
        setAddMsg({ tipo: 'ok', texto: `Buscando... ${total} de ${qtd} adicionadas em ${addCat}.` });
        if (!d.pendentes?.length) break;
      }
      setAddMsg({
        tipo: total >= qtd ? 'ok' : 'aviso',
        texto:
          total >= qtd
            ? `${total} ofertas adicionadas em ${addCat}. Outras categorias não foram alteradas.`
            : `${total} de ${qtd} ofertas adicionadas em ${addCat}. O Mercado Livre não tinha mais ofertas com frete grátis que atendam aos filtros.`,
      });
      onDone?.();
    } catch (err) {
      setAddMsg({ tipo: 'erro', texto: err.message });
    } finally {
      setAdding(false);
    }
  }

  async function excluir(e) {
    e.preventDefault();
    const qtd = Math.floor(Number(delQtd));
    if (!delCat || !qtd || qtd < 1) return;
    const crit = CRITERIOS.find((c) => c.value === criterio)?.label.toLowerCase();
    if (!window.confirm(`Excluir ${qtd} oferta(s) (${crit}) da categoria ${delCat}? Isso não pode ser desfeito.`)) return;
    setDeleting(true);
    setDelMsg(null);
    try {
      const r = await fetch('/api/admin/robot/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ categoria: delCat, quantidade: qtd, criterio, origem }),
      });
      const d = await readJson(r, 'Não foi possível excluir as ofertas');
      setDelMsg({
        tipo: d.excluidas ? 'ok' : 'aviso',
        texto: d.excluidas
          ? `${d.excluidas} oferta(s) excluída(s) de ${delCat}.`
          : `Nenhuma oferta encontrada em ${delCat} com esse filtro.`,
        nomes: d.nomes || [],
      });
      onDone?.();
    } catch (err) {
      setDelMsg({ tipo: 'erro', texto: err.message });
    } finally {
      setDeleting(false);
    }
  }

  const msgCls = (t) =>
    t === 'erro'
      ? 'bg-red-50 border-red-200 text-[#E53935]'
      : t === 'aviso'
        ? 'bg-amber-50 border-amber-200 text-amber-800'
        : 'bg-emerald-50 border-emerald-200 text-emerald-800';

  const ocupado = adding || deleting || fixing;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <section className="lg:col-span-2 bg-white rounded-2xl border border-black/5 shadow-sm p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-extrabold text-[#0F172A]">
              <Wrench className="w-5 h-5 text-[#1565C0]" /> Consertador de ofertas
            </h3>
            <p className="text-sm text-slate-500 mt-1 text-pretty">
              Completa as ofertas sem selo, nome, preço, desconto, estrelas, avaliações ou frete grátis com dados do Mercado Livre. Ofertas do robô sem conserto são trocadas na mesma categoria.
            </p>
          </div>
          <button type="button" onClick={consertar} disabled={ocupado || disabled}
            className="inline-flex shrink-0 items-center justify-center gap-2 min-h-[44px] bg-[#1565C0] hover:bg-[#0D47A1] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-5 rounded-lg transition">
            <Wrench className="w-5 h-5" /> {fixing ? 'Consertando...' : 'Consertar ofertas'}
          </button>
        </div>
        {fixMsg && (
          <div role="status" className={`text-sm border rounded-xl p-3 ${msgCls(fixMsg.tipo)}`}>
            <p className="font-semibold">{fixMsg.texto}</p>
            {fixMsg.itens?.length > 0 && (
              <>
                <p className="mt-2">Ofertas manuais que não puderam ser completadas (edite ou exclua):</p>
                <ul className="mt-1 list-disc pl-5 space-y-0.5 max-h-40 overflow-y-auto">
                  {fixMsg.itens.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </>
            )}
          </div>
        )}
      </section>

      <form onSubmit={adicionar} className="bg-white rounded-2xl border border-black/5 shadow-sm p-5 flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2 font-extrabold text-[#0F172A]">
            <PlusCircle className="w-5 h-5 text-[#22C55E]" /> Adicionar ofertas em uma categoria
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Busca a quantidade escolhida só nesta categoria, com frete grátis e melhores avaliações. As outras categorias não mudam.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="add-cat">Categoria</Label>
            <select id="add-cat" className={inputCls} value={addCat} onChange={(e) => setAddCat(e.target.value)}>
              {categorias.map((c) => (
                <option key={c} value={c}>{c} ({totalDe(c)})</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="add-qtd">Quantidade</Label>
            <input id="add-qtd" type="number" min={1} max={200} className={inputCls} value={addQtd}
              onChange={(e) => setAddQtd(e.target.value)} />
          </div>
        </div>
        <button type="submit" disabled={ocupado || disabled}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] bg-[#22C55E] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-4 rounded-lg transition">
          <PlusCircle className="w-5 h-5" /> {adding ? 'Buscando ofertas...' : `Adicionar ${Number(addQtd) || 0} em ${addCat}`}
        </button>
        {addMsg && (
          <p role="status" className={`text-sm font-semibold border rounded-xl p-3 ${msgCls(addMsg.tipo)}`}>{addMsg.texto}</p>
        )}
      </form>

      <form onSubmit={excluir} className="bg-white rounded-2xl border border-black/5 shadow-sm p-5 flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2 font-extrabold text-[#0F172A]">
            <Trash2 className="w-5 h-5 text-[#E53935]" /> Excluir ofertas de uma categoria
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Exclui a quantidade escolhida só desta categoria. O robô automático não repõe as excluídas.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="del-cat">Categoria</Label>
            <select id="del-cat" className={inputCls} value={delCat} onChange={(e) => setDelCat(e.target.value)}>
              {categorias.map((c) => (
                <option key={c} value={c}>{c} ({totalDe(c)})</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="del-qtd">Quantidade</Label>
            <input id="del-qtd" type="number" min={1} max={500} className={inputCls} value={delQtd}
              onChange={(e) => setDelQtd(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="del-crit">Quais excluir</Label>
            <select id="del-crit" className={inputCls} value={criterio} onChange={(e) => setCriterio(e.target.value)}>
              {CRITERIOS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="del-orig">Origem</Label>
            <select id="del-orig" className={inputCls} value={origem} onChange={(e) => setOrigem(e.target.value)}>
              {ORIGENS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" disabled={ocupado}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] bg-[#E53935] hover:bg-[#c62828] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-4 rounded-lg transition">
          <Trash2 className="w-5 h-5" /> {deleting ? 'Excluindo...' : `Excluir ${Number(delQtd) || 0} de ${delCat}`}
        </button>
        {delMsg && (
          <div role="status" className={`text-sm border rounded-xl p-3 ${msgCls(delMsg.tipo)}`}>
            <p className="font-semibold">{delMsg.texto}</p>
            {delMsg.nomes?.length > 0 && (
              <ul className="mt-2 list-disc pl-5 space-y-0.5 max-h-40 overflow-y-auto">
                {delMsg.nomes.map((n, i) => <li key={i} className="truncate">{n}</li>)}
              </ul>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
