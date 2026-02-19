import Image from "next/image";
import Link from "next/link";
import { FaArrowRight, FaGithub, FaLinkedin, FaBolt, FaLock } from "react-icons/fa";
import { HiSparkles, HiRectangleGroup } from "react-icons/hi2";
import { FiEdit3, FiUsers, FiFolder, FiMessageSquare, FiBriefcase } from "react-icons/fi";

export default function HomePage() {
  const features = [
    {
      icon: <HiSparkles className="h-5 w-5 text-yellow-600 lg:h-6 lg:w-6 dark:text-yellow-400" />,
      title: "IA Integrada",
      desc: "Autocomplete e resumo inteligente.",
      color: "bg-yellow-100 dark:bg-yellow-500/10",
      borderColor: "group-hover:border-yellow-500/50",
    },
    {
      icon: <HiRectangleGroup className="h-5 w-5 text-blue-600 lg:h-6 lg:w-6 dark:text-blue-400" />,
      title: "Workspaces",
      desc: "Organize projetos com blocos arrastáveis.",
      color: "bg-blue-100 dark:bg-blue-500/10",
      borderColor: "group-hover:border-blue-500/50",
    },
    {
      icon: <FaBolt className="h-5 w-5 text-green-600 lg:h-6 lg:w-6 dark:text-green-400" />,
      title: "Real-time",
      desc: "Sincronização instantânea entre devices.",
      color: "bg-green-100 dark:bg-green-500/10",
      borderColor: "group-hover:border-green-500/50",
    },
    {
      icon: <FaLock className="h-5 w-5 text-red-600 lg:h-6 lg:w-6 dark:text-red-400" />,
      title: "Segurança",
      desc: "Criptografia ponta a ponta.",
      color: "bg-red-100 dark:bg-red-500/10",
      borderColor: "group-hover:border-red-500/50",
    },
  ];

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-between bg-neutral-50 text-neutral-900 selection:bg-yellow-500/20 selection:text-yellow-900 dark:bg-neutral-950 dark:text-neutral-50 dark:selection:bg-yellow-500/30 dark:selection:text-yellow-200">
      {/* Background Pattern */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)]"></div>

      {/* Navbar */}
      <div className="z-50 w-full px-6 py-4 lg:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <Image
              src="/weave.png"
              alt="Weave Logo"
              width={28}
              height={28}
              className="h-7 w-7 rounded-sm object-cover lg:h-8 lg:w-8"
            />
            <span className="text-base font-semibold tracking-tight lg:text-lg">Weave Notes</span>
          </Link>

          <div className="flex items-center gap-4 lg:gap-6">
            <Link
              href="/auth/signin"
              className="text-xs font-medium text-neutral-600 transition-colors hover:text-neutral-900 sm:text-sm lg:text-base dark:text-neutral-400 dark:hover:text-white"
            >
              Entrar
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-neutral-800 sm:text-sm lg:px-5 lg:py-2 lg:text-base dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center gap-8 px-4 py-8 text-center sm:px-6 md:flex-row md:gap-12 md:py-12 md:text-left lg:gap-20 lg:px-8 lg:py-16 xl:gap-28">
        {/* Hero Section */}
        <div className="flex w-full flex-col items-center md:max-w-xl md:items-start lg:max-w-2xl">
          {/* Badge */}
          <div className="group mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-300/50 bg-gradient-to-r from-yellow-50/80 to-orange-50/80 px-4 py-1.5 text-xs font-semibold text-yellow-800 shadow-sm backdrop-blur-sm transition-all hover:shadow-md lg:mb-5 lg:px-5 lg:py-2 lg:text-sm dark:border-yellow-500/30 dark:from-yellow-500/10 dark:to-orange-500/10 dark:text-yellow-300">
            <HiSparkles className="h-3.5 w-3.5 transition-transform group-hover:rotate-12 lg:h-4 lg:w-4" />
            <span>Potencializado por IA</span>
          </div>

          {/* Título */}
          <h1 className="mb-4 bg-gradient-to-b from-neutral-900 via-neutral-800 to-neutral-600 bg-clip-text text-xl leading-tight font-extrabold tracking-tight text-transparent sm:text-2xl lg:mb-5 lg:text-3xl xl:text-4xl dark:from-white dark:via-neutral-100 dark:to-neutral-400">
            Suas melhores ideias,
            <br className="hidden sm:block" />
            organizadas e vivas
          </h1>

          {/* Pilares do App - Ícones inline */}
          <div className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:justify-start lg:mb-5 lg:gap-x-5">
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 sm:text-sm lg:text-base dark:text-neutral-400">
              <FiEdit3 className="h-3.5 w-3.5 text-yellow-500 lg:h-4 lg:w-4" />
              <span>Notas inteligentes</span>
            </div>
            <div className="hidden h-4 w-px bg-neutral-300 sm:block dark:bg-neutral-700" />
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 sm:text-sm lg:text-base dark:text-neutral-400">
              <FiFolder className="h-3.5 w-3.5 text-blue-500 lg:h-4 lg:w-4" />
              <span>Projetos</span>
            </div>
            <div className="hidden h-4 w-px bg-neutral-300 sm:block dark:bg-neutral-700" />
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 sm:text-sm lg:text-base dark:text-neutral-400">
              <FiUsers className="h-3.5 w-3.5 text-green-500 lg:h-4 lg:w-4" />
              <span>Colaboração</span>
            </div>
            <div className="hidden h-4 w-px bg-neutral-300 sm:block dark:bg-neutral-700" />
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 sm:text-sm lg:text-base dark:text-neutral-400">
              <FiBriefcase className="h-3.5 w-3.5 text-red-500 lg:h-4 lg:w-4" />
              <span>Workspace</span>
            </div>
            <div className="hidden h-4 w-px bg-neutral-300 sm:block dark:bg-neutral-700" />
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 sm:text-sm lg:text-base dark:text-neutral-400">
              <FiMessageSquare className="h-3.5 w-3.5 text-purple-500 lg:h-4 lg:w-4" />
              <span>Chat IA</span>
            </div>
          </div>

          {/* Descrição */}
          <p className="mb-5 max-w-xl text-sm leading-relaxed text-neutral-600 sm:text-base lg:mb-7 lg:text-lg dark:text-neutral-400">
            Tudo que você precisa para capturar, organizar e compartilhar — com inteligência
            artificial integrada ao seu fluxo.
          </p>

          {/* CTA */}
          <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row md:justify-start">
            <Link
              href="/auth/signup"
              className="group relative flex h-11 w-full max-w-[200px] items-center justify-center gap-2 overflow-hidden rounded-md bg-gradient-to-r from-yellow-500 to-orange-500 px-6 font-bold text-white shadow-lg shadow-yellow-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-yellow-500/40 lg:h-12 lg:max-w-[240px] lg:text-lg"
            >
              <span className="relative z-10">Começar agora</span>
              <FaArrowRight className="relative z-10 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-orange-600 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid w-full max-w-sm grid-cols-2 gap-3 md:max-w-md lg:max-w-lg lg:gap-4 xl:max-w-xl">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={`group relative flex flex-col items-start rounded-md border border-neutral-200/60 bg-white/40 p-3 text-left shadow-sm backdrop-blur-md transition-all hover:-translate-y-1 hover:bg-white/60 hover:shadow-md lg:rounded-md lg:p-5 dark:border-neutral-800/60 dark:bg-neutral-900/40 dark:hover:bg-neutral-900/60 ${feature.borderColor}`}
            >
              <div
                className={`mb-2 rounded-md p-1.5 lg:mb-3 lg:rounded-md lg:p-2.5 ${feature.color}`}
              >
                {feature.icon}
              </div>
              <h3 className="text-xs font-bold text-neutral-900 sm:text-sm lg:text-base dark:text-white">
                {feature.title}
              </h3>
              <p className="mt-0.5 text-[10px] text-neutral-500 sm:text-xs lg:mt-1 lg:text-sm dark:text-neutral-400">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Minimalista */}
      <div className="z-10 w-full px-6 py-4 lg:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-[10px] text-neutral-400 sm:text-xs lg:text-sm">
          <p>© {new Date().getFullYear()} Weave Notes</p>

          <div className="flex items-center gap-4 lg:gap-6">
            <a
              href="https://github.com/eugaelgomes"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition-colors hover:text-purple-700 dark:hover:text-purple-300"
            >
              Github
              <FaGithub className="h-4 w-4 text-purple-500" />
            </a>
            <a
              href="https://linkedin.com/in/gael-rene-gomes"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition-colors hover:text-neutral-900 dark:hover:text-blue-300"
            >
              Linkedin
              <FaLinkedin className="h-4 w-4 text-blue-500" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
