import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import GoogleTag from '@/components/google-tag';

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
  title: 'Gold Link — As Melhores Ofertas do Mercado Livre',
  description: 'Economize até 70% com ofertas selecionadas do Mercado Livre. Atualizado diariamente.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-[#F8FAFC] text-[#0F172A]">
        <GoogleTag />
        {children}
      </body>
    </html>
  );
}
