import Image from "next/image";
import Link from "next/link";
import {
  FaArrowRight,
  FaBolt,
  FaBrain,
  FaCode,
  FaFolder,
  FaKeyboard,
  FaLock,
  FaMagic,
  FaRocket,
  FaSearch,
  FaTags,
  FaUsers,
} from "react-icons/fa";
import { HiSparkles } from "react-icons/hi2";

const IndexPage = () => {
  return (
    <div className="spaces-y-8 flex min-h-screen w-full flex-col bg-neutral-50 text-neutral-900 selection:bg-yellow-500/20 selection:text-yellow-900 dark:bg-neutral-950 dark:text-neutral-50 dark:selection:bg-yellow-500/30 dark:selection:text-yellow-200">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-neutral-200/60 bg-white/80 backdrop-blur-xl transition-all dark:border-neutral-800/60 dark:bg-neutral-950/80">
        <div className="mx-auto flex h-16 max-w-6xl justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/weave.png"
              alt="Weave Logo"
              width={32}
              height={32}
              className="h-8 w-8 rounded-sm object-cover"
            />
            <span className="text-sm font-semibold tracking-tight sm:text-base">Weave Notes</span>
          </Link>

          <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50/80 px-3 py-1.5 text-xs font-medium text-yellow-700 backdrop-blur sm:mb-8 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300">
            <HiSparkles className="h-3.5 w-3.5" />
            <span>Weave AI 2.0 — Seu assistente de escrita</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/auth/signin"
              className="hidden text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 sm:block dark:text-neutral-400 dark:hover:text-white"
            >
              Entrar
            </Link>
            <span className="hidden h-5 w-px bg-neutral-300 sm:block dark:bg-neutral-700"></span>
            <Link
              href="/auth/signup"
              className="group flex items-center gap-2 rounded-lg bg-yellow-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm shadow-yellow-500/20 transition-all hover:bg-yellow-600 sm:px-4 sm:py-2"
            >
              <span>Criar conta</span>
              <FaArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex flex-1 flex-col">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background Pattern */}
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)]"></div>

          <div className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-20 md:pt-20 md:pb-24">
            <div className="text-center">
              {/* Heading */}
              <h1 className="mx-auto mb-4 max-w-4xl bg-gradient-to-b from-neutral-900 to-neutral-600 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:mb-6 sm:text-5xl md:text-6xl lg:text-7xl dark:from-white dark:to-neutral-400">
                Onde suas ideias
                <br className="hidden sm:block" />
                <span className="sm:hidden"> </span>
                ganham forma.
              </h1>

              {/* Subtitle */}
              <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-neutral-600 sm:mb-10 sm:text-lg md:text-xl dark:text-neutral-400">
                Notas, projetos e tarefas em um único lugar. Editor poderoso com blocos, colaboração
                em tempo real e IA integrada para acelerar seu fluxo de trabalho.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <Link
                  href="/auth/signup"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 px-6 font-semibold text-white shadow-lg shadow-yellow-500/25 transition-all hover:-translate-y-0.5 hover:bg-yellow-600 hover:shadow-xl sm:w-auto sm:px-8"
                >
                  <FaRocket className="h-4 w-4" />
                  Criar workspace grátis
                </Link>
                <Link
                  href="/about"
                  className="flex h-12 w-full items-center justify-center rounded-xl border border-neutral-200 bg-white px-6 font-semibold text-neutral-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-neutral-50 sm:w-auto sm:px-8 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Conhecer o manifesto
                </Link>
              </div>

              {/* Social Proof */}
              <p className="mt-6 text-xs text-neutral-500 sm:mt-8 sm:text-sm dark:text-neutral-500">
                Feito para desenvolvedores e criadores que valorizam{" "}
                <span className="font-medium text-neutral-700 dark:text-neutral-300">foco</span> e{" "}
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  simplicidade
                </span>
                .
              </p>
            </div>

            {/* Hero Image - Interface Preview */}
            <div className="relative mx-auto mt-12 max-w-5xl sm:mt-16">
              <div className="rounded-2xl border border-neutral-200/80 bg-neutral-100/50 p-1.5 shadow-2xl backdrop-blur-sm sm:p-2 dark:border-neutral-800 dark:bg-neutral-900/50 dark:shadow-yellow-500/5">
                <div className="aspect-[16/10] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                  {/* Interface Skeleton */}
                  <div className="flex h-full flex-col">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/80 px-3 py-2.5 sm:px-4 sm:py-3 dark:border-neutral-800 dark:bg-neutral-900">
                      <div className="flex gap-1.5 sm:gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-400 sm:h-3 sm:w-3 dark:bg-red-500/60"></div>
                        <div className="h-2.5 w-2.5 rounded-full bg-yellow-400 sm:h-3 sm:w-3 dark:bg-yellow-500/60"></div>
                        <div className="h-2.5 w-2.5 rounded-full bg-green-400 sm:h-3 sm:w-3 dark:bg-green-500/60"></div>
                      </div>
                      <div className="h-5 w-32 rounded-md bg-neutral-200/50 sm:h-6 sm:w-48 dark:bg-neutral-800"></div>
                      <div className="h-5 w-5 rounded-md bg-neutral-200/50 sm:h-6 sm:w-6 dark:bg-neutral-800"></div>
                    </div>
                    {/* Content */}
                    <div className="flex flex-1 overflow-hidden">
                      {/* Sidebar */}
                      <div className="hidden w-48 border-r border-neutral-100 p-3 sm:block sm:w-56 sm:p-4 dark:border-neutral-800">
                        <div className="mb-4 h-4 w-20 rounded bg-neutral-300 dark:bg-neutral-700"></div>
                        <div className="space-y-2.5 sm:space-y-3">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-2.5 sm:gap-3">
                              <div className="h-3.5 w-3.5 rounded bg-neutral-200 sm:h-4 sm:w-4 dark:bg-neutral-800"></div>
                              <div
                                className="h-2.5 rounded bg-neutral-100 sm:h-3 dark:bg-neutral-800/50"
                                style={{ width: `${60 + Math.random() * 40}%` }}
                              ></div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Main Content */}
                      <div className="flex-1 p-4 sm:p-6 md:p-8">
                        <div className="h-6 w-2/5 rounded-lg bg-neutral-200 sm:h-8 dark:bg-neutral-800"></div>
                        <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
                          <div className="h-3 w-full rounded bg-neutral-100 sm:h-4 dark:bg-neutral-800/50"></div>
                          <div className="h-3 w-5/6 rounded bg-neutral-100 sm:h-4 dark:bg-neutral-800/50"></div>
                          <div className="h-3 w-4/6 rounded bg-neutral-100 sm:h-4 dark:bg-neutral-800/50"></div>
                        </div>
                        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4">
                          <div className="h-20 rounded-xl border border-neutral-100 bg-neutral-50/50 sm:h-28 dark:border-neutral-800 dark:bg-neutral-900/50"></div>
                          <div className="h-20 rounded-xl border border-neutral-100 bg-neutral-50/50 sm:h-28 dark:border-neutral-800 dark:bg-neutral-900/50"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative Glow */}
              <div className="absolute -inset-x-20 -bottom-10 -z-10 h-40 bg-gradient-to-t from-yellow-500/5 to-transparent blur-3xl dark:from-yellow-500/10"></div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="border-t border-neutral-200 bg-white py-16 sm:py-20 md:py-24 dark:border-neutral-800 dark:bg-neutral-900/30"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-10 sm:mb-12 md:mb-16 md:text-center">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl md:text-4xl dark:text-white">
                Tudo que você precisa para
                <br className="hidden md:block" />
                <span className="text-yellow-500"> organizar seu conhecimento</span>
              </h2>
              <p className="mt-3 text-base text-neutral-600 sm:mt-4 sm:text-lg dark:text-neutral-400">
                Simples na superfície. Poderoso sob o capô.
              </p>
            </div>

            {/* Feature Grid - Bento Style */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
              {/* Card 1 - Editor de Blocos (Large) */}
              <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 p-6 transition-all hover:shadow-lg sm:col-span-2 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900/50">
                <div className="pointer-events-none absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-yellow-50/30 to-transparent dark:from-yellow-900/5"></div>
                <div className="relative z-10">
                  <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-yellow-100 p-3 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400">
                    <FaCode size={22} />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 sm:text-2xl dark:text-white">
                    Editor de blocos versátil
                  </h3>
                  <p className="mt-2 max-w-md text-neutral-600 dark:text-neutral-400">
                    Texto, código, listas, parágrafos e muito mais. Arraste e reorganize blocos como
                    quiser. Interface drag-and-drop intuitiva.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {["Texto", "Código", "Lista", "Parágrafo", "Heading"].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-neutral-200/70 px-3 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 2 - Projetos */}
              <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 p-6 transition-all hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900/50">
                <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <FaFolder size={20} />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 sm:text-xl dark:text-white">
                  Projetos organizados
                </h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  Agrupe notas em projetos com status, prioridade e progresso. Visualize tudo de
                  forma clara.
                </p>
              </div>

              {/* Card 3 - Colaboração */}
              <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 p-6 transition-all hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900/50">
                <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-green-100 p-3 text-green-600 dark:bg-green-500/10 dark:text-green-400">
                  <FaUsers size={20} />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 sm:text-xl dark:text-white">
                  Colaboração em tempo real
                </h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  Compartilhe notas e projetos. Convide colaboradores e trabalhem juntos com
                  sincronização instantânea.
                </p>
              </div>

              {/* Card 4 - Tags */}
              <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 p-6 transition-all hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900/50">
                <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-purple-100 p-3 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                  <FaTags size={20} />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 sm:text-xl dark:text-white">
                  Sistema de tags
                </h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  Categorize com tags e palavras-chave. Encontre qualquer coisa em segundos com
                  busca inteligente.
                </p>
              </div>

              {/* Card 5 - Segurança */}
              <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 p-6 transition-all hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900/50">
                <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-red-100 p-3 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                  <FaLock size={20} />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 sm:text-xl dark:text-white">
                  Seus dados protegidos
                </h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  Autenticação JWT segura, cookies HttpOnly e backup completo. Você tem controle
                  total.
                </p>
              </div>

              {/* Card 6 - Velocidade */}
              <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 p-6 transition-all hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900/50">
                <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-orange-100 p-3 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                  <FaBolt size={20} />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 sm:text-xl dark:text-white">
                  Rápido de verdade
                </h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  Construído com Next.js 15 e Node.js. Carregamento instantâneo, zero fricção.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* AI Section */}
        <section
          id="ai"
          className="border-t border-neutral-200 bg-neutral-50 py-16 sm:py-20 md:py-24 dark:border-neutral-800 dark:bg-neutral-950"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              {/* Content */}
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-yellow-500/10 to-orange-500/10 px-4 py-1.5 text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  <FaMagic className="h-4 w-4" />
                  Powered by Google Gemini
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl md:text-4xl dark:text-white">
                  Weave AI:
                  <br />
                  <span className="text-yellow-500">seu co-piloto de escrita</span>
                </h2>
                <p className="mt-4 text-base leading-relaxed text-neutral-600 sm:text-lg dark:text-neutral-400">
                  IA integrada para te ajudar a escrever melhor, organizar ideias e responder
                  perguntas sobre suas próprias notas. Converse naturalmente e deixe a IA fazer o
                  trabalho pesado.
                </p>

                <ul className="mt-6 space-y-4 sm:mt-8">
                  {[
                    { icon: FaBrain, text: "Entende o contexto das suas notas" },
                    { icon: FaSearch, text: "Busca semântica inteligente" },
                    { icon: FaKeyboard, text: "Sugestões de escrita em tempo real" },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <span className="text-neutral-700 dark:text-neutral-300">{item.text}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/signup"
                  className="mt-8 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  Experimentar Weave AI
                  <FaArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Visual */}
              <div className="relative">
                <div className="rounded-2xl border border-neutral-300 bg-neutral-900 p-4 shadow-2xl sm:p-6 dark:border-neutral-800">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                    <span className="text-sm font-medium text-neutral-400">Weave AI Chat</span>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-lg bg-neutral-800 p-3 text-sm text-neutral-300">
                      <p className="text-neutral-500">Você:</p>
                      <p className="mt-1">Resuma minhas notas sobre o projeto de API</p>
                    </div>
                    <div className="rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-200">
                      <p className="text-yellow-400/70">Weave AI:</p>
                      <p className="mt-1">
                        Encontrei 3 notas relacionadas. O projeto de API inclui endpoints REST para
                        gerenciar projetos, colaboradores e notas. A autenticação usa JWT...
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2">
                    <input
                      type="text"
                      placeholder="Pergunte algo..."
                      className="flex-1 bg-transparent text-sm text-neutral-300 placeholder-neutral-600 outline-none"
                      disabled
                    />
                    <button className="rounded bg-yellow-500 p-1.5 text-white">
                      <FaArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {/* Decorative */}
                <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 blur-2xl"></div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-neutral-200 bg-gradient-to-b from-white to-neutral-50 py-16 sm:py-20 md:py-24 dark:border-neutral-800 dark:from-neutral-900/50 dark:to-neutral-950">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl md:text-4xl dark:text-white">
              Pronto para organizar
              <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>
              suas ideias?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-neutral-600 sm:text-lg dark:text-neutral-400">
              Comece gratuitamente. Sem cartão de crédito. Sem compromisso.
              <br className="hidden sm:block" />
              Crie seu workspace em segundos.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/auth/signup"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 px-8 font-semibold text-white shadow-lg shadow-yellow-500/25 transition-all hover:-translate-y-0.5 hover:bg-yellow-600 sm:w-auto"
              >
                <HiSparkles className="h-5 w-5" />
                Criar conta grátis
              </Link>
            </div>
            <p className="mt-6 text-xs text-neutral-500 dark:text-neutral-600">
              Ao criar uma conta, você concorda com nossos termos de uso.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-neutral-50 py-8 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <Image
                src="/weave.png"
                alt="Weave Logo"
                width={24}
                height={24}
                className="h-6 w-6 rounded-sm object-cover"
              />
              <span className="font-semibold text-neutral-900 dark:text-white">Weave Notes</span>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-neutral-500 sm:gap-8 dark:text-neutral-400">
              <Link
                href="/about"
                className="transition-colors hover:text-neutral-900 dark:hover:text-white"
              >
                Sobre
              </Link>
              <Link
                href="https://linkedin.com/in/gael-rene-gomes"
                target="_blank"
                className="transition-colors hover:text-neutral-900 dark:hover:text-white"
              >
                LinkedIn
              </Link>
              <Link
                href="https://github.com/eugaelgomes"
                target="_blank"
                className="transition-colors hover:text-neutral-900 dark:hover:text-white"
              >
                GitHub
              </Link>
            </div>

            <p className="text-xs text-neutral-400 dark:text-neutral-600">
              © {new Date().getFullYear()} Weave Notes
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default IndexPage;
