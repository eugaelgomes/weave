"use client";

import {
  Book,
  Calendar,
  MessageSquare,
  Network,
  Settings,
  Sparkles,
  Users,
  UsersRound,
  Workflow,
} from "lucide-react";
import { FaMicrosoft } from "react-icons/fa6";
import { SiGithub, SiGoogle } from "react-icons/si";
import { useLanguage } from "../contexts/LanguageContext";

type FeatureSlug =
  | "projects"
  | "tasks"
  | "orgs"
  | "weaveAi"
  | "calendar"
  | "notifications"
  | "auth"
  | "plans"
  | "backup";

function isFeatureSlug(s: string): s is FeatureSlug {
  return (
    s === "projects" ||
    s === "tasks" ||
    s === "orgs" ||
    s === "weaveAi" ||
    s === "calendar" ||
    s === "notifications" ||
    s === "auth" ||
    s === "plans" ||
    s === "backup"
  );
}

function SlideVisual({ slug }: { slug: FeatureSlug }) {
  const iconWrap =
    "flex h-9 w-9 shrink-0 items-center justify-center text-yellow-600 dark:text-yellow-400 sm:h-10 sm:w-10";

  const brandClass = "h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px] drop-shadow-sm [color-scheme:light]";
  const iconClass = "h-5 w-5 sm:h-5 sm:w-5";

  switch (slug) {
    case "projects":
      return <div className={iconWrap} aria-hidden><Network className={iconClass} strokeWidth={1.75} /></div>;
    case "tasks":
      return <div className={iconWrap} aria-hidden><Book className={iconClass} strokeWidth={1.75} /></div>;
    case "orgs":
      return <div className={iconWrap} aria-hidden><Users className={iconClass} strokeWidth={1.75} /></div>;
    case "weaveAi":
      return (
        <div className="flex flex-col items-end gap-1.5">
          <div className={iconWrap} aria-hidden>
            <Sparkles className={iconClass} strokeWidth={1.75} />
          </div>
          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400" aria-hidden>
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.75} />
          </div>
        </div>
      );
    case "calendar":
      return <div className={iconWrap} aria-hidden><Calendar className={iconClass} strokeWidth={1.75} /></div>;
    case "notifications":
      return <div className={iconWrap} aria-hidden><MessageSquare className={iconClass} strokeWidth={1.75} /></div>;
    case "auth":
      return (
        <div className="flex flex-col items-end gap-2">
          <div className={iconWrap} aria-hidden>
            <Settings className={iconClass} strokeWidth={1.75} />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5" aria-hidden>
            <SiGoogle className={`${brandClass} text-[#4285F4]`} />
            <SiGithub className={`${brandClass} text-neutral-900 dark:text-white`} />
            <FaMicrosoft className={`${brandClass} text-[#00A4EF]`} />
          </div>
        </div>
      );
    case "plans":
      return <div className={iconWrap} aria-hidden><Workflow className={iconClass} strokeWidth={1.75} /></div>;
    case "backup":
      return <div className={iconWrap} aria-hidden><UsersRound className={iconClass} strokeWidth={1.75} /></div>;
    default:
      return null;
  }
}

function FeatureSlide({
  slug,
  title,
  summary,
}: {
  slug: FeatureSlug;
  title: string;
  summary: string;
}) {
  return (
    <article className="w-[16.5rem] shrink-0 sm:w-[17.5rem]">
      <div className="flex h-full min-h-[160px] flex-col rounded-md border border-neutral-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950/85 sm:min-h-[180px] sm:p-5">
        <div className="flex w-full items-start justify-between gap-3">
          <h3 className="text-left text-sm font-bold leading-snug tracking-tight text-neutral-900 dark:text-white sm:text-base">
            {title}
          </h3>
          <div className="shrink-0">
            <SlideVisual slug={slug} />
          </div>
        </div>
        <p className="mt-3 text-left text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
          {summary}
        </p>
      </div>
    </article>
  );
}

export default function Cards() {
  const { t } = useLanguage();
  const { kicker, title, subtitle, items } = t.home.featureCards;

  // Duplicamos os itens para criar a ilusão de loop infinito sem quebras
  const duplicatedItems = [...items, ...items];

  return (
    <section
      id="planos-e-features"
      className="w-full scroll-mt-24 overflow-hidden py-8 sm:py-10"
      role="region"
      aria-labelledby="feature-cards-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 max-w-3xl sm:mb-10">
          <p className="mb-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
            {kicker}
          </p>
          <h2
            id="feature-cards-heading"
            className="mb-2 text-left text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-white"
          >
            {title}
          </h2>
          <p className="text-left text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            {subtitle}
          </p>
        </header>
      </div>

      {/* Injeção de CSS para a animação do carrossel e máscara de borda */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes infinite-scroll {
            0% { transform: translateX(0); }
            /* -0.5rem compensa exatamente a metade do gap-4 (1rem/16px) para um loop matematicamente perfeito */
            100% { transform: translateX(calc(-50% - 0.5rem)); }
          }
          .animate-infinite-scroll {
            animation: infinite-scroll 45s linear infinite;
          }
          .mask-edges {
            mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
            -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
          }
        `
      }} />

      {/* Container do Carrossel */}
      <div className="group relative mt-2 flex overflow-hidden mask-edges pb-4">
        <div className="flex w-max animate-infinite-scroll gap-4 hover:[animation-play-state:paused] px-4">
          {duplicatedItems.map((item, i) => {
            const slug = isFeatureSlug(item.slug) ? item.slug : "projects";
            return (
              <FeatureSlide
                key={`${item.slug}-${i}`}
                slug={slug}
                title={item.title}
                summary={item.summary}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}