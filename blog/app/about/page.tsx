import type { Metadata } from "next";
import Link from "next/link";
import { FaArrowRight } from "react-icons/fa";
import { HiSparkles } from "react-icons/hi2";
import {
  FiEdit3,
  FiUsers,
  FiFolder,
  FiMessageSquare,
  FiBriefcase,
  FiTag,
  FiDownload,
  FiShield,
  FiZap,
  FiLayers,
} from "react-icons/fi";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BackgroundPattern from "../components/BackgroundPattern";
import { APP_URL } from "../config/urls";

export const metadata: Metadata = {
  title: "Sobre",
  description: "Conheça o Weave Notes — o espaço digital para suas ideias.",
};

export default function AboutPage() {
  const features = [
    {
      icon: <FiEdit3 className="h-5 w-5" />,
      title: "Notas Inteligentes",
      description:
        "Editor rico com markdown, formatação avançada e salvamento automático.",
      color: "text-yellow-500",
      bg: "bg-yellow-100 dark:bg-yellow-500/10",
    },
    {
      icon: <FiFolder className="h-5 w-5" />,
      title: "Projetos",
      description:
        "Organize notas em projetos com membros e permissões granulares.",
      color: "text-blue-500",
      bg: "bg-blue-100 dark:bg-blue-500/10",
    },
    {
      icon: <FiUsers className="h-5 w-5" />,
      title: "Colaboração",
      description:
        "Convide colaboradores para editar notas juntos em tempo real.",
      color: "text-green-500",
      bg: "bg-green-100 dark:bg-green-500/10",
    },
    {
      icon: <FiMessageSquare className="h-5 w-5" />,
      title: "Chat com IA",
      description:
        "Converse com a IA integrada para resumir, expandir e gerar conteúdo.",
      color: "text-purple-500",
      bg: "bg-purple-100 dark:bg-purple-500/10",
    },
    {
      icon: <FiBriefcase className="h-5 w-5" />,
      title: "Workspaces",
      description:
        "Crie organizações e gerencie equipes com espaços de trabalho dedicados.",
      color: "text-red-500",
      bg: "bg-red-100 dark:bg-red-500/10",
    },
    {
      icon: <FiTag className="h-5 w-5" />,
      title: "Tags & Filtros",
      description:
        "Categorize e encontre qualquer nota instantaneamente com tags.",
      color: "text-orange-500",
      bg: "bg-orange-100 dark:bg-orange-500/10",
    },
    {
      icon: <FiDownload className="h-5 w-5" />,
      title: "Backup & Exportação",
      description:
        "Exporte suas notas e faça backup dos seus dados com segurança.",
      color: "text-cyan-500",
      bg: "bg-cyan-100 dark:bg-cyan-500/10",
    },
    {
      icon: <FiShield className="h-5 w-5" />,
      title: "Privacidade",
      description:
        "Seus dados são seus. Autenticação segura com JWT e cookies HttpOnly.",
      color: "text-emerald-500",
      bg: "bg-emerald-100 dark:bg-emerald-500/10",
    },
  ];

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-neutral-50 text-neutral-900 selection:bg-yellow-500/20 selection:text-yellow-900 dark:bg-neutral-950 dark:text-neutral-50 dark:selection:bg-yellow-500/30 dark:selection:text-yellow-200">
      <BackgroundPattern />

      <Navbar ctaLabel="Criar conta" ctaHref="/auth/signup" />

      {/* Hero Section */}
      <section className="relative z-10 px-4 py-16 text-center sm:py-20 md:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="group mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-300/50 bg-gradient-to-r from-yellow-50/80 to-orange-50/80 px-4 py-1.5 text-xs font-semibold text-yellow-800 shadow-sm backdrop-blur-sm dark:border-yellow-500/30 dark:from-yellow-500/10 dark:to-orange-500/10 dark:text-yellow-300">
            <HiSparkles className="h-3.5 w-3.5" />
            <span>Conheça o Weave Notes</span>
          </div>

          <h1 className="mb-6 bg-gradient-to-b from-neutral-900 via-neutral-800 to-neutral-600 bg-clip-text text-4xl leading-tight font-extrabold tracking-tight text-transparent sm:text-5xl md:text-6xl dark:from-white dark:via-neutral-100 dark:to-neutral-400">
            O espaço digital para{" "}
            <span className="bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
              suas ideias
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-lg dark:text-neutral-400">
            Weave Notes nasceu de uma frustração: ferramentas de anotação
            tornaram-se lentas e complexas demais. Criamos algo simples, rápido
            e inteligente — a ferramenta que nós mesmos queríamos usar todos os
            dias.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href={`${APP_URL}/auth/signup`}
              className="group relative flex h-11 items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-6 font-bold text-white shadow-lg shadow-yellow-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-yellow-500/40"
            >
              <span className="relative z-10">Começar agora</span>
              <FaArrowRight className="relative z-10 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-orange-600 opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
              Tudo que você precisa
            </h2>
            <p className="mx-auto max-w-lg text-sm text-neutral-500 sm:text-base dark:text-neutral-400">
              Ferramentas poderosas para capturar, organizar e compartilhar
              conhecimento.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group flex flex-col rounded-xl border border-neutral-200/60 bg-white/40 p-5 backdrop-blur-md transition-all hover:-translate-y-1 hover:bg-white/60 hover:shadow-lg dark:border-neutral-800/60 dark:bg-neutral-900/40 dark:hover:bg-neutral-900/60"
              >
                <div
                  className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${feature.bg} ${feature.color}`}
                >
                  {feature.icon}
                </div>
                <h3 className="mb-1.5 text-sm font-bold text-neutral-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="relative z-10 border-y border-neutral-200/60 bg-white/30 backdrop-blur-sm dark:border-neutral-800/60 dark:bg-neutral-900/20">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:py-20 md:flex-row md:gap-16">
          <div className="md:w-1/3">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
              Nossa Missão
            </h2>
            <div className="mt-4 h-1 w-12 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500"></div>
          </div>
          <div className="space-y-5 text-base leading-relaxed text-neutral-600 md:w-2/3 dark:text-neutral-400">
            <p>
              Acreditamos que a ferramenta deve{" "}
              <span className="font-semibold text-neutral-900 dark:text-white">
                desaparecer
              </span>{" "}
              para que o pensamento flua. Nossa missão é remover o atrito entre
              o momento que você tem uma ideia e o momento que ela é capturada.
            </p>
            <p>
              Combinamos a{" "}
              <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                inteligência artificial
              </span>{" "}
              com uma interface limpa para que você escreva, organize e colabore
              — sem distrações.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-1.5 rounded-full border border-neutral-200/60 bg-neutral-100/50 px-3 py-1 text-xs text-neutral-600 dark:border-neutral-700/60 dark:bg-neutral-800/50 dark:text-neutral-400">
                <FiZap className="h-3 w-3 text-yellow-500" />
                Rápido
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-neutral-200/60 bg-neutral-100/50 px-3 py-1 text-xs text-neutral-600 dark:border-neutral-700/60 dark:bg-neutral-800/50 dark:text-neutral-400">
                <FiLayers className="h-3 w-3 text-blue-500" />
                Organizado
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-neutral-200/60 bg-neutral-100/50 px-3 py-1 text-xs text-neutral-600 dark:border-neutral-700/60 dark:bg-neutral-800/50 dark:text-neutral-400">
                <FiShield className="h-3 w-3 text-green-500" />
                Seguro
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-neutral-200/60 bg-neutral-100/50 px-3 py-1 text-xs text-neutral-600 dark:border-neutral-700/60 dark:bg-neutral-800/50 dark:text-neutral-400">
                <HiSparkles className="h-3 w-3 text-purple-500" />
                Inteligente
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-4 py-16 text-center sm:py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
            Pronto para organizar suas ideias?
          </h2>
          <p className="mb-8 text-sm text-neutral-500 sm:text-base dark:text-neutral-400">
            Comece grátis e descubra uma nova forma de trabalhar com notas.
          </p>
          <a
            href={`${APP_URL}/auth/signup`}
            className="group relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-8 font-bold text-white shadow-lg shadow-yellow-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-yellow-500/40"
          >
            <span className="relative z-10">Criar Conta Grátis</span>
            <FaArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-orange-600 opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
