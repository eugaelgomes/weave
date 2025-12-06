import Link from "next/link";
import { FaBook, FaRocket, FaUsers, FaShieldAlt, FaArrowRight } from "react-icons/fa";

export default function HomePage() {
  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-200 selection:bg-yellow-500/20 selection:text-yellow-500">
      {/* Background Grid Pattern (Sutil) */}
      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      {/* Radial Gradient para foco no Hero */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]"></div>

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center py-32 text-center md:py-40">
          <div className="mb-6 inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900/50 px-3 py-1">
            <span className="text-xs font-medium text-yellow-500">v2.0 Lançada</span>
            <div className="mx-2 h-3 w-px bg-neutral-800"></div>
            <span className="text-xs text-neutral-400">
              Novas feat de collab, projetos e fluxo de notas
            </span>
          </div>

          <h1 className="mb-6 max-w-4xl text-5xl font-bold tracking-tighter text-neutral-100 md:text-7xl">
            Organize suas ideias em <br className="hidden md:block" />
            um só <span className="text-yellow-500">lugar</span>.
          </h1>

          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-neutral-500 md:text-xl">
            Uma plataforma simples e eficiente para criar, organizar e compartilhar anotações.
            Sincronização em tempo real e foco total no seu conteúdo.
          </p>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/auth/signup"
              className="flex items-center justify-center gap-2 rounded bg-yellow-500 px-8 py-3 text-sm font-semibold text-neutral-950 transition-all hover:bg-yellow-400 active:scale-95 sm:w-auto"
            >
              Começar Agora
              <FaArrowRight size={12} />
            </Link>
            <Link
              href="/about"
              className="flex items-center justify-center rounded border border-neutral-800 bg-neutral-900 px-8 py-3 text-sm font-medium text-neutral-300 transition-all hover:border-neutral-700 hover:text-neutral-100 active:scale-95 sm:w-auto"
            >
              Documentação
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="border-t border-neutral-800 py-24">
          <div className="mb-16 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-100 md:text-3xl">
              Por que Weave Notes?
            </h2>
            <p className="mt-4 text-neutral-500">
              Ferramentas essenciais para sua produtividade diária.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Feature 1 */}
            <div className="group rounded-lg border border-neutral-800 bg-neutral-900/20 p-6 transition-colors hover:border-neutral-700 hover:bg-neutral-900/40">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded border border-neutral-800 bg-neutral-900 text-neutral-400 group-hover:text-yellow-500">
                <FaBook size={16} />
              </div>
              <h3 className="mb-2 font-semibold text-neutral-200">Simples e Prático</h3>
              <p className="text-sm leading-relaxed text-neutral-500">
                Interface intuitiva que facilita a criação e organização das suas notas sem
                complicações desnecessárias.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-lg border border-neutral-800 bg-neutral-900/20 p-6 transition-colors hover:border-neutral-700 hover:bg-neutral-900/40">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded border border-neutral-800 bg-neutral-900 text-neutral-400 group-hover:text-yellow-500">
                <FaRocket size={16} />
              </div>
              <h3 className="mb-2 font-semibold text-neutral-200">Rápido e Eficiente</h3>
              <p className="text-sm leading-relaxed text-neutral-500">
                Acesse suas notas instantaneamente. Engine otimizada para carregar seu conteúdo em
                milissegundos.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-lg border border-neutral-800 bg-neutral-900/20 p-6 transition-colors hover:border-neutral-700 hover:bg-neutral-900/40">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded border border-neutral-800 bg-neutral-900 text-neutral-400 group-hover:text-yellow-500">
                <FaUsers size={16} />
              </div>
              <h3 className="mb-2 font-semibold text-neutral-200">Colaboração</h3>
              <p className="text-sm leading-relaxed text-neutral-500">
                Compartilhe workspaces inteiros e colabore com seu time em tempo real.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group rounded-lg border border-neutral-800 bg-neutral-900/20 p-6 transition-colors hover:border-neutral-700 hover:bg-neutral-900/40">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded border border-neutral-800 bg-neutral-900 text-neutral-400 group-hover:text-yellow-500">
                <FaShieldAlt size={16} />
              </div>
              <h3 className="mb-2 font-semibold text-neutral-200">Segurança</h3>
              <p className="text-sm leading-relaxed text-neutral-500">
                Criptografia ponta a ponta e backups automáticos para garantir a integridade dos
                seus dados.
              </p>
            </div>
          </div>
        </div>

        {/* Purpose / Manifesto Section - Estilo "Documentation" */}
        <div className="mx-auto max-w-3xl border-t border-neutral-800 py-24">
          <div className="flex flex-col gap-8 md:flex-row md:gap-12">
            <div className="md:w-1/3">
              <h3 className="text-lg font-bold text-neutral-100">O Manifesto</h3>
              <p className="mt-2 text-sm text-neutral-500">Por que construímos isso.</p>
            </div>
            <div className="space-y-6 text-neutral-400 md:w-2/3">
              <p className="leading-relaxed">
                O <strong className="text-neutral-200">Weave Notes</strong> nasceu da frustração com
                ferramentas complexas demais. Acreditamos que a produtividade vem da clareza, não do
                excesso de funcionalidades.
              </p>
              <p className="leading-relaxed">
                Em um mundo digital ruidoso, oferecemos silêncio. Um espaço em branco, rápido e
                confiável, onde suas ideias são as protagonistas.
              </p>
              <p className="leading-relaxed">
                Seja para uso pessoal ou profissional, construímos o{" "}
                <strong className="text-yellow-500">companheiro digital</strong> que gostaríamos de
                usar todos os dias.
              </p>
            </div>
          </div>
        </div>

        {/* Simple CTA */}
        <div className="border-t border-neutral-800 py-24 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-neutral-100">
            Comece a organizar hoje.
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-neutral-500">
            Junte-se a desenvolvedores e designers que escolheram simplicidade.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block rounded bg-neutral-100 px-8 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-300"
          >
            Criar Conta Grátis
          </Link>
        </div>

        {/* Footer Minimalista */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-neutral-800 py-8 text-xs text-neutral-500 md:flex-row">
          <div className="flex gap-1">
            <span>&copy; {new Date().getFullYear()} Weave Notes.</span>
            <span className="hidden md:inline">Open Source Software.</span>
          </div>
          <div className="flex gap-6">
            <Link href="/about" className="hover:text-neutral-300">
              Sobre
            </Link>
            <Link href="#" className="hover:text-neutral-300">
              Privacidade
            </Link>
            <Link
              href="https://github.com/eugaelgomes/notes-web-app"
              target="_blank"
              className="hover:text-neutral-300"
            >
              GitHub
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
