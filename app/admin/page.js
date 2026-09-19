'use client';

import { useEffect, useState } from 'react';
import { Flame, LogOut, Plus, X, Save, LogIn, Package, Sparkles, Download, ImagePlus, Pencil, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'goldlink_admin_token';
const CATEGORIAS = ['Eletrônicos', 'Casa', 'Moda', 'Esportes', 'Beleza', 'Infantil'];
const BADGES = ['', 'MAIS VENDIDO', 'OFERTA RELÂMPAGO', 'FRETE GRÁTIS', 'NOVO'];

async function readApiResponse(response, fallbackMessage = 'Não foi possível concluir a operação') {
  const contentType = response.headers.get('content-type') || '';
  let data = null;

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      throw new Error('A API retornou uma resposta incompleta. Tente novamente.');
    }
  } else {
    // Consume the response without exposing a possible HTML error page to the user.
    await response.text();
  }

  if (!response.ok) {
    throw new Error(data?.error || `${fallbackMessage} (erro ${response.status})`);
  }
  if (data === null) {
    throw new Error(`${fallbackMessage}: o servidor retornou uma resposta inesperada.`);
  }

  return data;
}

const emptyForm = {
  nome: '',
  imagem: '',
  preco: '',
  precoAntigo: '',
  desconto: '',
  categoria: 'Eletrônicos',
  rating: 0,
  reviews: 0,
  freteGratis: false,
  link: '',
  badge: '',
};

export default function AdminPage() {
  const [token, setToken] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!t) {
      setChecking(false);
      return;
    }
    fetch('/api/admin/verify', { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => readApiResponse(r, 'Não foi possível validar a sessão'))
      .then((d) => {
        if (d.valid) setToken(t);
        else localStorage.removeItem(STORAGE_KEY);
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-slate-500">Carregando...</div>
      </div>
    );
  }

  if (!token) return <LoginScreen onLogin={(t) => { localStorage.setItem(STORAGE_KEY, t); setToken(t); }} />;

  return <Dashboard token={token} onLogout={() => { localStorage.removeItem(STORAGE_KEY); setToken(null); }} />;
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const d = await readApiResponse(r, 'Não foi possível entrar');
      onLogin(d.token);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #E53935 0%, #FF6F00 50%, #1565C0 100%)' }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6F00] to-[#E53935] flex items-center justify-center shadow-md">
            <Flame className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-2xl font-extrabold">
              <span className="text-[#FF6F00]">Gold</span>
              <span className="text-[#1565C0]">Link</span>
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Painel Admin</div>
          </div>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-[#0F172A]">Acesso restrito</h1>
        <p className="text-sm text-slate-500">Entre com suas credenciais para gerenciar as ofertas.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              className="mt-1 w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/20 outline-none transition"
              placeholder="usergold"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="mt-1 w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/20 outline-none transition"
              placeholder="••••••"
            />
          </div>
          {error && (
            <div className="text-sm text-[#E53935] bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#E53935] hover:bg-[#c62828] disabled:opacity-60 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <a href="/" className="mt-6 block text-center text-xs text-slate-500 hover:text-[#1565C0]">
          ← Voltar para o site
        </a>
      </div>
    </div>
  );
}

function Dashboard({ token, onLogout }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | product
  const [bannerOpen, setBannerOpen] = useState(false);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    fetch('/api/banner')
      .then((r) => readApiResponse(r, 'Não foi possível carregar o banner'))
      .then(setBanner)
      .catch(() => {});
  }, []);

  async function handleSaveBanner(data) {
    const r = await fetch('/api/banner', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    const d = await readApiResponse(r, 'Não foi possível salvar o banner');
    setBanner(d);
    setBannerOpen(false);
  }

  async function reload() {
    setLoading(true);
    const r = await fetch('/api/products');
    const d = await readApiResponse(r, 'Não foi possível carregar as ofertas');
    setProducts(Array.isArray(d) ? d : []);
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  function newOffer() {
    setEditing('new');
  }

  async function handleDelete(product) {
    if (typeof window !== 'undefined' && !window.confirm(`Excluir a oferta "${product.nome}"?`)) return;
    try {
      const r = await fetch(`/api/products/${encodeURIComponent(product.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await readApiResponse(r, 'Não foi possível excluir a oferta');
      await reload();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white border-b border-black/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF6F00] to-[#E53935] flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-lg font-extrabold leading-none">
                <span className="text-[#FF6F00]">Gold</span>
                <span className="text-[#1565C0]">Link</span>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Admin</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" target="_blank" className="text-sm font-semibold text-[#1565C0] hover:underline">Ver site ↗</a>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#E53935] transition"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-[#0F172A]">Ofertas</h1>
            <p className="text-sm text-slate-500">
              <Package className="inline w-4 h-4 mr-1 -mt-0.5" />
              {products.length} {products.length === 1 ? 'oferta cadastrada' : 'ofertas cadastradas'}
              <span className="ml-2 text-[11px] font-semibold text-slate-400">
                (produtos salvos no banco de dados e exibidos no site)
              </span>
            </p>
          </div>
          <div className="flex flex-col items-stretch sm:items-end gap-2">
            <button
              onClick={newOffer}
              className="inline-flex items-center justify-center gap-2 bg-[#E53935] hover:bg-[#c62828] text-white font-bold px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition"
            >
              <Plus className="w-5 h-5" /> Colocar Oferta
            </button>
            <button
              onClick={() => setBannerOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-[#0A0A0A] hover:bg-[#1a1a1a] text-[#FFD600] font-bold px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition"
            >
              <ImagePlus className="w-5 h-5" />
              Colocar Banner
              {banner && banner.ativo && (
                <span className="ml-1 text-[10px] font-extrabold uppercase bg-[#FFD600] text-black px-1.5 py-0.5 rounded">
                  no ar
                </span>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500">Carregando...</div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200">
            <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="font-bold text-[#0F172A]">Nenhuma oferta cadastrada</h3>
            <p className="text-sm text-slate-500 mt-1">Clique em “Colocar Oferta” para começar.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-black/5 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-3">Produto</th>
                    <th className="text-left px-4 py-3">Categoria</th>
                    <th className="text-right px-4 py-3">Preço</th>
                    <th className="text-right px-4 py-3">Desc.</th>
                    <th className="text-center px-4 py-3">Frete</th>
                    <th className="text-center px-4 py-3">Avaliação</th>
                    <th className="text-center px-4 py-3">Link</th>
                    <th className="text-right px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                            {p.imagem && <img src={p.imagem} alt={p.nome} className="w-full h-full object-cover" />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-[#0F172A] truncate max-w-xs">{p.nome}</div>
                            {p.badge && <div className="text-[10px] font-bold text-[#FF6F00] uppercase">{p.badge}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.categoria}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-bold text-[#22C55E]">R$ {Number(p.preco).toFixed(2)}</div>
                        {p.precoAntigo > 0 && (
                          <div className="text-xs text-slate-400 line-through">R$ {Number(p.precoAntigo).toFixed(2)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.desconto > 0 && (
                          <span className="inline-block bg-red-50 text-[#E53935] font-bold text-xs px-2 py-1 rounded">
                            -{p.desconto}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.freteGratis ? <span className="text-[#22C55E] font-bold">✓</span> : <span className="text-slate-300">–</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-slate-400">
                        {p.rating > 0 ? `${Number(p.rating).toFixed(1)} (${p.reviews})` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <a
                          href={p.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-[#1565C0] hover:underline"
                        >
                          Ver ↗
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditing(p)}
                            className="inline-flex items-center gap-1.5 bg-[#1565C0] hover:bg-[#0d47a1] text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Editar
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            title="Excluir oferta"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-[#E53935] hover:bg-red-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {bannerOpen && (
        <BannerModal
          initial={banner}
          onClose={() => setBannerOpen(false)}
          onSave={handleSaveBanner}
        />
      )}

      {editing && (
        <ProductModal
          initial={editing === 'new' ? emptyForm : editing}
          onClose={() => setEditing(null)}
          token={token}
          onSaved={async () => {
            setEditing(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}

function ProductModal({ initial, onClose, token, onSaved }) {
  const [form, setForm] = useState({ ...emptyForm, ...initial, badge: initial.badge || '' });
  const [scraping, setScraping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [scrapeMsg, setScrapeMsg] = useState('');

  function up(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleScrape() {
    if (!form.link) {
      setError('Cole o link do Mercado Livre primeiro');
      return;
    }
    setScraping(true);
    setError('');
    setScrapeMsg('');
    try {
      const r = await fetch('/api/admin/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: form.link }),
      });
      const d = await readApiResponse(r, 'Não foi possível buscar os dados do produto');
      setForm((f) => ({
        ...f,
        nome: d.nome || f.nome,
        imagem: d.imagem || f.imagem,
        preco: d.preco || f.preco,
        precoAntigo: d.precoAntigo || f.precoAntigo,
        desconto: d.desconto || f.desconto,
        categoria: d.categoria || f.categoria,
        link: d.link || f.link,
        rating: d.found?.rating ? d.rating : f.rating,
        reviews: d.found?.reviews ? d.reviews : f.reviews,
        freteGratis: d.found?.freteGratis ? d.freteGratis : f.freteGratis,
      }));
      const missing = [];
      if (!d.found?.rating) missing.push('nota da avaliação');
      if (!d.found?.reviews) missing.push('número de avaliações');
      if (!d.found?.freteGratis) missing.push('frete');
      setScrapeMsg(
        missing.length
          ? `Dados carregados. Não foi possível confirmar ${missing.join(' e ')}; revise esses campos antes de salvar.`
          : 'Dados carregados, incluindo avaliações e frete. Revise e salve.'
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setScraping(false);
    }
  }

  const isEditing = Boolean(initial && initial.id);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const url = isEditing ? `/api/products/${encodeURIComponent(initial.id)}` : '/api/products';
      const r = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      await readApiResponse(r, 'Não foi possível salvar a oferta');
      await onSaved();
    } catch (e2) {
      setError(e2.message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold">{isEditing ? 'Editar oferta' : 'Colocar oferta'}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Auto-scrape hero section */}
          <div className="bg-gradient-to-br from-orange-50 to-blue-50 border border-orange-100 rounded-xl p-4">
            <label className="text-xs font-bold uppercase tracking-wider text-[#FF6F00] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Preenchimento automático
            </label>
            <p className="text-xs text-slate-600 mt-1">
              Cole o link de afiliado do Mercado Livre (ex.: <code className="bg-white px-1.5 py-0.5 rounded text-[#1565C0] font-mono text-[11px]">https://meli.la/xxxxxx</code>) para buscar imagem, nome, preço, desconto, estrelas, avaliações e frete grátis.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="url"
                value={form.link}
                onChange={(e) => up('link', e.target.value)}
                className={inputCls + ' flex-1'}
                placeholder="https://meli.la/xxxxxx"
              />
              <button
                type="button"
                onClick={handleScrape}
                disabled={scraping || !form.link}
                className="inline-flex items-center gap-1.5 bg-[#FF6F00] hover:bg-[#e65a00] disabled:opacity-60 text-white font-bold text-sm px-4 py-2.5 rounded-lg shadow whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                {scraping ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            {scrapeMsg && <div className="mt-2 text-xs font-semibold text-[#22C55E]">{scrapeMsg}</div>}
          </div>

          <Field label="Nome do produto *">
            <input required value={form.nome} onChange={(e) => up('nome', e.target.value)} className={inputCls} placeholder="Ex.: Smart TV LG 50 4K" />
          </Field>

          <Field label="URL da imagem *">
            <input required type="url" value={form.imagem} onChange={(e) => up('imagem', e.target.value)} className={inputCls} placeholder="https://..." />
            {form.imagem && (
              <div className="mt-2 w-24 h-24 rounded-lg bg-slate-100 overflow-hidden">
                <img src={form.imagem} alt="preview" className="w-full h-full object-cover" />
              </div>
            )}
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Preço atual (R$) *">
              <input required type="number" step="0.01" min="0" value={form.preco} onChange={(e) => up('preco', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Preço antigo (R$)">
              <input type="number" step="0.01" min="0" value={form.precoAntigo} onChange={(e) => up('precoAntigo', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Desconto (%)">
              <input type="number" min="0" max="99" value={form.desconto} onChange={(e) => up('desconto', e.target.value)} className={inputCls} placeholder="Auto" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Categoria">
              <select value={form.categoria} onChange={(e) => up('categoria', e.target.value)} className={inputCls}>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Badge">
              <select value={form.badge} onChange={(e) => up('badge', e.target.value)} className={inputCls}>
                {BADGES.map((b) => <option key={b} value={b}>{b || 'Sem badge'}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Avaliação (1-5)">
              <input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => up('rating', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Número de avaliações">
              <input type="number" min="0" value={form.reviews} onChange={(e) => up('reviews', e.target.value)} className={inputCls} />
            </Field>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.freteGratis}
              onChange={(e) => up('freteGratis', e.target.checked)}
              className="w-4 h-4 accent-[#22C55E]"
            />
            <span className="text-sm font-semibold text-[#0F172A]">Frete grátis</span>
          </label>

          {error && <div className="text-sm text-[#E53935] bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-white font-semibold text-sm disabled:opacity-60">Cancelar</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-[#22C55E] hover:bg-[#16a34a] disabled:opacity-60 text-white font-bold px-5 py-2 rounded-lg shadow">
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Salvar oferta'}
          </button>
        </div>
      </form>
    </div>
  );
}

function BannerModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({
    ativo: initial?.ativo || false,
    titulo: initial?.titulo || '',
    subtitulo: initial?.subtitulo || '',
    imagem: initial?.imagem || '',
    link: initial?.link || '',
    cta: initial?.cta || 'Ver Ofertas',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function up(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-[#FF6F00]" />
            Banner da tela inicial
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
            O banner aparece no início do site, do lado direito de “Promoções em Tempo Real”, em
            tamanho expandido no computador e no celular. Use para Black Friday ou qualquer campanha.
          </p>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => up('ativo', e.target.checked)}
              className="w-4 h-4 accent-[#22C55E]"
            />
            <span className="text-sm font-bold text-[#0F172A]">Exibir banner no site</span>
          </label>

          <Field label="URL da imagem do banner">
            <input
              type="url"
              value={form.imagem}
              onChange={(e) => up('imagem', e.target.value)}
              className={inputCls}
              placeholder="https://... (imagem do banner)"
            />
            {form.imagem && (
              <div className="mt-2 rounded-lg bg-slate-100 overflow-hidden">
                <img src={form.imagem} alt="preview" className="w-full max-h-48 object-cover" />
              </div>
            )}
          </Field>

          <Field label="Título">
            <input
              value={form.titulo}
              onChange={(e) => up('titulo', e.target.value)}
              className={inputCls}
              placeholder="Ex.: BLACK FRIDAY — até 70% OFF"
            />
          </Field>

          <Field label="Subtítulo">
            <input
              value={form.subtitulo}
              onChange={(e) => up('subtitulo', e.target.value)}
              className={inputCls}
              placeholder="Ex.: Só nesta sexta, os maiores descontos do ano"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Link do banner">
              <input
                type="url"
                value={form.link}
                onChange={(e) => up('link', e.target.value)}
                className={inputCls}
                placeholder="https://..."
              />
            </Field>
            <Field label="Texto do botão">
              <input
                value={form.cta}
                onChange={(e) => up('cta', e.target.value)}
                className={inputCls}
                placeholder="Ver Ofertas"
              />
            </Field>
          </div>

          {error && (
            <div className="text-sm text-[#E53935] bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-white font-semibold text-sm">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-[#22C55E] hover:bg-[#16a34a] disabled:opacity-60 text-white font-bold px-5 py-2 rounded-lg shadow">
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar banner'}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/20 outline-none transition text-sm';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
