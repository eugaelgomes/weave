"use client";

import { Home, Network, Book, Users, Sparkles, Settings } from "lucide-react";
import { getTranslations, LocaleKey } from "../_i18n";

export function AuthMarketing({ locale = "pt-br" }: { locale?: LocaleKey }) {
  const t = getTranslations(locale);

  const features = [
    {
      icon: Home,
      title: t.marketing.features.access.title,
      desc: t.marketing.features.access.desc,
      color: "text-blue-600",
      bg: "bg-blue-100/50",
      border: "border-blue-100/50",
    },
    {
      icon: Network,
      title: t.marketing.features.projects.title,
      desc: t.marketing.features.projects.desc,
      color: "text-emerald-600",
      bg: "bg-emerald-100/50",
      border: "border-emerald-100/50",
    },
    {
      icon: Book,
      title: t.marketing.features.notes.title,
      desc: t.marketing.features.notes.desc,
      color: "text-violet-600",
      bg: "bg-violet-100/50",
      border: "border-violet-100/50",
    },
    {
      icon: Users,
      title: t.marketing.features.collaboration.title,
      desc: t.marketing.features.collaboration.desc,
      color: "text-amber-600",
      bg: "bg-amber-100/50",
      border: "border-amber-100/50",
    },
    {
      icon: Sparkles,
      title: t.marketing.features.ai.title,
      desc: t.marketing.features.ai.desc,
      color: "text-rose-600",
      bg: "bg-rose-100/50",
      border: "border-rose-100/50",
    },
    {
      icon: Settings,
      title: t.marketing.features.security.title,
      desc: t.marketing.features.security.desc,
      color: "text-slate-600",
      bg: "bg-slate-100/50",
      border: "border-slate-100/50",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-2 py-6">
      <div className="mb-10 text-center">
        <h2 className="mb-4 text-lg font-bold tracking-tight text-slate-800">
          {t.marketing.title}
        </h2>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-500">
          {t.marketing.subtitle}
        </p>
      </div>

      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {features.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 rounded-md border bg-white/90 p-2.5 backdrop-blur-sm ${item.border} shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-md`}
          >
            <div className={`shrink-0 rounded-md p-1.5 ${item.bg}`}>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
            <div className="flex flex-col pt-0.5">
              <h3 className="mb-0.5 text-xs font-semibold text-slate-800">{item.title}</h3>
              <p className="text-[10px] leading-relaxed text-slate-500">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
