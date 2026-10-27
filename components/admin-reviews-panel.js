'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, EyeOff, Trash2, RefreshCw } from 'lucide-react';
import { Stars } from './reviews-section';

export default function AdminReviewsPanel({ token }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState('pendente');
  const auth = { Authorization: `Bearer ${token}` };

  async function load() {
    setLoading(true);
    setErro('');
    try {
      const r = await fetch('/api/admin/reviews', { headers: auth });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Erro ao carregar avaliações');
      setReviews(Array.isArray(d) ? d : []);
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(id, status) {
    const r = await fetch(`/api/admin/reviews/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (r.ok) setReviews((list) => list.map((x) => (x.id === id ? { ...x, status } : x)));
  }

  async function remove(id) {
    if (!confirm('Excluir esta avaliação?')) return;
    const r = await fetch(`/api/admin/reviews/${encodeURIComponent(id)}`, { method: 'DELETE', headers: auth });
    if (r.ok) setReviews((list) => list.filter((x) => x.id !== id));
  }

  const pendentes = reviews.filter((r) => r.status !== 'aprovada').length;
  const visiveis = reviews.filter((r) => (filtro === 'todas' ? true : filtro === 'aprovada' ? r.status === 'aprovada' : r.status !== 'aprovada'));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0F172A]">Avaliações dos clientes</h2>
          <p className="text-sm text-slate-500">Aprove as avaliações para que apareçam na página inicial.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {[
          ['pendente', `Pendentes (${pendentes})`],
          ['aprovada', `Aprovadas (${reviews.length - pendentes})`],
          ['todas', `Todas (${reviews.length})`],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${filtro === key ? 'bg-[#1565C0] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {erro && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-[#E53935]">{erro}</p>}

      {!loading && visiveis.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">Nenhuma avaliação aqui.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visiveis.map((r) => {
            const aprovada = r.status === 'aprovada';
            return (
              <article key={r.id} className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <Stars value={r.nota} />
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${aprovada ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {aprovada ? 'Aprovada' : 'Pendente'}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{r.comentario}</p>
                <p className="text-xs text-slate-500">
                  <strong className="text-[#0F172A]">{r.nome}</strong>
                  {r.cidade && ` · ${r.cidade}`}
                  {r.produto && ` · Produto: ${r.produto}`}
                  {r.criadoEm && ` · ${new Date(r.criadoEm).toLocaleString('pt-BR')}`}
                </p>
                <div className="flex flex-wrap gap-2 border-t border-black/5 pt-3">
                  {aprovada ? (
                    <button onClick={() => setStatus(r.id, 'pendente')} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200">
                      <EyeOff className="h-3.5 w-3.5" /> Ocultar do site
                    </button>
                  ) : (
                    <button onClick={() => setStatus(r.id, 'aprovada')} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                    </button>
                  )}
                  <button onClick={() => remove(r.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-[#E53935] hover:bg-red-100">
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
