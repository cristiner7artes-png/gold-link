'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  ShoppingBag,
  Star,
  Truck,
  ArrowRight,
  Search,
  Menu,
  Flame,
  Smartphone,
  Home,
  Shirt,
  Dumbbell,
  Sparkles,
  Baby,
  Clock,
  Tag,
  Mail,
  Copy,
} from 'lucide-react';

/* ------------------ DATA ------------------ */
const CATEGORIAS = [
  { nome: 'Eletrônicos', icon: Smartphone, cor: '#EC4899' },
  { nome: 'Casa', icon: Home, cor: '#1565C0' },
  { nome: 'Moda', icon: Shirt, cor: '#F59E0B' },
  { nome: 'Esportes', icon: Dumbbell, cor: '#EC4899' },
  { nome: 'Beleza', icon: Sparkles, cor: '#1565C0' },
  { nome: 'Infantil', icon: Baby, cor: '#F59E0B' },
];

/* ------------------ UTILITIES ------------------ */
const formatBRL = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatCount = (n) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')}k` : `${n}`;

/* ------------------ LOGO: CARRINHO CHEIO DE COMPRAS ------------------ */
function CarrinhoCheio({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      {/* compras transbordando pela borda da cesta */}
      <rect x="7.2" y="4.1" width="3.4" height="3" rx="0.5" fill="#4FC3F7" />
      <circle cx="13.2" cy="5.5" r="1.6" fill="#FFEE58" />
      <rect x="16.1" y="3.6" width="2.5" height="3.5" rx="0.6" fill="#81C784" />

      {/* fileira de cima dentro da cesta: TV, roupa, caixa */}
      <rect x="6.7" y="8.3" width="5" height="3.4" rx="0.5" fill="#CE93D8" />
      <rect x="12.3" y="8.3" width="4" height="3.4" rx="0.5" fill="#90CAF9" />
      <rect x="16.9" y="8.3" width="4.1" height="3.4" rx="0.5" fill="#FFAB91" />

      {/* fileira de baixo: bola, pneu, sacola */}
      <circle cx="9.6" cy="13.6" r="1.8" fill="#FFE082" />
      <circle cx="14" cy="13.7" r="1.9" fill="#4E342E" />
      <circle cx="14" cy="13.7" r="0.8" fill="#D7CCC8" />
      <rect x="17" y="12" width="3.2" height="3.4" rx="0.5" fill="#F48FB1" />

      {/* contorno do carrinho desenhado por cima das compras */}
      <g stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
      </g>
    </svg>
  );
}

/* ------------------ HEADER ------------------ */
function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 backdrop-blur-lg transition-all duration-300 ${
        scrolled
          ? 'shadow-md border-b border-[#1565C0]/15'
          : 'shadow-sm border-b border-white/20'
      }`}
      style={{
        background: '#FFE600',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-3">
          <img
            src="/images/logo-mercado-gold-link.png"
            alt="Mercado Gold Link"
            className="h-12 w-auto rounded-xl shadow-md"
          />
          <span className="flex flex-col leading-none">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-[#1565C0]">
              Gold Link
            </span>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#E53935]">
              Mercado
            </span>
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#0F172A]">
          <a href="#inicio" className="hover:text-[#1565C0] transition">Início</a>
          <a href="#promocoes" className="hover:text-[#1565C0] transition">Promoções</a>
          <a href="#mais-vendidos" className="hover:text-[#1565C0] transition">Mais Vendidos</a>
          <a href="#categorias" className="hover:text-[#1565C0] transition">Categorias</a>
        </nav>

        <div className="flex items-center gap-3">
          <button className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#c62828] text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all hover:scale-[1.03]">
            <Tag className="w-4 h-4" />
            Minhas Ofertas
          </button>
          <button className="md:hidden p-2 rounded-lg hover:bg-black/5">
            <Menu className="w-6 h-6 text-[#0F172A]" />
          </button>
        </div>
      </div>
    </header>
  );
}

/* ------------------ HERO ------------------ */
function Hero({ products, banner }) {
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  return (
    <section
      id="inicio"
      className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden"
      style={{
        background:
          'linear-gradient(120deg, #E53935 0%, #FF6F00 45%, #1565C0 100%)',
      }}
    >
      {/* decorative blobs */}
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 items-center">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div
            variants={item}
            aria-label="Ofertas Relâmpago"
            className="relative mb-6 inline-flex -skew-x-6 items-center gap-3 overflow-hidden rounded-xl border border-[#F4AB08] bg-gradient-to-br from-[#FADE09] via-[#FADE09] to-[#F4AB08] px-4 py-2.5 shadow-[0_8px_22px_-8px_rgba(3,30,100,0.85)]"
          >
            <span className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white/25 to-transparent" aria-hidden="true" />
            <span className="relative flex h-9 w-9 shrink-0 skew-x-6 items-center justify-center rounded-lg border border-[#F4AB08] bg-gradient-to-br from-[#FADE09] to-[#F4AB08] shadow-[0_0_12px_rgba(1,91,214,0.4)]" aria-hidden="true">
              <Zap className="h-5 w-5 fill-[#015BD6] text-[#031E64]" strokeWidth={2.5} />
            </span>
            <span className="relative flex skew-x-6 flex-wrap items-baseline gap-x-2 font-black italic uppercase leading-none">
              <span
                className="text-xl sm:text-2xl tracking-[0.04em]"
                style={{
                  background: 'linear-gradient(180deg, #FADE09 15%, #F4AB08 88%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  WebkitTextStroke: '1.2px #031E64',
                  textShadow: '0 2px 0 #031E64, 0 0 7px rgba(1,91,214,0.7)',
                }}
              >
                Ofertas
              </span>
              <span
                className="text-xl sm:text-2xl tracking-[0.04em]"
                style={{
                  background: 'linear-gradient(180deg, #EBF5FB 8%, #0892F4 55%, #0B4BAD 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  WebkitTextStroke: '0.7px #031E64',
                  textShadow: '0 2px 0 #031E64',
                }}
              >
                Relâmpago
              </span>
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.05] tracking-tight"
          >
            Promoções em{' '}
            <span className="relative inline-block">
              <span className="relative z-10">Tempo Real</span>
              <span className="absolute -bottom-1 left-0 right-0 h-3 bg-yellow-300/70 -skew-x-6 -z-0" />
            </span>
          </motion.h1>

          <motion.p variants={item} className="mt-5 text-lg text-white/90 max-w-xl">
            <span className="font-bold text-yellow-300">Mais escolhas, melhores preços</span>{' '}
            — economizando seu bolso todos os dias.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-wrap gap-4">
            <a
              href="#promocoes"
              className="group relative inline-flex items-center gap-2 font-extrabold px-8 py-4 rounded-xl shadow-2xl transition-all hover:scale-[1.05] overflow-hidden"
              style={{
                background:
                  'linear-gradient(90deg, #FF1493 0%, #FF3DA1 45%, #FFEA00 100%)',
                color: '#5B0026',
              }}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-yellow-300 via-fuchsia-500 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative flex items-center gap-2 text-xl sm:text-2xl font-black uppercase tracking-wide drop-shadow-sm">
                <Zap className="w-6 h-6" />
                Ofertas Imperdíveis
                <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
              </span>
            </a>
            <a
              href="#categorias"
              className="inline-flex items-center gap-2 bg-[#00E5B0] hover:bg-[#00C99B] text-[#0F2E27] font-bold px-7 py-4 rounded-xl shadow-2xl shadow-[#00E5B0]/40 transition-all hover:scale-[1.05]"
            >
              Explorar Categorias
            </a>
          </motion.div>

          <motion.div variants={item} className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-white/90 text-sm font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse" />
              <span>
                <b className="text-white">{products?.length || 0}</b>{' '}
                {(products?.length || 0) === 1 ? 'produto' : 'produtos'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Atualizado em tempo real
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              100% seguro
            </div>
          </motion.div>
        </motion.div>

        {/* Banner do admin (prioridade) ou cards flutuantes */}
        {banner && banner.ativo ? (
          <PromoBanner banner={banner} />
        ) : products && products.length > 0 ? (
          <div className="relative h-[420px] hidden lg:block">
            {products[0] && (
              <FloatingCard
                className="absolute top-4 left-4 w-56 animate-float-slow"
                img={products[0].imagem}
                name={products[0].nome}
                price={formatBRL(products[0].preco)}
                off={`${products[0].desconto}%`}
              />
            )}
            {products[1] && (
              <FloatingCard
                className="absolute top-24 right-2 w-52 animate-float-med"
                img={products[1].imagem}
                name={products[1].nome}
                price={formatBRL(products[1].preco)}
                off={`${products[1].desconto}%`}
              />
            )}
            {products[2] && (
              <FloatingCard
                className="absolute bottom-4 left-16 w-56 animate-float-fast"
                img={products[2].imagem}
                name={products[2].nome}
                price={formatBRL(products[2].preco)}
                off={`${products[2].desconto}%`}
              />
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ------------------ BANNER PROMOCIONAL (admin) ------------------ */
function PromoBanner({ banner }) {
  const inner = (
    <>
      {banner.imagem && (
        <img
          src={banner.imagem}
          alt={banner.titulo || 'Banner promocional'}
          className="w-full h-auto max-h-[420px] object-cover"
        />
      )}
      {(banner.titulo || banner.subtitulo || banner.cta) && (
        <div
          className={`p-5 sm:p-6 text-center ${
            banner.imagem ? 'bg-[#0A0A0A]' : 'bg-[#0A0A0A] py-10 sm:py-14'
          }`}
        >
          <span className="inline-flex items-center gap-1.5 bg-[#FFD600] text-black text-[10px] sm:text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
            <Zap className="w-3 h-3" />
            Promoção
          </span>
          {banner.titulo && (
            <h3 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
              {banner.titulo}
            </h3>
          )}
          {banner.subtitulo && (
            <p className="mt-2 text-sm sm:text-base text-white/80">{banner.subtitulo}</p>
          )}
          {banner.cta && (
            <span className="mt-4 inline-flex items-center gap-2 bg-[#FFD600] group-hover:bg-[#FFC400] text-black font-extrabold px-6 py-3 rounded-xl shadow-xl transition-colors">
              {banner.cta}
              <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </div>
      )}
    </>
  );

  const cls =
    'group block w-full rounded-2xl overflow-hidden shadow-2xl ring-4 ring-[#FFD600]/60 bg-[#0A0A0A] transition-transform hover:scale-[1.02]';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="w-full"
    >
      {banner.link ? (
        <a href={banner.link} target="_blank" rel="noopener noreferrer" className={cls}>
          {inner}
        </a>
      ) : (
        <div className={cls}>{inner}</div>
      )}
    </motion.div>
  );
}

function FloatingCard({ className, img, name, price, off }) {
  return (
    <div className={`bg-white rounded-2xl shadow-2xl p-3 ${className}`}>
      <div className="absolute -top-2 -right-2 bg-[#E53935] text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg">
        -{off}
      </div>
      <div className="aspect-square rounded-xl bg-[#F8FAFC] overflow-hidden flex items-center justify-center">
        <img src={img} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="mt-2 text-sm font-semibold text-[#0F172A] truncate">{name}</div>
      <div className="text-lg font-extrabold text-[#22C55E]">{price}</div>
    </div>
  );
}

/* ------------------ COUNTDOWN ------------------ */
function useCountdown(hours = 24) {
  const [target] = useState(() => Date.now() + hours * 60 * 60 * 1000);
  const [remaining, setRemaining] = useState(hours * 60 * 60 * 1000);

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const totalSec = Math.floor(remaining / 1000);
  const days = Math.floor(totalSec / 86400);
  const hoursR = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return { days, hours: hoursR, mins, secs, ended: remaining === 0 };
}

function FlipUnit({ value, label, pulse }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative w-20 h-20 sm:w-24 sm:h-24 bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl shadow-xl flex items-center justify-center overflow-hidden ${
          pulse ? 'animate-pulse-strong' : ''
        }`}
        style={{ perspective: '400px' }}
      >
        <motion.span
          key={value}
          initial={{ rotateX: -80, opacity: 0, y: -12 }}
          animate={{ rotateX: 0, opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="font-mono text-4xl sm:text-5xl font-extrabold text-white tabular-nums"
          style={{ transformOrigin: 'center' }}
        >
          {String(value).padStart(2, '0')}
        </motion.span>
        <div className="absolute inset-x-0 top-1/2 h-px bg-black/20 pointer-events-none" />
      </div>
      <span className="mt-2 text-xs font-semibold uppercase tracking-wider text-white/90">
        {label}
      </span>
    </div>
  );
}

function CountdownBanner() {
  const { days, hours, mins, secs, ended } = useCountdown(24);

  return (
    <section
      className="relative py-14 overflow-hidden"
      style={{
        background:
          'linear-gradient(90deg, #FF6F00 0%, #FF8F00 50%, #E53935 100%)',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_50%)]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="text-center lg:text-left">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-3">
            <Clock className="w-3.5 h-3.5" />
            Tempo Limitado
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            {ended ? 'OFERTA ENCERRADA' : 'Essa Oferta Acaba Em'}
          </h2>
          <p className="mt-2 text-white/90 flex items-center gap-2 justify-center lg:justify-start">
            <Truck className="w-4 h-4" />
            Frete grátis em produtos selecionados
          </p>
        </div>

        {ended ? (
          <div className="text-4xl font-extrabold text-white bg-[#E53935] px-8 py-6 rounded-2xl animate-pulse-strong">
            OFERTA ENCERRADA
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:flex gap-3 sm:gap-4">
            <FlipUnit value={days} label="Dias" />
            <FlipUnit value={hours} label="Horas" />
            <FlipUnit value={mins} label="Min" />
            <FlipUnit value={secs} label="Seg" pulse />
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------ PRODUCT CARD ------------------ */
function ProductCard({ p, index }) {
  return (
    <motion.a
      href={p.link}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: (index % 4) * 0.08 }}
      whileHover={{ y: -6 }}
      className="group bg-white rounded-2xl border border-black/5 shadow-sm hover:shadow-2xl transition-shadow duration-300 overflow-hidden flex flex-col"
    >
      <div className="relative aspect-square bg-[#F8FAFC] overflow-hidden">
        {p.badge && (
          <span className="absolute top-3 left-3 z-10 bg-[#FF6F00] text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md">
            {p.badge}
          </span>
        )}
        <span className="absolute top-3 right-3 z-10 bg-[#E53935] text-white text-xs font-extrabold px-2.5 py-1 rounded-md shadow-md">
          -{p.desconto}%
        </span>
        <img
          src={p.imagem}
          alt={p.nome}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-sm font-semibold text-[#0F172A] line-clamp-2 min-h-[2.5rem]">
          {p.nome}
        </h3>

        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <div className="flex items-center gap-0.5 text-[#FF6F00]">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${
                  i < Math.round(p.rating) ? 'fill-[#FF6F00]' : 'fill-transparent'
                }`}
                strokeWidth={1.5}
              />
            ))}
          </div>
          <span className="text-[#0F172A] font-semibold">{p.rating.toFixed(1)}</span>
          <span className="text-slate-500">({formatCount(p.reviews)})</span>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xl font-extrabold text-[#22C55E]">
              {formatBRL(p.preco)}
            </span>
            <span className="text-xs font-bold bg-red-50 text-[#E53935] px-1.5 py-0.5 rounded">
              -{p.desconto}%
            </span>
          </div>
          {p.precoAntigo > p.preco && (
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 line-through">
                {formatBRL(p.precoAntigo)}
              </span>
              <span
                className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-md shadow-lg ring-2 ring-yellow-300"
                style={{
                  background:
                    'linear-gradient(90deg, #FEF08A 0%, #FACC15 45%, #EAB308 100%)',
                  color: '#422006',
                  textShadow: '0 1px 0 rgba(255,255,255,0.55)',
                  boxShadow:
                    '0 4px 10px -2px rgba(234,179,8,0.55), 0 0 0 1px rgba(255,255,255,0.4) inset',
                }}
              >
                💰 Economize {formatBRL(p.precoAntigo - p.preco)} em seu bolso 👈
              </span>
            </div>
          )}
        </div>

        {p.freteGratis && (
          <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#22C55E]">
            <Truck className="w-3.5 h-3.5" />
            FRETE GRÁTIS
          </div>
        )}

        <button className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-[#1565C0] hover:bg-[#0d47a1] text-white text-sm font-bold py-2.5 rounded-lg transition-all group-hover:shadow-lg">
          Ir para Oferta
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </motion.a>
  );
}

/* ------------------ PROMOÇÕES ------------------ */
function Promocoes({ products, loading }) {
  const featured = (products || []).slice(0, 6);
  return (
    <section id="promocoes" className="py-20 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between mb-10 flex-wrap gap-4"
        >
          <div>
            <div className="inline-flex items-center gap-2 bg-red-50 text-[#E53935] text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-3">
              <Flame className="w-3.5 h-3.5" />
              Em Destaque
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A]">
              Promoções <span className="text-[#FF6F00]">Imperdíveis</span>
            </h2>
            <p className="mt-2 text-slate-600">
              Descontos verificados agora mesmo no Mercado Livre.
            </p>
          </div>
          {featured.length > 0 && (
            <a
              href="#categorias"
              className="hidden sm:inline-flex items-center gap-1 text-[#1565C0] font-semibold hover:gap-2 transition-all"
            >
              Ver tudo <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-black/5 overflow-hidden animate-pulse">
                <div className="aspect-square bg-slate-100" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-6 bg-slate-100 rounded w-1/3 mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <Flame className="w-12 h-12 mx-auto text-[#FF6F00] mb-3" />
            <h3 className="text-lg font-bold text-[#0F172A]">Ofertas em breve!</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Estamos preparando promoções incríveis para você. Volte em instantes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((p, i) => (
              <ProductCard key={p.id} p={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------ CATEGORIAS ------------------ */
function Categorias({ products, loading }) {
  const [categoriaAtiva, setCategoriaAtiva] = useState(null);

  // Count products per category
  const counts = (products || []).reduce((acc, p) => {
    const k = p.categoria || 'Eletrônicos';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const produtosDaCategoria = categoriaAtiva
    ? (products || []).filter((p) => (p.categoria || 'Eletrônicos') === categoriaAtiva)
    : [];

  function selecionarCategoria(nome) {
    setCategoriaAtiva(nome);
    requestAnimationFrame(() => {
      document.getElementById('produtos-da-categoria')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }

  return (
    <section id="categorias" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-pink-50 text-[#EC4899] text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-3">
            <ShoppingBag className="w-3.5 h-3.5" />
            Explore
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A]">
            Ofertas por <span className="text-[#EC4899]">Categoria</span>
          </h2>
          <p className="mt-2 text-slate-600 max-w-xl mx-auto">
            Encontre exatamente o que você procura. Ofertas frescas todos os dias.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIAS.map((c, i) => {
            const Icon = c.icon;
            const count = counts[c.nome] || 0;
            return (
              <motion.button
                key={c.nome}
                type="button"
                onClick={() => selecionarCategoria(c.nome)}
                aria-pressed={categoriaAtiva === c.nome}
                aria-controls="produtos-da-categoria"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                whileHover={{ y: -6, scale: 1.03 }}
                className={`group relative w-full bg-white rounded-2xl p-5 border shadow-sm hover:shadow-2xl transition-all duration-300 text-center overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1565C0]/25 ${
                  categoriaAtiva === c.nome
                    ? 'border-[#1565C0] ring-2 ring-[#1565C0]/15 shadow-lg'
                    : 'border-black/5'
                }`}
                style={{
                  background: `linear-gradient(180deg, ${c.cor}0A 0%, #ffffff 60%)`,
                }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-1.5"
                  style={{ background: c.cor }}
                />
                <div
                  className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3 shadow-md transition-transform group-hover:scale-110 group-hover:rotate-6"
                  style={{
                    background: `linear-gradient(135deg, ${c.cor} 0%, ${c.cor}CC 100%)`,
                  }}
                >
                  <Icon className="w-8 h-8 text-white" strokeWidth={2.4} />
                </div>
                <div className="font-bold text-[#0F172A] text-sm">{c.nome}</div>
                <div className="mt-1 text-xs text-slate-500">
                  <span className="font-extrabold text-base" style={{ color: c.cor }}>
                    {count}
                  </span>{' '}
                  {count === 1 ? 'oferta' : 'ofertas'}
                </div>
              </motion.button>
            );
          })}
        </div>

        <div id="produtos-da-categoria" className="scroll-mt-24 mt-12" aria-live="polite">
          {categoriaAtiva ? (
            <motion.div
              key={categoriaAtiva}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="flex items-end justify-between gap-4 mb-7 border-b border-slate-200 pb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1565C0]">
                    Categoria selecionada
                  </p>
                  <h3 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#0F172A]">
                    Todos os produtos de {categoriaAtiva}
                  </h3>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600">
                  {produtosDaCategoria.length} {produtosDaCategoria.length === 1 ? 'produto' : 'produtos'}
                </span>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="overflow-hidden rounded-2xl border border-black/5 bg-white animate-pulse">
                      <div className="aspect-square bg-slate-100" />
                      <div className="p-4 space-y-3">
                        <div className="h-4 w-3/4 rounded bg-slate-100" />
                        <div className="h-6 w-1/3 rounded bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : produtosDaCategoria.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {produtosDaCategoria.map((p, i) => (
                    <ProductCard key={p.id} p={p} index={i} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                  <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                  <h4 className="font-bold text-[#0F172A]">Nenhum produto nesta categoria</h4>
                  <p className="mt-1 text-sm text-slate-500">Novas ofertas aparecem aqui assim que forem cadastradas.</p>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-[#F8FAFC] px-6 py-8 text-center">
              <p className="font-semibold text-slate-600">Escolha uma categoria acima para ver todos os produtos.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------ SEJA PARCEIRO ------------------ */
function SejaParceiro() {
  const EMAIL = 'rhuansampaio11@gmail.com';
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background:
              'linear-gradient(120deg, #E53935 0%, #FF6F00 55%, #1565C0 100%)',
          }}
        >
          {/* decorative */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute top-6 right-6 opacity-20 hidden md:block">
            <Flame className="w-40 h-40 text-white" strokeWidth={1} />
          </div>

          <div className="relative px-6 py-14 sm:px-12 sm:py-16 md:py-20 grid md:grid-cols-[1fr,auto] gap-8 items-center">
            <div className="text-white">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/25 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
                <Zap className="w-3.5 h-3.5 text-yellow-300" />
                Seja Parceiro Gold Link
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">
                Divulgue seu link de afiliado com a gente
              </h2>
              <p className="mt-4 text-white/90 text-lg max-w-2xl">
                Tem um link de afiliado e quer alcançar mais compradores? Faça
                sua proposta e vamos crescer juntos.
              </p>

              <div className="mt-6 bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-4 sm:p-5 max-w-xl">
                <div className="text-xs font-bold uppercase tracking-wider text-white/80 mb-1">
                  Faça sua proposta enviando nesse email
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={`mailto:${EMAIL}?subject=Proposta%20de%20Parceria%20Gold%20Link`}
                    className="text-xl sm:text-2xl font-extrabold text-white hover:text-yellow-300 transition break-all"
                  >
                    {EMAIL}
                  </a>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href={`mailto:${EMAIL}?subject=Proposta%20de%20Parceria%20Gold%20Link&body=Ol%C3%A1%2C%20tenho%20interesse%20em%20divulgar%20meu%20link%20de%20afiliado.%20Segue%20minha%20proposta%3A`}
                    className="inline-flex items-center gap-2 bg-white text-[#E53935] font-bold px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition hover:scale-[1.03]"
                  >
                    <Mail className="w-4 h-4" />
                    Enviar Proposta
                  </a>
                  <button
                    onClick={copyEmail}
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold px-5 py-3 rounded-xl backdrop-blur-sm transition"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copiado!' : 'Copiar email'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------ PAGE ------------------ */
function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    let cancel = false;
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        if (cancel) return;
        setProducts(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    let cancel = false;
    const load = () =>
      fetch('/api/banner')
        .then((r) => r.json())
        .then((d) => { if (!cancel) setBanner(d); })
        .catch(() => {});
    load();
    const id = setInterval(load, 30000);
    return () => { cancel = true; clearInterval(id); };
  }, []);

  return (
    <main className="min-h-screen">
      <Header />
      <Hero products={products} banner={banner} />
      <CountdownBanner />
      <Promocoes products={products} loading={loading} />
      <Categorias products={products} loading={loading} />
      <SejaParceiro />

      <section className="py-10 bg-[#0F172A] text-white/70 text-center text-sm">
        <div className="max-w-7xl mx-auto px-4">
          <img
            src="/images/logo-mercado-gold-link.png"
            alt="Mercado Gold Link"
            className="h-16 w-auto rounded-xl mx-auto"
          />
          <p className="mt-2">© 2025 Mercado Gold Link — Afiliado Mercado Livre. Todos os preços sujeitos a alteração.</p>
        </div>
      </section>
    </main>
  );
}

export default App;
