import { ArrowLeft, BadgePercent, ShieldCheck, Truck } from 'lucide-react';

export const metadata = {
  title: 'Quem Somos — Gold Link',
  description:
    'Gold Link é uma plataforma que facilita a sua compra: buscamos as melhores promoções para você economizar.',
};

const PILARES = [
  { icon: BadgePercent, titulo: 'Melhores promoções', texto: 'Buscamos as ofertas para você economizar dinheiro no seu bolso.' },
  { icon: ShieldCheck, titulo: 'Fornecedores bem avaliados', texto: 'Trabalhamos apenas com vendedores de boa reputação.' },
  { icon: Truck, titulo: 'Frete grátis', texto: 'Priorizamos fornecedores que oferecem frete grátis.' },
];

export default function QuemSomosPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#FFE600] shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img
              src="/images/logo-mercado-gold-link.png"
              alt="Mercado Gold Link"
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

      <section className="max-w-3xl mx-auto px-4 py-16 sm:py-24 text-center">
        <span className="inline-block rounded-full bg-[#FFE600] px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#0F172A]">
          Quem Somos
        </span>
        <h1 className="mt-5 text-4xl sm:text-5xl font-black tracking-tight text-[#0F172A]">
          <span className="text-[#1565C0]">Gold</span> <span className="text-[#FF6F00]">Link</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl leading-relaxed text-slate-700 text-pretty">
          Gold Link é uma plataforma que facilita a sua compra: buscamos as melhores promoções
          para você economizar dinheiro no seu bolso, trabalhamos apenas com fornecedores bem
          avaliados e que forneçam frete grátis.
        </p>
        <p className="mt-8 text-2xl sm:text-3xl font-black text-[#0F172A]">
          Porque o seu tempo vale <span className="text-[#F0B000]">ouro</span>!
        </p>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {PILARES.map(({ icon: Icon, titulo, texto }) => (
            <div key={titulo} className="rounded-2xl bg-white border border-black/5 p-5 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-[#FFE600] flex items-center justify-center">
                <Icon className="w-5 h-5 text-[#1565C0]" />
              </div>
              <h2 className="mt-3 font-bold text-[#0F172A]">{titulo}</h2>
              <p className="mt-1 text-sm text-slate-600">{texto}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
