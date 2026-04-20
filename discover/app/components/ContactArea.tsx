"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/utils";
import Link from "next/link";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import {
  APP_URL,
  BLOG_URL,
  LEGAL_DPA_URL,
  SOCIAL_GITHUB_URL,
  SOCIAL_LINKEDIN_URL,
} from "../config/urls";
import { useLanguage } from "../contexts/LanguageContext";

const CONTACT_MAIL = "us@weavenotes.app";

const TAGLINE_CAROUSEL_MS = 3000;

const navLinkClass =
  "text-xs text-neutral-600 transition-colors hover:text-yellow-500 dark:text-neutral-400 dark:hover:text-yellow-500";


  const solidBtnClass =
  "group inline-flex h-11 w-full items-center justify-center rounded-md bg-neutral-900 px-6 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-yellow-500 hover:text-neutral-900 hover:shadow-lg hover:shadow-yellow-500/30 dark:bg-white dark:text-neutral-900 dark:hover:bg-yellow-500 sm:w-auto sm:min-w-[220px]";

const outlineBtnClass =
  "inline-flex h-11 w-full items-center justify-center rounded-md border border-neutral-300 bg-transparent px-6 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-900 transition-all duration-300 hover:-translate-y-0.5 hover:border-yellow-500 hover:text-yellow-600 hover:shadow-sm dark:border-neutral-700 dark:text-white dark:hover:border-yellow-500 dark:hover:text-yellow-500 sm:w-auto sm:min-w-[220px]";
  
type NavHref = {
  label: string;
  href: string;
  /** Utilizado para links que fogem do domínio da aplicação e abrem em nova aba */
  external?: boolean;
  /** Utilizado para tirar proveito do roteamento no lado do cliente do Next.js */
  next?: boolean;
};

function NavColumn({ title, links }: { title: string; links: NavHref[] }) {
  return (
    <div>
      <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-yellow-500 dark:text-yellow-400">
        {title}
      </h3>
      <ul className="space-y-2.5">
        {links.map(({ label, href, external, next }) => (
          <li key={`${title}-${href}-${label}`}>
            {next ? (
              <Link href={href} className={navLinkClass}>
                {label}
              </Link>
            ) : (
              <a
                href={href}
                className={navLinkClass}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ContactArea() {
  const { t } = useLanguage();
  const c = t.home.contact;
  const taglineVerbs = c.taglineVerbs;

  const [email, setEmail] = useState("");
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const taglineKey = taglineVerbs.join("|");

  const verbSlotMinCh = useMemo(
    () => Math.max(1, ...taglineVerbs.map((v) => v.length)) + 0.5,
    [taglineKey, taglineVerbs],
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setTaglineIndex(0);
  }, [taglineKey]);

  useEffect(() => {
    if (reduceMotion) return;
    const len = taglineVerbs.length;
    if (len < 2) return;
    const id = window.setInterval(() => {
      setTaglineIndex((i) => (i + 1) % len);
    }, TAGLINE_CAROUSEL_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, taglineKey, taglineVerbs.length]);

  const signupHref = `${APP_URL}/auth/`;
  const loginHref = `${APP_URL}/auth/`;
  const supportHref = `${BLOG_URL}/support`;

  const contactSalesHref = `mailto:${CONTACT_MAIL}?subject=${encodeURIComponent("Weave Notes — contato")}`;

  const onNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    const subject = encodeURIComponent("Newsletter — Weave Notes");
    const body = encodeURIComponent(`Quero receber novidades: ${trimmed}`);
    window.location.href = `mailto:${CONTACT_MAIL}?subject=${subject}&body=${body}`;
  };

  const solutionsLinks: NavHref[] = [
    { label: t.home.features.weaveAi.title, href: signupHref },
    { label: t.home.features.notesProjects.title, href: signupHref },
    { label: t.home.features.workspaceTimes.title, href: signupHref },
    { label: t.home.features.googleEcosystem.title, href: signupHref },
  ];

  const productLinks: NavHref[] = [
    { label: t.navbar.login, href: loginHref },
    { label: t.navbar.cta, href: signupHref },
    { label: c.linkPlansFeatures, href: "/#planos-e-features", next: true },
    { label: c.linkOpenApp, href: signupHref },
    { label: t.navbar.bookDemo, href: supportHref, external: true },
  ];

  const resourcesLinks: NavHref[] = [
    { label: c.linkBlog, href: BLOG_URL, external: true },
    { label: "GitHub", href: SOCIAL_GITHUB_URL, external: true },
    { label: c.linkSupport, href: supportHref, external: true },
  ];

  const companyLinks: NavHref[] = [
    { label: t.footer.privacyNotice, href: "/privacy", next: true },
    { label: t.footer.termsOfService, href: "/terms", next: true },
    { label: t.footer.dataProcessingAddendum, href: LEGAL_DPA_URL, external: true },
  ];

  return (
    <section
      className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
      aria-labelledby="contact-headline"
    >
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-12">
          
          <div className="md:col-span-2 lg:col-span-4">
            <h2
              id="contact-headline"
              className="max-w-md text-lg font-bold leading-snug tracking-tight text-neutral-900 sm:text-xl lg:text-[1.25rem] lg:leading-snug dark:text-white"
            >
              {c.headline}
            </h2>
            <div className="mt-8 flex flex-col items-start gap-3">
              <a href={signupHref} className={solidBtnClass}>
                {c.ctaCreateWorkspace}
              </a>
              <a href={contactSalesHref} className={outlineBtnClass}>
                {c.contactSales}
              </a>
            </div>
          </div>

          <div
            className="grid grid-cols-2 gap-8 sm:grid-cols-4 md:col-span-2 lg:col-span-5"
            aria-label={c.siteMapAria}
          >
            <NavColumn title={c.navSolutions} links={solutionsLinks} />
            <NavColumn title={c.navProduct} links={productLinks} />
            <NavColumn title={c.navResources} links={resourcesLinks} />
            <NavColumn title={c.navCompany} links={companyLinks} />
          </div>

          <div className="flex flex-col md:col-span-2 lg:col-span-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
              {c.newsletterKicker}
            </p>
            <h3 className="mt-2 text-lg font-bold text-neutral-900 dark:text-white">
              {c.newsletterTitle}
            </h3>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              {c.newsletterDescription}
            </p>
            <form onSubmit={onNewsletterSubmit} className="mt-6 flex w-full max-w-md flex-col gap-3">
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder={c.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-yellow-500 dark:focus:ring-yellow-500"
              />
              <button type="submit" className={`${solidBtnClass} max-w-none`}>
                {c.subscribe}
              </button>
            </form>


          </div>
        </div>
      </div>

      <div className="relative border-t border-neutral-100 bg-gradient-to-b from-white to-neutral-50/70 px-4 py-6 dark:border-neutral-800 dark:from-neutral-950 dark:to-neutral-900/50 sm:px-6 lg:px-8">
        <div
          className="mx-auto max-w-6xl"
          role="region"
          aria-roledescription="carousel"
          aria-label={c.taglineCarouselAria}
        >
          {reduceMotion ? (
            <p
              className="select-none text-balance text-center text-4xl font-black leading-tight tracking-tight text-yellow-500/35 [-webkit-text-stroke:1px_rgb(234_179_8_/_0.2)] sm:text-5xl md:text-6xl dark:text-yellow-500/22 dark:[-webkit-text-stroke:1px_rgb(234_179_8_/_0.14)]"
            >
              {taglineVerbs.join(", ")}
              {c.taglineSuffix}
            </p>
          ) : (
            <>
              <p className="mx-auto flex select-none flex-wrap items-baseline justify-center gap-x-1.5 text-balance px-2 text-center">
                <span
                  className="relative inline-block min-w-[calc(var(--tagline-verb-ch)*1ch)] shrink-0 text-left [--tagline-verb-ch:8]"
                  style={{ "--tagline-verb-ch": String(verbSlotMinCh) } as React.CSSProperties}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {taglineVerbs.map((verb, i) => (
                    <span
                      key={`${taglineKey}-${verb}`}
                      className={cn(
                        "block text-4xl font-black leading-[1.05] tracking-tight text-yellow-500/40 [-webkit-text-stroke:1px_rgb(234_179_8_/_0.24)] [text-shadow:0_0_1px_rgb(234_179_8_/_0.22)] transition-all duration-700 ease-out sm:text-5xl md:text-6xl lg:text-7xl dark:text-yellow-500/25 dark:[-webkit-text-stroke:1px_rgb(234_179_8_/_0.16)] dark:[text-shadow:0_0_1px_rgb(234_179_8_/_0.18)]",
                        i === taglineIndex
                          ? "relative z-10 translate-y-0 opacity-100"
                          : "pointer-events-none absolute left-0 top-0 z-0 w-full translate-y-2 opacity-0",
                      )}
                      {...(i !== taglineIndex ? { "aria-hidden": true } : {})}
                    >
                      {verb}
                    </span>
                  ))}
                </span>
                <span className="text-4xl font-black leading-[1.05] tracking-tight text-yellow-500/40 [-webkit-text-stroke:1px_rgb(234_179_8_/_0.24)] [text-shadow:0_0_1px_rgb(234_179_8_/_0.22)] sm:text-5xl md:text-6xl lg:text-7xl dark:text-yellow-500/25 dark:[-webkit-text-stroke:1px_rgb(234_179_8_/_0.16)] dark:[text-shadow:0_0_1px_rgb(234_179_8_/_0.18)]">
                  {c.taglineSuffix}
                </span>
              </p>
              <div
                className="mt-7 flex justify-center gap-2"
                role="tablist"
                aria-label={c.taglineCarouselDotsAria}
              >
                {taglineVerbs.map((_, i) => (
                  <button
                    key={`${taglineKey}-dot-${i}`}
                    type="button"
                    role="tab"
                    {...(i === taglineIndex
                      ? { "aria-selected": true }
                      : { "aria-selected": false })}
                    aria-label={`${i + 1} / ${taglineVerbs.length}`}
                    className={cn(
                      "h-1.5 rounded-md transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950",
                      i === taglineIndex
                        ? "w-9 bg-yellow-500 shadow-sm shadow-yellow-500/30"
                        : "w-1.5 bg-neutral-300 hover:bg-neutral-400 dark:bg-neutral-600 dark:hover:bg-neutral-500",
                    )}
                    onClick={() => setTaglineIndex(i)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}