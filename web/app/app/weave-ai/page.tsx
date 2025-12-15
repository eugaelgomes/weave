"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Paperclip,
  Bot,
  User,
  MoreVertical,
  Plus,
  MessageSquare,
  Search,
  Menu,
  X,
  Sparkles,
  Copy,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

// Tipos simulados
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: Date;
}

// Componente Auxiliar de Item de Histórico
const HistoryItem = ({ title, active = false }: { title: string; active?: boolean }) => (
  <div
    className={`group mb-1 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
      active
        ? "border border-neutral-700/50 bg-neutral-800 font-medium text-neutral-100"
        : "border border-transparent text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
    } `}
  >
    <MessageSquare
      className={`h-4 w-4 flex-shrink-0 ${active ? "text-yellow-500" : "text-neutral-600 group-hover:text-neutral-500"}`}
    />
    <span className="truncate">{title}</span>
  </div>
);

export default function ChatPage() {
  // Estados
  const [input, setInput] = useState("");
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mock Data
  const chatHistory: ChatSession[] = [
    { id: "1", title: "Resumo do Projeto Alpha", updatedAt: new Date() },
    { id: "2", title: "Ideias para Marketing", updatedAt: new Date(Date.now() - 86400000) },
    { id: "3", title: "Debug do AuthContext", updatedAt: new Date(Date.now() - 172800000) },
    { id: "4", title: "Refatoração CSS", updatedAt: new Date(Date.now() - 259200000) },
  ];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Olá! Sou o assistente inteligente do Weave Notes. Como posso ajudar você a organizar suas ideias ou projetos hoje?",
      timestamp: new Date(Date.now() - 10000),
    },
    {
      id: "2",
      role: "user",
      content: "Estou precisando de ajuda para estruturar um novo projeto de API.",
      timestamp: new Date(Date.now() - 5000),
    },
  ]);

  // Effects
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "inherit";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [input]);

  // Handlers
  const handleSendMessage = () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Entendido. Para estruturar uma API robusta, recomendo começarmos definindo os principais recursos (Resources) e os relacionamentos do banco de dados. Você já tem um diagrama ER ou gostaria de sugestões baseadas no tema?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-950 font-sans text-neutral-200 selection:bg-yellow-500/30 selection:text-yellow-200">
      {/* === MODAL DE HISTÓRICO === */}
      <div
        className={`fixed inset-0 z-50 flex transition-opacity duration-300 ${
          isHistoryModalOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* Overlay com Blur */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setIsHistoryModalOpen(false)}
        />

        {/* Painel Lateral Deslizante */}
        <div
          className={`relative flex h-full w-[300px] flex-col border-r border-neutral-800 bg-neutral-950 shadow-2xl transition-transform duration-300 ease-out ${isHistoryModalOpen ? "translate-x-0" : "-translate-x-full"} `}
        >
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-neutral-800 px-4">
            <h2 className="text-sm font-semibold tracking-wide text-neutral-100">Histórico</h2>
            <button
              onClick={() => setIsHistoryModalOpen(false)}
              className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-900 hover:text-neutral-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* New Chat Action */}
          <div className="p-4">
            <button
              onClick={() => {
                setIsHistoryModalOpen(false); /* Lógica de novo chat */
              }}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition-all hover:bg-yellow-400 hover:shadow-[0_0_15px_-3px_rgba(234,179,8,0.4)] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
              <span>Novo Chat</span>
            </button>
          </div>

          {/* Lista Scrollável */}
          <div className="scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent flex-1 overflow-y-auto px-2 py-2">
            <div className="mb-6">
              <h3 className="mb-3 px-3 text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
                Hoje
              </h3>
              {chatHistory.slice(0, 1).map((chat) => (
                <HistoryItem key={chat.id} title={chat.title} active />
              ))}
            </div>

            <div>
              <h3 className="mb-3 px-3 text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
                7 Dias
              </h3>
              {chatHistory.slice(1).map((chat) => (
                <HistoryItem key={chat.id} title={chat.title} />
              ))}
            </div>
          </div>

          {/* User Profile Footer */}
          <div className="border-t border-neutral-800 p-4">
            <div className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-800/50 bg-neutral-900/50 p-3 transition-all hover:border-neutral-700 hover:bg-neutral-900">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 text-xs font-bold text-neutral-950 shadow-lg">
                US
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-neutral-200">Usuário Weave</span>
                <span className="text-[10px] text-neutral-500">Pro Plan</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === ÁREA PRINCIPAL === */}
      <main className="relative flex min-w-0 flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-neutral-950">
        {/* Header Flutuante */}
        <header className="absolute top-0 right-0 left-0 z-10 flex h-16 items-center justify-between border-b border-white/5 bg-neutral-950/70 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-neutral-950/50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-200"
              title="Histórico"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
              <span className="text-sm font-medium tracking-tight text-neutral-200">
                Resumo do Projeto Alpha
              </span>
              <span className="hidden items-center rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-500 sm:inline-flex">
                <Sparkles className="mr-1 h-3 w-3" /> GPT-4o
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-200">
              <Search className="h-4 w-4" />
            </button>
            <button className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-200">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Container de Mensagens */}
        <div className="scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent flex-1 overflow-y-auto px-4 pt-20 pb-4">
          <div className="mx-auto max-w-3xl space-y-8">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`animate-in slide-in-from-bottom-2 flex gap-4 duration-500 ${msg.role === "assistant" ? "" : "flex-row-reverse"}`}
              >
                {/* Avatar */}
                <div
                  className={`mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg shadow-md ${
                    msg.role === "assistant"
                      ? "border border-neutral-700 bg-gradient-to-br from-neutral-800 to-neutral-900 text-yellow-500"
                      : "border border-neutral-700 bg-neutral-800 text-neutral-400"
                  } `}
                >
                  {msg.role === "assistant" ? (
                    <Bot className="h-5 w-5" />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </div>

                {/* Conteúdo */}
                <div
                  className={`flex max-w-[85%] flex-col sm:max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div className="mb-1.5 flex items-center gap-2 px-1 opacity-70">
                    <span className="text-xs font-medium text-neutral-300">
                      {msg.role === "assistant" ? "Weave AI" : "Você"}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div
                    className={`relative rounded-2xl px-5 py-3.5 text-sm leading-7 shadow-sm ${
                      msg.role === "assistant"
                        ? "rounded-tl-sm border border-yellow-500/10 bg-yellow-500/5 text-neutral-200" // IA
                        : "rounded-tr-sm border border-neutral-700/50 bg-neutral-800/80 text-neutral-100" // User
                    } `}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {/* Feedback Actions (IA) */}
                  {msg.role === "assistant" && (
                    <div className="mt-2 ml-1 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <button
                        className="rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
                        title="Copiar"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
                        title="Útil"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
                        title="Não útil"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex animate-pulse gap-4">
                <div className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-yellow-500">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="flex h-11 items-center gap-1.5 rounded-2xl rounded-tl-sm border border-neutral-800 bg-neutral-900/50 px-5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-500"></span>
                  <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-500 delay-100"></span>
                  <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-500 delay-200"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Área de Input Fixa */}
        <div className="relative z-20">
          {/* Gradiente de fade acima do input */}
          <div className="pointer-events-none absolute right-0 bottom-full left-0 h-12 bg-gradient-to-t from-neutral-950 to-transparent" />

          <div className="bg-neutral-950 px-4 pt-2 pb-6">
            <div className="mx-auto max-w-3xl">
              <div className="relative flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900/80 shadow-lg shadow-black/20 backdrop-blur-sm transition-all duration-300 focus-within:border-yellow-500/40 focus-within:shadow-[0_0_20px_-5px_rgba(234,179,8,0.1)] focus-within:ring-1 focus-within:ring-yellow-500/20">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte algo sobre seus projetos..."
                  className="scrollbar-thin scrollbar-thumb-neutral-700 max-h-[200px] min-h-[56px] w-full resize-none bg-transparent px-4 py-4 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none"
                  rows={1}
                />

                <div className="flex items-center justify-between px-3 pt-1 pb-3">
                  {/* Tools Left */}
                  <div className="flex items-center gap-1">
                    <button
                      className="group rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
                      title="Anexar arquivo"
                    >
                      <Paperclip className="h-4 w-4 transition-transform group-hover:-rotate-45" />
                    </button>
                    <button
                      className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
                      title="Prompt Library"
                    >
                      <Bot className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isTyping}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
                      input.trim()
                        ? "bg-yellow-500 text-neutral-950 shadow-[0_0_10px_-2px_rgba(234,179,8,0.5)] hover:scale-105 hover:bg-yellow-400"
                        : "cursor-not-allowed bg-neutral-800 text-neutral-600"
                    } `}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 text-center">
                <p className="text-[10px] font-medium text-neutral-600 transition-colors hover:text-neutral-500">
                  Weave AI pode cometer erros. Verifique informações importantes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
