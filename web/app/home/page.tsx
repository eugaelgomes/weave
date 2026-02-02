import Image from "next/image";
import Link from "next/link";
import { FaBook, FaRocket, FaUsers } from "react-icons/fa";

const IndexPage = () => {
  return (
    /* Container Principal: 
       Light: Fundo Branco / Texto Grafite (neutral-800)
       Dark: Fundo Grafite (neutral-800) / Texto Branco
    */
    <div className="flex h-screen w-full flex-col overflow-hidden bg-white text-neutral-800 transition-colors duration-300 dark:bg-neutral-800 dark:text-white">
      {/* Navbar */}
      <nav className="flex-shrink-0 border-b border-neutral-200 bg-white shadow-sm transition-colors duration-300 dark:border-neutral-700 dark:bg-neutral-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center gap-2 text-base font-semibold text-neutral-900 transition-colors sm:text-lg dark:text-white"
            >
              <Image
                src="/weave.png"
                alt="Weave Notes Logo"
                width={40}
                height={40}
                className="object-contain"
              />
              Weave Notes
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/auth/signin"
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-all duration-200 hover:scale-105 hover:border-neutral-400 hover:bg-neutral-50 sm:px-4 sm:py-2 sm:text-sm dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              Entre
            </Link>
            <span className="text-xs font-light text-neutral-400 select-none sm:text-sm">ou</span>
            <Link
              href="/auth/signup"
              className="rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all duration-200 hover:scale-105 hover:bg-yellow-600 sm:px-4 sm:py-2 sm:text-sm"
            >
              Cadastre-se
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6">
        <div className="flex flex-col items-center justify-center text-center">
          <h1 className="mb-3 max-w-6xl text-3xl font-semibold tracking-tight text-neutral-900 transition-colors sm:text-4xl md:text-5xl dark:text-white">
            Organize suas ideias profissionalmente
          </h1>

          <p className="mb-6 max-w-4xl text-sm text-neutral-600 transition-colors sm:text-base md:text-lg dark:text-neutral-300">
            Plataforma completa para gerenciar notas, projetos e colaboração em equipe.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <Link
              href="/auth/signup"
              className="rounded bg-yellow-500 px-6 py-2 text-xs font-medium text-white transition-colors hover:bg-yellow-600 sm:px-8 sm:py-2.5 sm:text-sm"
            >
              Começar Gratuitamente
            </Link>
            <Link
              href="/about"
              className="rounded border border-neutral-300 px-6 py-2 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-400 hover:bg-neutral-50 sm:px-8 sm:py-2.5 sm:text-sm dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              Saiba Mais
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid max-w-3xl gap-6 sm:mt-16 sm:gap-8 md:grid-cols-3 md:gap-10">
          <FeatureCard
            icon={<FaBook />}
            title="Organização Eficiente"
            description="Sistema intuitivo para estruturar e categorizar suas informações."
          />
          <FeatureCard
            icon={<FaRocket />}
            title="Alto Desempenho"
            description="Acesso rápido e confiável às suas informações quando precisar."
          />
          <FeatureCard
            icon={<FaUsers />}
            title="Trabalho em Equipe"
            description="Ferramentas de colaboração para times produtivos."
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="flex flex-shrink-0 flex-col items-center justify-between gap-2 border-t border-neutral-200 bg-white px-4 py-3 text-xs text-neutral-950 transition-colors duration-300 sm:flex-row sm:gap-0 sm:px-6 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
        <span className="text-[10px] sm:text-xs">
          &copy; {new Date().getFullYear()} Weave Notes.
        </span>
        <div className="flex gap-4 text-[10px] sm:gap-6 sm:text-xs">
          <Link href="/about" className="hover:text-neutral-700 dark:hover:text-white">
            Sobre
          </Link>
          <Link
            href="https://github.com/eugaelgomes"
            target="_blank"
            className="hover:text-neutral-700 dark:hover:text-white"
          >
            GitHub
          </Link>
        </div>
      </footer>
    </div>
  );
};

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Ícone com fundo leve que se adapta ao dark mode */}
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600 transition-colors sm:h-11 sm:w-11 dark:bg-yellow-900/30 dark:text-yellow-500">
        {icon}
      </div>
      <h3 className="mb-1.5 text-xs font-semibold text-neutral-900 transition-colors sm:text-sm dark:text-white">
        {title}
      </h3>
      <p className="text-xs text-neutral-600 transition-colors sm:text-sm dark:text-neutral-300">
        {description}
      </p>
    </div>
  );
}

export default IndexPage;
