"use client";

import Link from "next/link";
import {
  FaArrowRight,
  FaRobot,
  FaUsers,
  FaBuilding,
  FaSearch,
  FaShieldAlt,
  FaBriefcase,
  FaRocket,
} from "react-icons/fa";
import { HiDocumentText, HiFolder, HiSparkles } from "react-icons/hi2";
import { FiEdit3, FiTag, FiZap } from "react-icons/fi";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { APP_URL } from "./config/urls";
import { useLanguage } from "./contexts/LanguageContext";

const BackgroundMinimal = () => (
  <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden bg-neutral-50 dark:bg-neutral-950">
    <div 
      className="absolute inset-0 h-full w-full opacity-[0.4] dark:opacity-[0.1]" 
      style={{ 
        backgroundImage: `radial-gradient(#e5e7eb 1px, transparent 1px)`, 
        backgroundSize: '24px 24px' 
      }} 
    />
    <div className="absolute -top-[10%] -left-[10%] h-[500px] w-[500px] rounded-full bg-yellow-200/30 blur-[120px] dark:bg-yellow-900/10" />
    <div className="absolute top-[20%] -right-[5%] h-[400px] w-[400px] rounded-full bg-blue-100/40 blur-[100px] dark:bg-blue-900/10" />
    <div className="absolute -bottom-[10%] left-[20%] h-[600px] w-[600px] rounded-full bg-purple-100/30 blur-[130px] dark:bg-purple-900/10" />
  </div>
);

export default function HomePage() {
  const { t } = useLanguage();

  const mainFeatures = [
    {
      icon: <FaRobot className="h-5 w-5" />,
      title: t.home.features.weaveAi.title,
      description: t.home.features.weaveAi.description,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-100/50 dark:bg-purple-900/20",
    },
    {
      icon: <HiDocumentText className="h-5 w-5" />,
      title: t.home.features.notesProjects.title,
      description: t.home.features.notesProjects.description,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100/50 dark:bg-blue-900/20",
    },
    {
      icon: <FaBuilding className="h-5 w-5" />,
      title: t.home.features.workspaceTimes.title,
      description: t.home.features.workspaceTimes.description,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-100/50 dark:bg-emerald-900/20",
    },
    {
      icon: <FaRocket className="h-5 w-5" />,
      title: t.home.features.googleEcosystem.title,
      description: t.home.features.googleEcosystem.description,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100/50 dark:bg-amber-900/20",
    },
  ];

  const secondaryFeatures = [
    { title: t.home.mission.secondaryFeatures.weaveAiNative },
    { title: t.home.mission.secondaryFeatures.fileUpload },
    { title: t.home.mission.secondaryFeatures.googleCalendarSync },
    { title: t.home.mission.secondaryFeatures.realtimeCollaboration },
  ];

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden selection:bg-brand-primary-500/30 selection:text-yellow-900 dark:text-neutral-50 dark:selection:bg-brand-primary-500/40 dark:selection:text-yellow-100">
      <BackgroundMinimal />
      <Navbar ctaLabel={t.navbar.cta} ctaHref="/auth/signup" />

      <section className="flex flex-col items-center justify-center px-6 pt-32 pb-16 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-300/50 bg-yellow-50/50 px-4 py-1.5 text-xs font-bold text-yellow-700 backdrop-blur-sm dark:border-yellow-500/20 dark:bg-brand-primary-500/10 dark:text-yellow-400">
            <HiSparkles className="h-3.5 w-3.5" />
            <span>{t.home.badge}</span>
          </div>
          
          <h1 
            className="mb-6 text-5xl font-black tracking-tight text-neutral-900 sm:text-7xl dark:text-white leading-[1.1]"
            dangerouslySetInnerHTML={{ __html: t.home.heroTitle }}
          />

          <p className="mx-auto mb-10 max-w-2xl text-lg font-medium leading-relaxed text-neutral-600 dark:text-neutral-400">
            {t.home.heroDescription}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={`${APP_URL}/auth/signup`}
              className="group flex h-12 items-center gap-2 rounded-full bg-neutral-900 px-8 font-bold text-white transition-all hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 shadow-lg shadow-neutral-900/10 dark:shadow-white/5 active:scale-95"
            >
              {t.home.ctaGetStarted}
              <FaArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </a>
            <Link
              href="/privacy"
              className="h-12 flex items-center px-8 text-sm font-bold text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white transition-colors"
            >
              {t.home.ctaViewTerms}
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {mainFeatures.map((f, i) => (
              <div key={i} className="group relative flex flex-col rounded-3xl border border-neutral-200/50 bg-white/40 p-6 backdrop-blur-md transition-all hover:border-neutral-300 dark:border-neutral-800/50 dark:bg-neutral-900/40 dark:hover:border-neutral-700 shadow-sm">
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${f.bg} ${f.color}`}>
                  {f.icon}
                </div>
                <h3 className="mb-2 text-lg font-bold text-neutral-900 dark:text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Mission Section */}
      <section className="w-full px-6 py-12 mb-12">
        <div className="mx-auto max-w-6xl rounded-[2.5rem] border border-neutral-200/50 bg-white/30 p-8 md:p-12 dark:border-neutral-800/50 dark:bg-neutral-900/20 backdrop-blur-xl shadow-sm">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="flex-1">
              <h2 
                className="text-3xl font-black mb-6 text-neutral-900 dark:text-white tracking-tight"
                dangerouslySetInnerHTML={{ __html: t.home.mission.title }}
              />
              <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed mb-10">
                {t.home.mission.description}
              </p>
              <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                {secondaryFeatures.map((sf, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-300">
                    <div className="h-1.5 w-1.5 rounded-full bg-brand-primary-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                    {sf.title}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4 w-full">
              <div className="aspect-square rounded-3xl bg-white/50 dark:bg-neutral-800/30 flex flex-col p-6 items-center justify-center text-center group cursor-default transition-transform hover:scale-[1.02]">
                <FiZap className="h-8 w-8 text-brand-primary-500 mb-3 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black uppercase tracking-widest text-neutral-400">{t.home.mission.cards.fast}</span>
              </div>
              <div className="aspect-square rounded-3xl bg-white/50 dark:bg-neutral-800/30 flex flex-col p-6 items-center justify-center text-center group cursor-default transition-transform hover:scale-[1.02]">
                <FiEdit3 className="h-8 w-8 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black uppercase tracking-widest text-neutral-400">{t.home.mission.cards.simple}</span>
              </div>
              <div className="aspect-square rounded-3xl bg-white/50 dark:bg-neutral-800/30 flex flex-col p-6 items-center justify-center text-center group cursor-default transition-transform hover:scale-[1.02]">
                <FaBriefcase className="h-8 w-8 text-purple-500 mb-3 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black uppercase tracking-widest text-neutral-400">{t.home.mission.cards.ready}</span>
              </div>
              <div className="aspect-square rounded-3xl bg-white/50 dark:bg-neutral-800/30 flex flex-col p-6 items-center justify-center text-center group cursor-default transition-transform hover:scale-[1.02]">
                <FaRocket className="h-8 w-8 text-orange-500 mb-3 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black uppercase tracking-widest text-neutral-400">{t.home.mission.cards.modern}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

