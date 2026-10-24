export const CONTACT_NAME = 'Marcelo Costa';
export const CONTACT_EMAIL = 'terra_continental7@hotmail.com';

export const AFFILIATE_DISCLOSURE =
  'O Mercado Gold Link é uma plataforma independente de divulgação de ofertas. Não somos o site oficial do Mercado Livre e não temos vínculo societário com ele. Participamos do programa de afiliados do Mercado Livre: ao comprar pelos nossos links, podemos receber uma comissão, sem custo adicional para você. A compra, o pagamento e a entrega são feitos diretamente no site do Mercado Livre.';

export function AffiliateNotice() {
  return (
    <aside aria-label="Aviso de afiliação" className="bg-[#0F172A] text-white/85">
      <p className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-xs sm:text-sm text-center text-pretty leading-relaxed">
        <strong className="text-white">Plataforma independente.</strong> O Mercado Gold Link não é o site oficial do
        Mercado Livre. Somos afiliados e podemos receber comissão pelas compras feitas pelos nossos links.
      </p>
    </aside>
  );
}

const LINKS = [
  { href: '/', label: 'Ofertas' },
  { href: '/quem-somos', label: 'Quem Somos' },
  { href: '/politica-de-privacidade', label: 'Política de Privacidade' },
];

export default function SiteFooter() {
  return (
    <footer className="py-10 bg-[#0F172A] text-white/70 text-sm">
      <div className="max-w-5xl mx-auto px-4 flex flex-col items-center gap-5 text-center">
        <img src="/images/logo-mercado-gold-link.png" alt="Mercado Gold Link" className="h-16 w-auto rounded-xl" />
        <nav aria-label="Páginas institucionais" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="font-semibold text-white hover:text-[#FFCB3D] transition">
              {l.label}
            </a>
          ))}
        </nav>
        <address className="not-italic leading-relaxed">
          <span className="block font-semibold text-white">Contato</span>
          Responsável: {CONTACT_NAME} ·{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-white hover:text-[#FFCB3D] underline underline-offset-2">
            {CONTACT_EMAIL}
          </a>
        </address>
        <p className="max-w-3xl text-pretty leading-relaxed">{AFFILIATE_DISCLOSURE}</p>
        <p className="max-w-3xl text-pretty leading-relaxed text-white/60">
          Preços, descontos, avaliações e condições de frete são consultados no Mercado Livre e podem mudar a qualquer
          momento. Confira sempre as informações finais na página do produto antes de comprar. Mercado Livre é marca
          registrada de seus respectivos titulares.
        </p>
        <p className="text-white/50">© {new Date().getFullYear()} Mercado Gold Link</p>
      </div>
    </footer>
  );
}
