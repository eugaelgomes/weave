import Link from "next/link";
import { FaBook, FaRocket, FaUsers, FaShieldAlt } from "react-icons/fa";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center md:py-28">
        <h1 className="mb-6 text-4xl font-bold text-neutral-100 md:text-6xl">
          Organize suas ideias em um só <span className="text-yellow-500">lugar</span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-neutral-400 md:text-xl">
          Uma plataforma simples e eficiente para criar, organizar e compartilhar suas anotações.
          Mantenha tudo sincronizado e acessível de qualquer lugar.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/auth/signup"
            className="w-full rounded-lg bg-yellow-500/90 px-8 py-3 font-semibold text-neutral-950 transition-all hover:bg-yellow-500 sm:w-auto"
          >
            Começar Agora
          </Link>
          <Link
            href="/about"
            className="w-full rounded-lg border border-neutral-700 px-8 py-3 font-medium text-neutral-300 transition-all hover:border-neutral-600 hover:bg-neutral-900/50 sm:w-auto"
          >
            Saiba Mais
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold text-neutral-100">
          Por que usar o Weave Notes?
        </h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-neutral-800/50 bg-neutral-900/50 p-6 backdrop-blur-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10">
              <FaBook className="h-6 w-6 text-yellow-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-neutral-100">Simples e Prático</h3>
            <p className="text-sm text-neutral-400">
              Interface intuitiva que facilita a criação e organização das suas notas sem
              complicações.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800/50 bg-neutral-900/50 p-6 backdrop-blur-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10">
              <FaRocket className="h-6 w-6 text-yellow-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-neutral-100">Rápido e Eficiente</h3>
            <p className="text-sm text-neutral-400">
              Acesse suas notas instantaneamente, com sincronização em tempo real e desempenho
              otimizado.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800/50 bg-neutral-900/50 p-6 backdrop-blur-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10">
              <FaUsers className="h-6 w-6 text-yellow-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-neutral-100">Colaboração</h3>
            <p className="text-sm text-neutral-400">
              Compartilhe suas notas e colabore com outras pessoas de forma fácil e segura.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800/50 bg-neutral-900/50 p-6 backdrop-blur-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10">
              <FaShieldAlt className="h-6 w-6 text-yellow-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-neutral-100">Seguro</h3>
            <p className="text-sm text-neutral-400">
              Seus dados são protegidos com tecnologias modernas de segurança e criptografia.
            </p>
          </div>
        </div>
      </section>

      {/* Purpose Section */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="rounded-xl border border-neutral-800/50 bg-neutral-900/50 p-8 backdrop-blur-sm md:p-12">
          <h2 className="mb-6 text-center text-3xl font-bold text-neutral-100">
            O Propósito do Weave Notes
          </h2>
          <div className="space-y-4 text-neutral-300">
            <p>
              O <strong className="text-yellow-500">Weave Notes</strong> nasceu da necessidade de
              ter uma ferramenta de anotações que fosse ao mesmo tempo <strong>simples</strong>,{" "}
              <strong>rápida</strong> e <strong>eficiente</strong>. Em um mundo cada vez mais
              digital, é fundamental ter um espaço confiável para capturar ideias, organizar
              pensamentos e manter informações importantes sempre à mão.
            </p>
            <p>
              Nossa missão é proporcionar uma experiência sem fricções, onde você possa focar no que
              realmente importa: <strong>suas ideias e projetos</strong>. Acreditamos que
              ferramentas de produtividade devem facilitar a vida, não complicá-la.
            </p>
            <p>
              Seja para uso pessoal, profissional ou acadêmico, o Weave Notes foi desenvolvido para
              ser seu <strong className="text-yellow-500">companheiro digital</strong> na jornada de
              organização e produtividade.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="mb-4 text-3xl font-bold text-neutral-100">
          Pronto para começar a organizar?
        </h2>
        <p className="mb-8 text-neutral-400">
          Junte-se a centenas de usuários que já transformaram a forma de gerenciar suas anotações.
        </p>
        <Link
          href="/auth/signup"
          className="inline-block rounded-lg bg-yellow-500/90 px-8 py-3 font-semibold text-neutral-950 transition-all hover:bg-yellow-500"
        >
          Criar Conta Grátis
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800/50 py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-neutral-500 md:flex-row">
            <p>&copy; {new Date().getFullYear()} Weave Notes. Todos os direitos reservados.</p>
            <div className="flex gap-6">
              <Link href="/about" className="transition-colors hover:text-neutral-300">
                Sobre
              </Link>
              <Link
                href="https://github.com/eugaelgomes/notes-web-app"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-neutral-300"
              >
                GitHub
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
