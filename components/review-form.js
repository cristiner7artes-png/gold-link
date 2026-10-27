'use client';

import { useState } from 'react';
import { Star, CheckCircle2, Send } from 'lucide-react';

const INPUT = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/20';

export default function ReviewForm() {
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErro('');
    const form = new FormData(e.currentTarget);
    if (!nota) return setErro('Escolha uma nota de 1 a 5 estrelas');
    setEnviando(true);
    try {
      const r = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.get('nome'),
          cidade: form.get('cidade'),
          produto: form.get('produto'),
          comentario: form.get('comentario'),
          comprou: form.get('comprou') === 'on',
          site: form.get('site'),
          nota,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || 'Não foi possível enviar sua avaliação');
      setEnviado(true);
    } catch (e2) {
      setErro(e2.message);
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-black/5 bg-white p-8 text-center shadow-sm" role="status">
        <CheckCircle2 className="h-12 w-12 text-green-600" aria-hidden="true" />
        <h2 className="text-xl font-extrabold text-[#0F172A]">Obrigado pela sua avaliação!</h2>
        <p className="text-slate-600">Ela será publicada na página inicial assim que for revisada.</p>
        <a href="/#avaliacoes" className="mt-2 rounded-xl bg-[#1565C0] px-5 py-3 text-sm font-bold text-white hover:bg-[#0D47A1]">
          Ver avaliações
        </a>
      </div>
    );
  }

  const mostrada = hover || nota;

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-[#0F172A]">Sua nota *</legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNota(n)}
              onMouseEnter={() => setHover(n)}
              aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
              aria-pressed={nota === n}
              className="rounded p-1 transition hover:scale-110"
            >
              <Star className={`h-8 w-8 ${n <= mostrada ? 'fill-[#FFB300] text-[#FFB300]' : 'text-slate-300'}`} aria-hidden="true" />
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-bold text-[#0F172A]">
          Nome *
          <input name="nome" required minLength={2} maxLength={60} className={INPUT} placeholder="Seu nome" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-bold text-[#0F172A]">
          Cidade
          <input name="cidade" maxLength={60} className={INPUT} placeholder="Ex: São Paulo - SP" />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-bold text-[#0F172A]">
        Produto que comprou
        <input name="produto" maxLength={120} className={INPUT} placeholder="Ex: Fone Bluetooth" />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-bold text-[#0F172A]">
        Comentário *
        <textarea name="comentario" required minLength={10} maxLength={600} rows={4} className={INPUT} placeholder="Conte como foi sua compra e o que achou do produto" />
      </label>

      <input type="text" name="site" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input type="checkbox" name="comprou" required className="mt-0.5 h-4 w-4 accent-[#1565C0]" />
        Confirmo que comprei um produto através de um link do Mercado Gold Link.
      </label>

      {erro && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-[#E53935]" role="alert">{erro}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6F00] px-5 py-3 font-bold text-white transition hover:bg-[#E65100] disabled:opacity-60"
      >
        <Send className="h-4 w-4" aria-hidden="true" /> {enviando ? 'Enviando...' : 'Enviar avaliação'}
      </button>
    </form>
  );
}
