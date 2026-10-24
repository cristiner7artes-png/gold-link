import { ArrowLeft, BadgePercent, ShieldCheck, Truck } from 'lucide-react';
import SiteFooter, { AFFILIATE_DISCLOSURE, CONTACT_EMAIL, CONTACT_NAME } from '@/components/site-footer';

export const metadata = {
  title: 'Quem Somos — Mercado Gold Link',
  description:
    'O Mercado Gold Link é uma plataforma independente que divulga ofertas do Mercado Livre como afiliada. Não é o site oficial do Mercado Livre.',
};

const PILARES = [
  { icon: BadgePercent, titulo: 'Ofertas com desconto', texto: 'Selecionamos produtos em promoção para você economizar.' },
  { icon: ShieldCheck, titulo: 'Bem avaliados', texto: 'Damos preferência a produtos e vendedores com boas avaliações no Mercado Livre.' },
  { icon: Truck, titulo: 'Frete grátis', texto: 'Priorizamos ofertas com frete grátis. Confira a condição final na página do produto.' },
];

export default function QuemSomosPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <header className="bg-[#FFCB3D] shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img
              src="/images/logo-mercado-gold-link.png"
              alt="Mercado Gold Link — página inicial"
              className="h-12 w-auto rounded-lg"
            />
          </a>
          <a
            href="/"
            className="inline-flex items-center gap-2 min-h-11 px-4 rounded-lg bg-[#1565C0] text-white text-sm font-bold hover:bg-[#0d47a1] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar às ofertas
          </a>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 py-16 sm:py-24 text-center flex-1">
        <span className="inline-block rounded-full bg-[#FFCB3D] px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#0F172A]">
          Quem Somos
        </span>
        <h1 className="mt-5 text-4xl sm:text-5xl font-black tracking-tight text-[#0F172A]">
          Mercado <span className="text-[#1565C0]">Gold</span> <span className="text-[#FF6F00]">Link</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl leading-relaxed text-slate-700 text-pretty">
          O Mercado Gold Link é uma plataforma independente que facilita a sua compra: buscamos promoções no Mercado
          Livre e reunimos tudo em um só lugar para você economizar.
        </p>
        <p className="mt-8 text-2xl sm:text-3xl font-black text-[#0F172A]">
          Porque o seu tempo vale <span className="text-[#F0B000]">ouro</span>!
        </p>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {PILARES.map(({ icon: Icon, titulo, texto }) => (
            <div key={titulo} className="rounded-2xl bg-white border border-black/5 p-5 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-[#FFCB3D] flex items-center justify-center">
                <Icon className="w-5 h-5 text-[#1565C0]" />
              </div>
              <h2 className="mt-3 font-bold text-[#0F172A]">{titulo}</h2>
              <p className="mt-1 text-sm text-slate-600">{texto}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-white border border-[#1565C0]/20 p-6 text-left">
          <h2 className="font-bold text-[#0F172A]">Como funcionamos</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 text-pretty">{AFFILIATE_DISCLOSURE}</p>
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#1565C0]/20 p-6 text-left">
          <h2 className="font-bold text-[#0F172A]">Contato</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            O Mercado Gold Link é mantido por {CONTACT_NAME}. Dúvidas, sugestões ou solicitações sobre seus dados podem
            ser enviadas para{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[#1565C0] underline underline-offset-2">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
