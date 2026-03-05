"use client";

import Link from "next/link";
import {
  FaArrowRight,
  FaLock,
  FaRobot,
  FaUsers,
  FaTasks,
  FaBuilding,
  FaSearch,
  FaFileExport,
} from "react-icons/fa";
import { HiDocumentText, HiFolder } from "react-icons/hi2";
import { FiPlay } from "react-icons/fi";
// lower case file name
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { APP_URL } from "./config/urls";

const BackgroundSinuous = () => (
  <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden bg-white dark:bg-neutral-950">
    <svg
      className="absolute left-0 top-0 h-full w-full text-yellow-500 opacity-20 dark:opacity-[0.08]"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1440 800"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
    >
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        {/* Linhas circulares (Topografia / Ondas concêntricas à direita) */}
        <circle cx="1250" cy="150" r="150" strokeDasharray="4 8" />
        <circle cx="1250" cy="150" r="220" />
        <circle cx="1250" cy="150" r="290" />
        <circle cx="1250" cy="150" r="360" />
        
        {/* Linhas sinuosas primárias atravessando a tela (Fluidez) */}
        <path d="M-100,500 C200,300 400,700 800,400 C1100,175 1300,500 1550,300" />
        <path d="M-100,540 C200,340 400,740 800,440 C1100,215 1300,540 1550,340" />
        <path d="M-100,580 C200,380 400,780 800,480 C1100,255 1300,580 1550,380" />
        <path d="M-100,620 C200,420 400,820 800,520 C1100,295 1300,620 1550,420" />
        
        {/* Elementos sinuosos mais curtos no topo esquerdo */}
        <path d="M-50,-50 C150,150 350,-100 650,100" />
        <path d="M-50,0 C150,200 350,-50 650,150" />
        <path d="M-50,50 C150,250 350,0 650,200" />
        
        {/* Círculos orgânicos na parte inferior esquerda */}
        <circle cx="50" cy="900" r="300" />
        <circle cx="50" cy="900" r="350" />
        <circle cx="50" cy="900" r="400" />
      </g>
    </svg>

    {/* Glow amarelo para iluminar áreas do SVG sutilmente, gerando profundidade */}
    <div className="absolute left-1/4 top-1/4 -z-10 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400 opacity-20 blur-[120px] dark:bg-yellow-500/10" />
    <div className="absolute right-1/4 bottom-1/4 -z-10 h-[300px] w-[300px] rounded-full bg-yellow-500 opacity-15 blur-[100px] dark:bg-yellow-600/10" />
  </div>
);

export default function HomePage() {
  const features = [
    {
      icon: (
        <FaRobot className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
      ),
      title: "Weave AI",
      desc: "Chat, resumos e edição inteligente.",
      color:
        "bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800/50",
    },
    {
      icon: (
        <HiDocumentText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
      ),
      title: "Notas em Blocos",
      desc: "Hierarquia flexível e exportação PDF.",
      color:
        "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50",
    },
    {
      icon: (
        <HiFolder className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
      ),
      title: "Projetos",
      desc: "Gerencie tarefas e acompanhe progresso.",
      color:
        "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50",
    },
    {
      icon: (
        <FaBuilding className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      ),
      title: "Organizações",
      desc: "Times, roles e branding próprio.",
      color:
        "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50",
    },
    {
      icon: (
        <FaUsers className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
      ),
      title: "Colaboração",
      desc: "Convites, permissões e edição conjunta.",
      color:
        "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/50",
    },
    {
      icon: (
        <FaSearch className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
      ),
      title: "Busca Web",
      desc: "IA pesquisa e traz contexto para você.",
      color:
        "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-100 dark:border-cyan-800/50",
    },
    {
      icon: (
        <FaFileExport className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
      ),
      title: "Backup & Export",
      desc: "Exportação de dados e backups.",
      color:
        "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800/50",
    },
    {
      icon: <FaLock className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />,
      title: "Segurança",
      desc: "Autenticação JWT e controle de acesso.",
      color:
        "bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/50",
    },
  ];

  const cloudSizes = [
    "text-lg",
    "text-base",
    "text-xl",
    "text-sm",
    "text-lg",
    "text-base",
    "text-xl",
    "text-sm",
  ];

  const cloudAnimations = [
    "cloud-float-a",
    "cloud-float-b",
    "cloud-float-c",
    "cloud-float-d",
    "cloud-float-b",
    "cloud-float-c",
    "cloud-float-a",
    "cloud-float-d",
  ];

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-between overflow-hidden font-sans text-neutral-900 selection:bg-yellow-500/30 selection:text-yellow-900 dark:text-neutral-50 dark:selection:bg-yellow-500/40 dark:selection:text-yellow-100">
      <BackgroundSinuous />

      <Navbar />

      <main className="z-10 flex w-full flex-1 items-center justify-center py-8">
        <section className="w-full px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center lg:gap-12">
            {/* Esquerda: Hero */}
            <div className="flex flex-col items-start text-left">
              <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl md:text-5xl lg:text-[3rem] lg:leading-[1.1] dark:text-white">
                Seus projetos e ideias,
                <br className="hidden sm:block" />
                <span className="text-yellow-500 dark:text-yellow-400">
                  {" "}
                  conectados.
                </span>
              </h1>

              <p className="mb-4 text-lg font-semibold text-neutral-700 dark:text-neutral-300 max-w-lg">
                O workspace inteligente para quem pensa grande.
              </p>

              <p className="mb-6 text-base font-medium text-neutral-600 dark:text-neutral-400 max-w-lg leading-relaxed">
                Gerencie{" "}
                <span className="text-neutral-900 dark:text-white font-semibold">
                  projetos
                </span>
                ,{" "}
                <span className="text-neutral-900 dark:text-white font-semibold">
                  notas
                </span>{" "}
                e{" "}
                <span className="text-neutral-900 dark:text-white font-semibold">
                  tarefas
                </span>{" "}
                em um só lugar. Para você ou para seu time — com{" "}
                <span className="text-yellow-600 dark:text-yellow-400 font-semibold">
                  IA integrada
                </span>{" "}
                que acelera seu trabalho.
              </p>

              {/* Keywords/Tags */}
              <div className="flex flex-wrap gap-1.5 mb-6">
                {[
                  "Produtividade",
                  "Colaboração",
                  "IA Generativa",
                  "Organização",
                  "Times",
                ].map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Link
                  href={`${APP_URL}/auth/signup`}
                  className="group flex h-11 items-center justify-center gap-2 rounded-md bg-yellow-500 px-7 text-sm font-bold text-white transition-all hover:bg-yellow-600 hover:shadow-lg dark:bg-yellow-400 dark:text-neutral-900 dark:hover:bg-yellow-500"
                >
                  <FaTasks className="h-3.5 w-3.5 opacity-70" />
                  Criar sua conta
                  <FaArrowRight className="h-3 w-3 opacity-70 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/about"
                  className="flex h-11 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white/40 backdrop-blur-md px-6 text-sm font-bold text-neutral-700 transition-all hover:bg-white hover:shadow-sm dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <FiPlay className="h-3.5 w-3.5" />
                  Ver como funciona
                </Link>
              </div>

              {/* Social proof */}
              <p className="mt-5 text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Ideal para{" "}
                <span className="text-neutral-700 dark:text-neutral-300">
                  pessoas criativas
                </span>{" "}
                e{" "}
                <span className="text-neutral-700 dark:text-neutral-300">
                  equipes ágeis
                </span>{" "}
                que valorizam agilidade, organização e inovação.
              </p>
            </div>

            {/* Direita: Features */}
            <div className="relative w-full">
              {/* Glow de fundo */}
              <div className="absolute -inset-6 z-0 hidden rounded-md bg-gradient-to-tr from-yellow-500/15 via-transparent to-purple-500/15 blur-3xl lg:block dark:from-yellow-500/10 dark:to-purple-500/10" />

              <div className="relative z-10 rounded-md border border-neutral-200/70 bg-white/55 p-5 backdrop-blur-md dark:border-neutral-800/70 dark:bg-neutral-900/45">
                <div className="mb-3 text-[10px] font-bold tracking-widest uppercase text-yellow-500 dark:text-yellow-400">
                  Features do Weave
                </div>

                <div className="flex min-h-[280px] flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center">
                  {features.map((feature, idx) => (
                    <div
                      key={feature.title}
                      className={`feature-cloud-item ${cloudSizes[idx]} ${cloudAnimations[idx]} group relative inline-flex cursor-default items-center gap-2 font-bold text-neutral-700 transition-all duration-300 hover:scale-110 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white`}
                    >
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-md border ${feature.color} transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110`}
                      >
                        {feature.icon}
                      </span>
                      <span className="leading-none">{feature.title}</span>

                      <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-30 w-max max-w-[220px] -translate-x-1/2 rounded-md border border-neutral-200 bg-white/95 px-2.5 py-1.5 text-left text-[11px] font-medium text-neutral-600 opacity-0 shadow-lg shadow-neutral-200/70 backdrop-blur-sm transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 dark:border-neutral-700 dark:bg-neutral-900/95 dark:text-neutral-300 dark:shadow-black/40">
                        {feature.desc}
                        <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-b border-neutral-200 bg-white/95 dark:border-neutral-700 dark:bg-neutral-900/95" />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
                  Passe o cursor para destacar cada funcionalidade do Weave Notes.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <style jsx>{`
        .feature-cloud-item {
          text-shadow: 0 0 0 rgba(0, 0, 0, 0);
        }

        .feature-cloud-item:hover {
          text-shadow: 0 6px 22px rgba(250, 204, 21, 0.22);
        }

        .cloud-float-a {
          animation: cloud-float-a 5.8s ease-in-out infinite;
        }

        .cloud-float-b {
          animation: cloud-float-b 6.4s ease-in-out infinite;
        }

        .cloud-float-c {
          animation: cloud-float-c 5.2s ease-in-out infinite;
        }

        .cloud-float-d {
          animation: cloud-float-d 6s ease-in-out infinite;
        }

        @keyframes cloud-float-a {
          from {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(-5px);
          }

          to {
            transform: translateY(0px);
          }
        }

        @keyframes cloud-float-b {
          from {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(4px);
          }

          to {
            transform: translateY(0px);
          }
        }

        @keyframes cloud-float-c {
          from {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(-4px);
          }

          to {
            transform: translateY(0px);
          }
        }

        @keyframes cloud-float-d {
          from {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(3px);
          }

          to {
            transform: translateY(0px);
          }
        }
      `}</style>

      <Footer />
    </div>
  );
}
