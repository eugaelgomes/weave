import Image from "next/image";
import Link from "next/link";
import { FaBook, FaRocket, FaUsers } from "react-icons/fa";

export default function HomePage() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-white text-neutral-800">
      {/* Navbar */}
      <nav className="flex-shrink-0 border-b-2 border-neutral-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center gap-2 text-base font-semibold text-neutral-900 sm:text-lg"
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
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-all duration-200 hover:scale-105 hover:border-neutral-400 hover:bg-neutral-50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 sm:px-4 sm:py-2 sm:text-sm"
            >
              Entre
            </Link>
            <span className="select-none text-xs font-light text-neutral-400 sm:text-sm">ou</span>
            <Link
              href="/auth/signup"
              className="rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all duration-200 hover:scale-105 hover:bg-yellow-600 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 sm:px-4 sm:py-2 sm:text-sm"
            >
              Cadastre-se
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6">
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center text-center">
          <h1 className="mb-3 max-w-2xl text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl md:text-5xl">
            Organize suas ideias profissionalmente
          </h1>

          <p className="mb-6 max-w-lg text-sm text-neutral-600 sm:text-base md:text-lg">
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
              className="rounded border border-neutral-300 px-6 py-2 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-400 hover:bg-neutral-50 sm:px-8 sm:py-2.5 sm:text-sm"
            >
              Saiba Mais
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid max-w-3xl gap-6 sm:mt-16 sm:gap-8 md:grid-cols-3 md:gap-10">
          <div className="flex flex-col items-center text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 sm:h-11 sm:w-11">
              <FaBook size={16} className="text-yellow-600 sm:h-[18px] sm:w-[18px]" />
            </div>
            <h3 className="mb-1.5 text-xs font-semibold text-neutral-900 sm:text-sm">
              Organização Eficiente
            </h3>
            <p className="text-xs text-neutral-600 sm:text-sm">
              Sistema intuitivo para estruturar e categorizar suas informações.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 sm:h-11 sm:w-11">
              <FaRocket size={16} className="text-yellow-600 sm:h-[18px] sm:w-[18px]" />
            </div>
            <h3 className="mb-1.5 text-xs font-semibold text-neutral-900 sm:text-sm">
              Alto Desempenho
            </h3>
            <p className="text-xs text-neutral-600 sm:text-sm">
              Acesso rápido e confiável às suas informações quando precisar.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 sm:h-11 sm:w-11">
              <FaUsers size={16} className="text-yellow-600 sm:h-[18px] sm:w-[18px]" />
            </div>
            <h3 className="mb-1.5 text-xs font-semibold text-neutral-900 sm:text-sm">
              Trabalho em Equipe
            </h3>
            <p className="text-xs text-neutral-600 sm:text-sm">
              Ferramentas de colaboração para times produtivos.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shadow-t flex flex-shrink-0 flex-col items-center justify-between gap-2 border-t border-neutral-200 bg-white px-4 py-3 text-xs text-neutral-950 shadow-md sm:flex-row sm:gap-0 sm:px-6">
        <span className="text-[10px] sm:text-xs">
          &copy; {new Date().getFullYear()} Weave Notes. Todos os direitos reservados.
        </span>
        <div className="flex gap-4 text-[10px] sm:gap-6 sm:text-xs">
          <Link href="/about" className="hover:text-neutral-700">
            Sobre
          </Link>
          <Link
            href="https://github.com/eugaelgomes"
            target="_blank"
            className="hover:text-neutral-700"
          >
            GitHub
          </Link>
        </div>
      </div>
    </div>
  );
}
