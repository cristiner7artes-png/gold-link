'use client';

import { useEffect, useState } from 'react';
import { Star, MessageSquareQuote, PenLine } from 'lucide-react';

export function Stars({ value, size = 'w-4 h-4' }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={`${size} ${n <= value ? 'fill-[#FFB300] text-[#FFB300]' : 'text-slate-300'}`}
        />
      ))}
    </div>
  );
}

export function ReviewCard({ review }) {
  const data = review.criadoEm ? new Date(review.criadoEm).toLocaleDateString('pt-BR') : '';
  return (
    <article className="flex h-full flex-col gap-3 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <Stars value={review.nota} />
        {data && <time className="text-xs text-slate-400" dateTime={review.criadoEm}>{data}</time>}
      </div>
      <p className="flex-1 text-sm leading-relaxed text-slate-700">{`"${review.comentario}"`}</p>
      {review.produto && (
        <p className="text-xs font-semibold text-[#1565C0]">Comprou: {review.produto}</p>
      )}
      <div className="flex items-center gap-3 border-t border-black/5 pt-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1565C0] text-sm font-bold text-white" aria-hidden="true">
          {review.nome?.charAt(0)?.toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-bold text-[#0F172A]">{review.nome}</p>
          {review.cidade && <p className="text-xs text-slate-500">{review.cidade}</p>}
        </div>
      </div>
    </article>
  );
}

export default function ReviewsSection() {
  const [reviews, setReviews] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancel = false;
    fetch('/api/reviews')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (!cancel) setReviews(Array.isArray(d) ? d : []); })
      .catch(() => {})
      .finally(() => { if (!cancel) setLoaded(true); });
    return () => { cancel = true; };
  }, []);

  const media = reviews.length
    ? (reviews.reduce((s, r) => s + r.nota, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <section id="avaliacoes" className="scroll-mt-16 bg-white py-16" aria-labelledby="avaliacoes-titulo">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#1565C0]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#1565C0]">
              <MessageSquareQuote className="h-3.5 w-3.5" aria-hidden="true" /> Avaliações
            </div>
            <h2 id="avaliacoes-titulo" className="text-2xl font-extrabold text-[#0F172A] sm:text-3xl">
              O que nossos clientes dizem
            </h2>
            {media && (
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <Stars value={Math.round(Number(media))} />
                <span><strong className="text-[#0F172A]">{media}</strong> de 5 · {reviews.length} avaliações</span>
              </div>
            )}
          </div>
          <a
            href="/avaliacoes"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6F00] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#E65100]"
          >
            <PenLine className="h-4 w-4" aria-hidden="true" /> Deixar minha avaliação
          </a>
        </div>

        {!loaded ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Ainda não há avaliações. Comprou pelo nosso site? Seja o primeiro a avaliar!
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.slice(0, 6).map((r) => <ReviewCard key={r.id} review={r} />)}
          </div>
        )}
      </div>
    </section>
  );
}
