import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata = {
  title: 'Mercado Gold Link — Ofertas selecionadas no Mercado Livre',
  description:
    'Plataforma independente de divulgação de ofertas, afiliada ao Mercado Livre. Não é o site oficial do Mercado Livre.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=AW-18466543528"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'AW-18466543528');`,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-[#F8FAFC] text-[#0F172A]">
        {children}
      </body>
    </html>
  );
}
