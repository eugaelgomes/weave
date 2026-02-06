import Image from "next/image";
import Link from "next/link";
import { FaBook, FaUsers, FaLock, FaRocket } from "react-icons/fa";

const AboutPage = () => {
  return (
    /* Container Principal com tema light/dark igual à home */
    <div className="flex h-screen w-full flex-col overflow-hidden bg-neutral-50 text-neutral-800 transition-colors duration-300 dark:bg-neutral-800 dark:text-white">
      {/* Navbar */}
      <nav className="flex-shrink-0 border-b border-neutral-200 bg-neutral-50 shadow-sm transition-colors duration-300 dark:border-neutral-700 dark:bg-neutral-800">
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

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero Section */}
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20 md:py-24">
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-neutral-900 transition-colors sm:text-4xl md:text-5xl dark:text-white">
            Sobre o <span className="text-yellow-500">Weave Notes</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-neutral-600 transition-colors sm:text-lg dark:text-neutral-300">
            Construindo o sistema operacional para suas ideias. <br className="hidden md:block" />
            Simplicidade radical para quem precisa de foco.
          </p>
        </div>

        {/* Values / Features Grid */}
        <div className="mx-auto max-w-6xl border-t border-neutral-200 px-4 py-16 sm:px-6 sm:py-20 dark:border-neutral-700">
          <div className="mb-10">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 transition-colors dark:text-white">
              Nossos Pilares
            </h2>
          </div>

          <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<FaBook />}
              title="Organização"
              description="Hierarquia flexível. Pastas, tags ou links bidirecionais. Você decide como estruturar seu conhecimento."
            />
            <FeatureCard
              icon={<FaUsers />}
              title="Colaboração"
              description="Multiplayer nativo. Edite documentos simultaneamente com latência zero, como se estivessem na mesma sala."
            />
            <FeatureCard
              icon={<FaLock />}
              title="Privacidade"
              description="Seus dados são seus. Criptografia em repouso e políticas transparentes de uso de dados."
            />
            <FeatureCard
              icon={<FaRocket />}
              title="Performance"
              description="Otimizado para velocidade. Atalhos de teclado para tudo. Navegue sem nunca tocar no mouse."
            />
          </div>
        </div>

        {/* Mission Section */}
        <div className="border-y border-neutral-200 bg-neutral-50 transition-colors dark:border-neutral-700 dark:bg-neutral-900/20">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 sm:py-20 md:flex-row md:gap-12">
            <div className="md:w-1/3">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900 transition-colors sm:text-3xl dark:text-white">
                Nossa Missão
              </h2>
              <div className="mt-4 h-1 w-12 bg-yellow-500"></div>
            </div>

            <div className="space-y-5 text-base leading-relaxed text-neutral-600 transition-colors sm:text-lg md:w-2/3 dark:text-neutral-300">
              <p>
                O{" "}
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  Weave Notes
                </span>{" "}
                nasceu de uma frustração comum: ferramentas de anotação tornaram-se lentas, inchadas
                e complexas demais.
              </p>
              <p>
                Acreditamos que a ferramenta deve desaparecer para que o pensamento flua. Nossa
                missão é remover o atrito entre o momento que você tem uma ideia e o momento que ela
                é capturada.
              </p>
              <p>
                Estamos construindo o espaço digital que nós mesmos queríamos usar todos os dias.
                Simples, rápido e confiável.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-neutral-900 transition-colors dark:text-white">
            Comece a escrever melhor.
          </h2>
          <Link
            href="/auth/signup"
            className="inline-block rounded bg-yellow-500 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-105 hover:bg-yellow-600 sm:px-8 sm:py-3"
          >
            Criar Conta Grátis
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex flex-shrink-0 flex-col items-center justify-between gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-950 transition-colors duration-300 sm:flex-row sm:gap-0 sm:px-6 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
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
    <div className="flex flex-col">
      {/* Ícone com fundo leve que se adapta ao dark mode */}
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600 transition-colors sm:h-11 sm:w-11 dark:bg-yellow-900/30 dark:text-yellow-500">
        {icon}
      </div>
      <h3 className="mb-2 text-sm font-semibold text-neutral-900 transition-colors sm:text-base dark:text-white">
        {title}
      </h3>
      <p className="text-xs leading-relaxed text-neutral-600 transition-colors sm:text-sm dark:text-neutral-300">
        {description}
      </p>
    </div>
  );
}

export default AboutPage;
