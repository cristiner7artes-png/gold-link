import ReviewForm from '@/components/review-form';
import SiteFooter from '@/components/site-footer';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Avaliações | Mercado Gold Link',
  description: 'Comprou pelo Mercado Gold Link? Conte como foi sua experiência e ajude outros clientes.',
};

export default function AvaliacoesPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#0F172A]">
        <div className="mx-auto flex max-w-3xl items-center px-4 py-4">
          <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar para o site
          </a>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-extrabold text-[#0F172A]">Avalie sua compra</h1>
        <p className="mt-2 text-slate-600">
          Comprou um produto pelo nosso site? Conte como foi. Sua avaliação aparece na página inicial depois de revisada.
        </p>
        <ReviewForm />
      </div>
      <SiteFooter />
    </main>
  );
}
