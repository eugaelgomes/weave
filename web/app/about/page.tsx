import Link from "next/link";
import { FaBook, FaUsers, FaLock, FaRocket, FaArrowRight } from "react-icons/fa";

const AboutPage = () => {
  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-200 selection:bg-yellow-500/20 selection:text-yellow-500">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <div className="relative z-10">
        {/* Navigation "Fake" (Divs only) */}
        <div className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
            <Link href="/" className="group flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-yellow-500 text-neutral-950 transition-transform group-hover:rotate-3">
                <FaBook size={14} />
              </div>
              <span className="font-bold tracking-tight text-neutral-100">Weave Notes</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/auth/signin"
                className="text-sm font-medium text-neutral-400 transition-colors hover:text-neutral-100"
              >
                Entrar
              </Link>
              <Link
                href="/auth/signup"
                className="rounded bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-300"
              >
                Criar Conta
              </Link>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="mx-auto max-w-6xl px-6 py-24 text-center md:py-32">
          <h1 className="mb-6 text-4xl font-bold tracking-tighter text-neutral-100 md:text-6xl">
            Sobre o <span className="text-yellow-500">Weave Notes</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-neutral-500">
            Construindo o sistema operacional para suas ideias. <br className="hidden md:block" />
            Simplicidade radical para quem precisa de foco.
          </p>
        </div>

        {/* Values / Features Grid */}
        <div className="mx-auto max-w-6xl border-t border-neutral-800 px-6 py-24">
          <div className="mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-100">Nossos Pilares</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Card 1 */}
            <div className="group rounded border border-neutral-800 bg-neutral-900/20 p-6 transition-colors hover:border-neutral-700">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded bg-neutral-800 text-neutral-400 group-hover:text-yellow-500">
                <FaBook size={14} />
              </div>
              <h3 className="mb-2 font-semibold text-neutral-200">Organização</h3>
              <p className="text-sm leading-relaxed text-neutral-500">
                Hierarquia flexível. Pastas, tags ou links bidirecionais. Você decide como
                estruturar seu conhecimento.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group rounded border border-neutral-800 bg-neutral-900/20 p-6 transition-colors hover:border-neutral-700">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded bg-neutral-800 text-neutral-400 group-hover:text-yellow-500">
                <FaUsers size={14} />
              </div>
              <h3 className="mb-2 font-semibold text-neutral-200">Colaboração</h3>
              <p className="text-sm leading-relaxed text-neutral-500">
                Multiplayer nativo. Edite documentos simultaneamente com latência zero, como se
                estivessem na mesma sala.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group rounded border border-neutral-800 bg-neutral-900/20 p-6 transition-colors hover:border-neutral-700">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded bg-neutral-800 text-neutral-400 group-hover:text-yellow-500">
                <FaLock size={14} />
              </div>
              <h3 className="mb-2 font-semibold text-neutral-200">Privacidade</h3>
              <p className="text-sm leading-relaxed text-neutral-500">
                Seus dados são seus. Criptografia em repouso e políticas transparentes de uso de
                dados.
              </p>
            </div>

            {/* Card 4 */}
            <div className="group rounded border border-neutral-800 bg-neutral-900/20 p-6 transition-colors hover:border-neutral-700">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded bg-neutral-800 text-neutral-400 group-hover:text-yellow-500">
                <FaRocket size={14} />
              </div>
              <h3 className="mb-2 font-semibold text-neutral-200">Performance</h3>
              <p className="text-sm leading-relaxed text-neutral-500">
                Otimizado para velocidade. Atalhos de teclado para tudo. Navegue sem nunca tocar no
                mouse.
              </p>
            </div>
          </div>
        </div>

        {/* Mission Section - Editorial Layout */}
        <div className="border-y border-neutral-800 bg-neutral-900/10">
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-24 md:flex-row">
            <div className="md:w-1/3">
              <h2 className="text-3xl font-bold tracking-tight text-neutral-100">Nossa Missão</h2>
              <div className="mt-4 h-1 w-12 bg-yellow-500"></div>
            </div>

            <div className="space-y-6 text-lg leading-relaxed text-neutral-400 md:w-2/3">
              <p>
                O <span className="font-medium text-neutral-200">Weave Notes</span> nasceu de uma
                frustração comum: ferramentas de anotação tornaram-se lentas, inchadas e complexas
                demais.
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

        {/* CTA Simple */}
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-neutral-100">
            Comece a escrever melhor.
          </h2>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 rounded bg-yellow-500 px-6 py-3 text-sm font-semibold text-neutral-950 transition-transform hover:scale-105"
          >
            Criar Conta Grátis
            <FaArrowRight size={12} />
          </Link>
        </div>

        {/* Footer Minimal */}
        <div className="border-t border-neutral-800 bg-neutral-950 py-12 text-center text-xs text-neutral-600">
          <p>&copy; {new Date().getFullYear()} Weave Notes. Design System v2.</p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
