import Link from "next/link";
import { FaBook, FaUsers, FaLock, FaRocket } from "react-icons/fa";

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-800/50 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-yellow-500/90">
                <FaBook className="h-5 w-5 text-neutral-950" />
              </div>
              <span className="text-xl font-bold text-neutral-100">Notes App</span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/auth/signin"
                className="rounded-md px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:text-neutral-100"
              >
                Entrar
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-md bg-yellow-500/90 px-4 py-2 text-sm font-semibold text-neutral-950 transition-all hover:bg-yellow-500"
              >
                Criar Conta
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="mb-4 text-5xl font-bold text-neutral-100">
          Sobre o <span className="text-yellow-500">Notes App</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-neutral-400">
          Uma plataforma moderna e intuitiva para organizar suas ideias, projetos e conhecimentos em
          um só lugar.
        </p>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-neutral-800/50 bg-neutral-900/50 p-6 backdrop-blur-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-yellow-500/10">
              <FaBook className="h-6 w-6 text-yellow-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-neutral-100">Organização</h3>
            <p className="text-sm text-neutral-400">
              Mantenha suas notas organizadas e sempre acessíveis de qualquer lugar.
            </p>
          </div>

          <div className="rounded-md border border-neutral-800/50 bg-neutral-900/50 p-6 backdrop-blur-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-yellow-500/10">
              <FaUsers className="h-6 w-6 text-yellow-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-neutral-100">Colaboração</h3>
            <p className="text-sm text-neutral-400">
              Compartilhe e colabore em notas com sua equipe em tempo real.
            </p>
          </div>

          <div className="rounded-md border border-neutral-800/50 bg-neutral-900/50 p-6 backdrop-blur-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-yellow-500/10">
              <FaLock className="h-6 w-6 text-yellow-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-neutral-100">Segurança</h3>
            <p className="text-sm text-neutral-400">
              Seus dados são protegidos com criptografia e armazenamento seguro.
            </p>
          </div>

          <div className="rounded-md border border-neutral-800/50 bg-neutral-900/50 p-6 backdrop-blur-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-yellow-500/10">
              <FaRocket className="h-6 w-6 text-yellow-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-neutral-100">Produtividade</h3>
            <p className="text-sm text-neutral-400">
              Interface rápida e intuitiva para você focar no que importa.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="rounded-md border border-neutral-800/50 bg-neutral-900/50 p-8 backdrop-blur-sm md:p-12">
          <h2 className="mb-6 text-3xl font-bold text-neutral-100">Nossa Missão</h2>
          <p className="mb-4 text-neutral-300">
            O Notes App nasceu da necessidade de ter uma ferramenta simples, mas poderosa, para
            capturar e organizar ideias. Acreditamos que todos merecem ter acesso a uma plataforma
            que facilite o processo criativo e a gestão do conhecimento.
          </p>
          <p className="text-neutral-300">
            Nossa missão é proporcionar uma experiência intuitiva e eficiente para que você possa
            focar no que realmente importa: suas ideias e projetos.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <div className="rounded-md border border-neutral-800/50 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 p-12 backdrop-blur-sm">
          <h2 className="mb-4 text-3xl font-bold text-neutral-100">Pronto para começar?</h2>
          <p className="mb-8 text-neutral-300">
            Junte-se a milhares de usuários que já organizam suas ideias com o Notes App.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block rounded-md bg-yellow-500/90 px-8 py-3 font-semibold text-neutral-950 transition-all hover:bg-yellow-500"
          >
            Criar Conta Grátis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800/50 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-neutral-500">
          <p>&copy; {new Date().getFullYear()} Notes App. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
