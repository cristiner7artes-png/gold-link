'use client';

import { useRef, useState, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, getToolName, isToolUIPart, lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';
import { Sparkles, Send, Check, X, Loader2, Wrench, RotateCcw, ShieldCheck, Zap, Gauge, Rocket } from 'lucide-react';

const MODOS = [
  { id: 'normal', label: 'Normal', desc: 'Rápido', Icon: Zap },
  { id: 'medio', label: 'Médio', desc: 'Equilibrado', Icon: Gauge },
  { id: 'turbo', label: 'Turbo', desc: 'Pesquisa profunda', Icon: Rocket },
];

const TOOL_LABELS = {
  pesquisarWeb: 'Pesquisando na internet',
  abrirSite: 'Abrindo site',
  adicionarOferta: 'Cadastrar oferta',
  resumoSite: 'Consultando resumo do site',
  buscarOfertas: 'Buscando ofertas',
  excluirOfertas: 'Excluir ofertas',
  ativarDesativarOfertas: 'Ativar / desativar ofertas',
  atualizarOferta: 'Editar oferta',
  controlarRobo: 'Controlar robô',
  atualizarBanner: 'Alterar banner',
};

const SUGESTOES = [
  'Mostre um resumo do site',
  'Quais ofertas de Moda não tiveram nenhum clique?',
  'Pesquise as melhores ofertas de fone bluetooth hoje',
  'Abra mercadolivre.com.br/ofertas e me diga os destaques',
  'Desative as ofertas com menos de 10% de desconto',
];

function ToolPart({ part, onApprove }) {
  const name = getToolName(part);
  const label = TOOL_LABELS[name] || name;
  const descricao = part.input?.descricao || part.input?.query || part.input?.url;

  if (part.state === 'approval-requested' && !part.approval?.isAutomatic) {
    return (
      <div className="rounded-xl border-2 border-[#F8D000] bg-[#FFFBEA] p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#181820]">
          <ShieldCheck className="w-4 h-4 text-[#F0B000]" aria-hidden="true" />
          Aprovação necessária: {label}
        </div>
        {descricao && <p className="mt-1 text-sm text-slate-700">{descricao}</p>}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onApprove(part.approval.id, true)}
            className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg bg-[#181820] text-white text-sm font-bold hover:bg-black transition"
          >
            <Check className="w-4 h-4" aria-hidden="true" /> Aprovar
          </button>
          <button
            onClick={() => onApprove(part.approval.id, false)}
            className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <X className="w-4 h-4" aria-hidden="true" /> Recusar
          </button>
        </div>
      </div>
    );
  }

  let status = 'Executando…';
  let tone = 'text-slate-500';
  if (part.state === 'output-available') {
    status = part.output?.erro ? `Erro: ${part.output.erro}` : 'Concluído';
    tone = part.output?.erro ? 'text-[#E53935]' : 'text-emerald-600';
  } else if (part.state === 'output-error') {
    status = `Erro: ${part.errorText}`;
    tone = 'text-[#E53935]';
  } else if (part.state === 'output-denied' || part.approval?.approved === false) {
    status = 'Recusado';
    tone = 'text-slate-500';
  }
  const running = part.state === 'input-streaming' || part.state === 'input-available' || part.state === 'approval-responded';

  return (
    <div className="flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs">
      {running ? (
        <Loader2 className="w-3.5 h-3.5 mt-0.5 animate-spin text-slate-500" aria-hidden="true" />
      ) : (
        <Wrench className="w-3.5 h-3.5 mt-0.5 text-slate-500" aria-hidden="true" />
      )}
      <div className="min-w-0">
        <span className="font-bold text-slate-700">{label}</span>
        {descricao && <span className="text-slate-500">{' — '}{descricao}</span>}
        <div className={`font-semibold ${tone}`}>{running ? 'Executando…' : status}</div>
      </div>
    </div>
  );
}

export default function AdminAgent({ token, onDataChanged }) {
  const [input, setInput] = useState('');
  const [modo, setModo] = useState('medio');
  const modoRef = useRef(modo);
  modoRef.current = modo;
  const endRef = useRef(null);

  const { messages, sendMessage, addToolApprovalResponse, status, error, setMessages, stop } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/admin/agent',
      headers: { Authorization: `Bearer ${token}` },
      body: () => ({ modo: modoRef.current }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onFinish: () => onDataChanged?.(),
  });

  const busy = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  function submit(text) {
    const value = text.trim();
    if (!value || busy) return;
    sendMessage({ text: value });
    setInput('');
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      submit(input);
    }
  }

  function onApprove(id, approved) {
    addToolApprovalResponse({ id, approved });
  }

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8" aria-labelledby="agent-title">
      <div className="rounded-2xl bg-white border border-black/5 shadow-sm flex flex-col h-[calc(100dvh-11rem)] min-h-[480px]">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-black/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#FFD92E] via-[#F8D000] to-[#F0B000] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#181820]" aria-hidden="true" />
            </div>
            <div>
              <h2 id="agent-title" className="font-extrabold text-[#181820] leading-tight">Agente IA</h2>
              <p className="text-xs text-slate-500">Pesquisa na internet, abre sites e gerencia ofertas, robô e banner.</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => { stop(); setMessages([]); }}
              className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" /> Nova conversa
            </button>
          )}
        </div>

        <div className="px-4 sm:px-5 py-3 border-b border-black/5" role="radiogroup" aria-label="Modo do agente">
          <div className="grid grid-cols-3 gap-2">
            {MODOS.map(({ id, label, desc, Icon }) => {
              const active = modo === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setModo(id)}
                  className={`flex items-center justify-center gap-2 min-h-11 px-2 rounded-xl border text-sm font-bold transition ${
                    active
                      ? 'border-[#F0B000] bg-gradient-to-b from-[#FFD92E] via-[#F8D000] to-[#F0B000] text-[#181820] shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-[#F0B000]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="flex flex-col items-start leading-tight">
                    <span>{label}</span>
                    <span className={`hidden sm:block text-[11px] font-medium ${active ? 'text-[#181820]/70' : 'text-slate-400'}`}>{desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 flex flex-col gap-4" aria-live="polite">
          {messages.length === 0 && (
            <div className="my-auto text-center">
              <p className="text-sm text-slate-600">
                Diga o que quer mudar no site. Toda alteração só acontece depois que você aprovar.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="min-h-11 px-3 rounded-full border border-slate-200 bg-slate-50 text-sm text-slate-700 hover:border-[#F0B000] hover:bg-[#FFFBEA] transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] sm:max-w-[80%] flex flex-col gap-2 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                {message.parts.map((part, i) => {
                  if (part.type === 'text') {
                    if (!part.text) return null;
                    return (
                      <div
                        key={i}
                        className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                          message.role === 'user' ? 'bg-[#181820] text-white' : 'bg-slate-100 text-[#181820]'
                        }`}
                      >
                        {part.text}
                      </div>
                    );
                  }
                  if (isToolUIPart(part)) {
                    return <ToolPart key={part.toolCallId} part={part} onApprove={onApprove} />;
                  }
                  return null;
                })}
              </div>
            </div>
          ))}

          {status === 'submitted' && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Pensando…
            </div>
          )}
          {error && (
            <p className="text-sm text-[#E53935]" role="alert">
              Não foi possível falar com o agente: {error.message}
            </p>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); submit(input); }}
          className="border-t border-black/5 p-3 sm:p-4 flex items-end gap-2"
        >
          <label htmlFor="agent-input" className="sr-only">Mensagem para o agente</label>
          <textarea
            id="agent-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ex.: exclua as ofertas de Alimentos com preço acima de R$ 200"
            className="flex-1 resize-none max-h-40 min-h-11 rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8D000]"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-b from-[#FFD92E] via-[#F8D000] to-[#F0B000] text-[#181820] disabled:opacity-50 transition"
            aria-label="Enviar mensagem"
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Send className="w-5 h-5" aria-hidden="true" />}
          </button>
        </form>
      </div>
    </section>
  );
}
