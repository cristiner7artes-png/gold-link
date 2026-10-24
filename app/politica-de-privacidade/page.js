import { ArrowLeft } from 'lucide-react';
import SiteFooter, { AFFILIATE_DISCLOSURE } from '@/components/site-footer';

export const metadata = {
  title: 'Política de Privacidade — Mercado Gold Link',
  description: 'Como o Mercado Gold Link trata dados de navegação, cookies e links de afiliado.',
};

const SECOES = [
  {
    titulo: 'Quem somos',
    texto: [AFFILIATE_DISCLOSURE],
  },
  {
    titulo: 'Dados pessoais',
    texto: [
      'O site público do Mercado Gold Link não tem cadastro, login, formulários nem campos de pagamento. Não pedimos nome, e-mail, telefone, CPF, endereço, senha ou dados de cartão.',
      'Nunca peça nem informe seus dados de pagamento ou senha do Mercado Livre em nosso site. Esses dados só devem ser informados no site oficial do Mercado Livre (mercadolivre.com.br).',
    ],
  },
  {
    titulo: 'Contagem de cliques',
    texto: [
      'Quando você clica em uma oferta, registramos apenas que aquele produto recebeu um clique, para saber quais ofertas são mais procuradas. Esse registro não guarda seu nome, e-mail ou outros dados de identificação.',
    ],
  },
  {
    titulo: 'Cookies e Google Ads',
    texto: [
      'Usamos a tag do Google (Google Ads) para medir o desempenho dos nossos anúncios, inclusive quando um visitante clica em uma oferta. O Google pode usar cookies e identificadores do navegador para isso, conforme a política de privacidade do Google (policies.google.com/privacy).',
      'Você pode bloquear ou apagar cookies nas configurações do seu navegador e gerenciar a personalização de anúncios em adssettings.google.com.',
    ],
  },
  {
    titulo: 'Links para o Mercado Livre',
    texto: [
      'Os botões “Ver no Mercado Livre” levam para a página do produto no Mercado Livre por meio de um link de afiliado. A partir desse ponto, valem os termos e a política de privacidade do próprio Mercado Livre.',
    ],
  },
  {
    titulo: 'Alterações',
    texto: ['Esta política pode ser atualizada quando o funcionamento do site mudar. A versão vigente é sempre a publicada nesta página.'],
  },
];

export default function PoliticaPrivacidadePage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <header className="bg-[#FFCB3D] shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/images/logo-mercado-gold-link.png" alt="Mercado Gold Link — página inicial" className="h-12 w-auto rounded-lg" />
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

      <article className="max-w-3xl w-full mx-auto px-4 py-12 sm:py-16 flex-1">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0F172A]">Política de Privacidade</h1>
        <p className="mt-3 text-slate-600">Mercado Gold Link — plataforma independente de divulgação de ofertas.</p>
        <div className="mt-10 flex flex-col gap-8">
          {SECOES.map((s) => (
            <section key={s.titulo}>
              <h2 className="text-xl font-bold text-[#0F172A]">{s.titulo}</h2>
              {s.texto.map((t) => (
                <p key={t} className="mt-2 leading-relaxed text-slate-700 text-pretty">
                  {t}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
