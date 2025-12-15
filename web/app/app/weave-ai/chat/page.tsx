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
  Menu,
  X,
  Copy,
  Sparkles,
  ChevronDown,
  Globe,
  Zap,
} from "lucide-react";

// --- Tipos ---
type AIModel = "gemini" | "perplexity";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: AIModel; // Rastreia qual modelo gerou a resposta
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: Date;
}

// --- Componentes Menores ---

const ModelIcon = ({ model, className = "h-4 w-4" }: { model: AIModel; className?: string }) => {
  if (model === "perplexity") return <Globe className={`text-blue-500 ${className}`} />;
  return <Sparkles className={`text-yellow-500 ${className}`} />; // Gemini representation
};

const HistoryItem = ({ title }: { title: string }) => (
  <div className="group mb-1 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200">
    <MessageSquare className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 dark:text-neutral-600 dark:group-hover:text-neutral-400" />
    <span className="truncate">{title}</span>
  </div>
);

// --- Componente Principal ---
export default function ChatPage() {
  // Estados
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]); // Começa vazio
  const [selectedModel, setSelectedModel] = useState<AIModel>("gemini");
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mock History (apenas títulos)
  const chatHistory: ChatSession[] = [
    { id: "1", title: "Planejamento Q3", updatedAt: new Date() },
    { id: "2", title: "Review de Código", updatedAt: new Date() },
  ];

  // Auto-resize do textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "inherit";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [input]);

  // Scroll para o fundo
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Handlers
  const handleSendMessage = () => {
    if (!input.trim()) return;

    const currentModel = selectedModel; // Captura modelo atual
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulação de resposta da IA
    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        model: currentModel,
        content:
          currentModel === "gemini"
            ? "Essa é uma resposta simulada do **Gemini**. Ele é ótimo para raciocínio multimodal e criatividade."
            : "Esta é uma resposta simulada do **Perplexity**. Ele foca em busca em tempo real e citação de fontes.",
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
    <div className="flex h-screen w-full overflow-hidden bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* === SIDEBAR (Mobile & Desktop Drawer style) === */}
      <div
        className={`fixed inset-0 z-40 flex transition-opacity duration-300 ${
          isSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />

        <div
          className={`relative flex h-full w-[280px] flex-col border-r border-neutral-200 bg-neutral-50 shadow-2xl transition-transform duration-300 dark:border-neutral-800 dark:bg-neutral-900 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
            <span className="font-semibold text-neutral-500">Histórico</span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4">
            <button
              onClick={() => {
                setMessages([]);
                setIsSidebarOpen(false);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              <Plus className="h-4 w-4" /> Novo Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2">
            <div className="mb-2 px-2 text-xs font-medium tracking-wider text-neutral-400 uppercase">
              Recentes
            </div>
            {chatHistory.map((chat) => (
              <HistoryItem key={chat.id} title={chat.title} />
            ))}
          </div>

          {/* User Footer */}
          <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-xs font-bold text-neutral-900">
                U
              </div>
              <div className="text-sm font-medium">Usuário</div>
            </div>
          </div>
        </div>
      </div>

      {/* === ÁREA PRINCIPAL === */}
      <div className="relative flex h-full min-w-0 flex-1 flex-col">
        {/* HEADER */}
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-neutral-100 bg-white/80 px-4 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Model Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <span className="flex items-center gap-2 opacity-80">
                  <span className="text-xs text-neutral-400">Modelo:</span>
                  <div className="flex items-center gap-1.5">
                    <ModelIcon model={selectedModel} className="h-3.5 w-3.5" />
                    {selectedModel === "gemini" ? "Gemini 1.5 Pro" : "Perplexity"}
                  </div>
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${isModelMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isModelMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsModelMenuOpen(false)} />
                  <div className="absolute top-full left-0 z-20 mt-2 w-48 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                    <button
                      onClick={() => {
                        setSelectedModel("gemini");
                        setIsModelMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${selectedModel === "gemini" ? "bg-neutral-100 dark:bg-neutral-800" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"}`}
                    >
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      <div className="flex flex-col">
                        <span className="font-medium">Gemini</span>
                        <span className="text-[10px] text-neutral-500">Raciocínio lógico</span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedModel("perplexity");
                        setIsModelMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${selectedModel === "perplexity" ? "bg-neutral-100 dark:bg-neutral-800" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"}`}
                    >
                      <Globe className="h-4 w-4 text-blue-500" />
                      <div className="flex flex-col">
                        <span className="font-medium">Perplexity</span>
                        <span className="text-[10px] text-neutral-500">Busca atualizada</span>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <button className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <MoreVertical className="h-5 w-5" />
          </button>
        </header>

        {/* CHAT AREA */}
        <div className="flex-1 overflow-y-auto scroll-smooth px-4 py-4">
          {messages.length === 0 ? (
            /* EMPTY STATE / WELCOME */
            <div className="animate-in fade-in zoom-in flex h-full flex-col items-center justify-center opacity-0 duration-500">
              <div className="mb-6 rounded-2xl bg-gradient-to-br from-neutral-100 to-white p-6 shadow-sm dark:from-neutral-900 dark:to-neutral-900/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-neutral-800">
                  <ModelIcon model={selectedModel} className="h-6 w-6" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                Como posso ajudar você hoje?
              </h2>
              <p className="mt-2 max-w-md text-center text-neutral-500">
                Usando o modelo{" "}
                <strong className="text-neutral-800 capitalize dark:text-neutral-200">
                  {selectedModel}
                </strong>
                . Pergunte sobre código, análises ou ideias criativas.
              </p>
            </div>
          ) : (
            /* MESSAGES LIST */
            <div className="mx-auto max-w-3xl space-y-6 pb-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border ${
                      msg.role === "assistant"
                        ? "border-neutral-200 bg-white text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900"
                        : "border-transparent bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <ModelIcon model={msg.model || "gemini"} />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`flex max-w-[85%] flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div className="mb-1 flex items-center gap-2 opacity-70">
                      <span className="text-xs font-medium">
                        {msg.role === "user"
                          ? "Você"
                          : msg.model === "perplexity"
                            ? "Perplexity"
                            : "Gemini"}
                      </span>
                    </div>
                    <div
                      className={`relative rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${
                        msg.role === "assistant"
                          ? "border border-neutral-100 bg-white text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                          : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>

                    {/* Actions only for AI */}
                    {msg.role === "assistant" && (
                      <div className="mt-2 ml-1 flex items-center gap-2">
                        <button className="text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-300">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex animate-pulse gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                    <Bot className="h-4 w-4 text-neutral-400" />
                  </div>
                  <div className="flex h-8 items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400"></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 delay-100"></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 delay-200"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* INPUT AREA */}
        <div className="z-20 bg-white/90 px-4 pt-2 pb-6 backdrop-blur-lg dark:bg-neutral-950/90">
          <div className="mx-auto max-w-3xl">
            <div className="relative flex flex-col rounded-2xl border border-neutral-200 bg-neutral-50 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-neutral-200/50 dark:border-neutral-800 dark:bg-neutral-900/50 dark:focus-within:bg-neutral-900 dark:focus-within:ring-neutral-800">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Perguntar ao ${selectedModel === "gemini" ? "Gemini" : "Perplexity"}...`}
                className="max-h-[200px] min-h-[56px] w-full resize-none bg-transparent px-4 py-4 text-sm text-neutral-900 placeholder-neutral-500 focus:outline-none dark:text-neutral-100 dark:placeholder-neutral-600"
                rows={1}
              />

              <div className="flex items-center justify-between px-2 pb-2">
                <div className="flex gap-1">
                  <button className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-200/50 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300">
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-200/50 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300">
                    <Zap className="h-4 w-4" />
                  </button>
                </div>

                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isTyping}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
                    input.trim()
                      ? "bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
                      : "cursor-not-allowed bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600"
                  }`}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="mt-3 text-center text-[10px] text-neutral-400">
              O modelo pode cometer erros. Considere verificar informações importantes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
