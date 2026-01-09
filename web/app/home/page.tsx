import Link from "next/link";
import { FaBook, FaRocket, FaUsers } from "react-icons/fa";

export default function HomePage() {
  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-200">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      {/* Navbar */}
      <nav className="relative z-20 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-neutral-100">
            Weave <span className="text-yellow-500">Notes</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/signin"
              className="rounded px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:text-neutral-100"
            >
              Entrar
            </Link>
            <Link
              href="/auth/signup"
              className="rounded bg-yellow-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-yellow-400"
            >
              Cadastrar
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-6">
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center py-24 text-center md:py-32">
          <h1 className="mb-6 max-w-3xl text-5xl font-bold tracking-tight text-neutral-100 md:text-6xl">
            Organize suas ideias em um só lugar
          </h1>

          <p className="mb-10 max-w-xl text-lg text-neutral-400">
            Crie, organize e compartilhe suas anotações de forma simples e eficiente.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/signup"
              className="rounded bg-yellow-500 px-8 py-3 text-sm font-semibold text-neutral-950 transition-all hover:bg-yellow-400 active:scale-95"
            >
              Começar Agora
            </Link>
            <Link
              href="/about"
              className="rounded border border-neutral-800 px-8 py-3 text-sm font-medium text-neutral-300 transition-all hover:border-neutral-700 hover:text-neutral-100"
            >
              Saiba Mais
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid gap-8 py-16 md:grid-cols-3">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-900 text-yellow-500">
                <FaBook size={20} />
              </div>
            </div>
            <h3 className="mb-2 font-semibold text-neutral-200">Simples e Prático</h3>
            <p className="text-sm text-neutral-500">
              Interface intuitiva para criar e organizar suas notas rapidamente.
            </p>
          </div>

          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-900 text-yellow-500">
                <FaRocket size={20} />
              </div>
            </div>
            <h3 className="mb-2 font-semibold text-neutral-200">Rápido e Eficiente</h3>
            <p className="text-sm text-neutral-500">
              Acesse suas notas instantaneamente, de qualquer lugar.
            </p>
          </div>

          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-900 text-yellow-500">
                <FaUsers size={20} />
              </div>
            </div>
            <h3 className="mb-2 font-semibold text-neutral-200">Colaboração</h3>
            <p className="text-sm text-neutral-500">
              Compartilhe e colabore com seu time em tempo real.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-neutral-800 py-8 text-xs text-neutral-500 md:flex-row">
          <span>&copy; {new Date().getFullYear()} Weave Notes</span>
          <div className="flex gap-6">
            <Link href="/about" className="hover:text-neutral-300">
              Sobre
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
