"use client";

import Link from "next/link";
import { FaArrowRight } from "react-icons/fa";

export interface HeroProps {
  kicker: string;
  headline: string;
  headlineSub: string;
  cardTitle: string;
  cardDescription: string;
  ctaPrimary: string;
  ctaSecondary: string;
  signupHref: string;
  termsHref?: string;
}

function StepIndicator() {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500 sm:text-xs">
      <span className="font-semibold text-neutral-900 dark:text-white">01</span>
      <span> / 02 / 03</span>
    </p>
  );
}

function WireframeCube({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M24 8L38 16V32L24 40L10 32V16L24 8Z"
        className="stroke-neutral-400 dark:stroke-neutral-500"
        strokeWidth="1"
      />
      <path
        d="M24 8V24M38 16L24 24M10 16L24 24M24 40V24"
        className="stroke-neutral-300 dark:stroke-neutral-600"
        strokeWidth="1"
      />
    </svg>
  );
}

function IsometricStack() {
  return (
    <div
      className="relative mx-auto flex h-[200px] w-full max-w-[240px] items-center justify-center sm:h-[240px] sm:max-w-[280px]"
      style={{ perspective: "900px" }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ transformStyle: "preserve-3d" }}
      >
        {[48, 40, 32].map((size, i) => (
          <div
            key={size}
            className="absolute rounded-md border border-neutral-200/50 bg-white/40 dark:border-neutral-600/40 dark:bg-neutral-800/30"
            style={{
              width: size,
              height: size,
              transform: `rotateX(58deg) rotateZ(-42deg) translateZ(${-12 - i * 10}px)`,
              opacity: 0.25 + i * 0.18,
            }}
          />
        ))}
        <div
          className="absolute rounded-md bg-gradient-to-br from-cyan-400/30 via-fuchsia-500/25 to-amber-400/30 blur-md dark:from-cyan-500/20 dark:via-fuchsia-500/15 dark:to-amber-400/20"
          style={{
            width: 112,
            height: 112,
            transform: "rotateX(58deg) rotateZ(-42deg) translateZ(4px)",
          }}
        />
        <div
          className="relative z-10 grid h-[104px] w-[104px] grid-cols-2 gap-1.5 rounded-md border-2 border-white bg-white/95 p-2.5 shadow-lg dark:border-neutral-700 dark:bg-neutral-900/95 sm:h-[118px] sm:w-[118px]"
          style={{ transform: "rotateX(58deg) rotateZ(-42deg) translateZ(18px)" }}
        >
          <div className="rounded-md border border-dashed border-neutral-300/90 dark:border-neutral-600" />
          <div className="rounded-md border border-dashed border-neutral-300/90 dark:border-neutral-600" />
          <div className="rounded-md border border-dashed border-neutral-300/90 dark:border-neutral-600" />
          <div className="rounded-md border border-dashed border-neutral-300/90 dark:border-neutral-600" />
        </div>
      </div>
    </div>
  );
}

export default function Hero({
  kicker,
  headline,
  headlineSub,
  cardTitle,
  cardDescription,
  ctaPrimary,
  ctaSecondary,
  signupHref,
  termsHref = "/privacy",
}: HeroProps) {
  return (
    <section className="pb-10 pt-20 sm:pb-16 sm:pt-20">
      <div className="mx-auto w-full max-w-10xl px-4 sm:px-6 lg:px-4">
        <div className="w-full rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
          <div className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
            <h1 className="mx-auto mb-12 max-w-4xl text-center sm:mb-14">
              <span className="block text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl md:text-5xl dark:text-white">
                {headline}
              </span>
              <span className="mx-auto mt-4 block max-w-3xl text-pretty text-base font-semibold leading-snug tracking-tight text-neutral-600 sm:mt-5 sm:text-lg md:text-xl dark:text-neutral-300">
                {headlineSub}
              </span>
            </h1>

            <div className="rounded-md bg-gradient-to-br from-cyan-400 via-violet-400 to-amber-300 p-px shadow-sm dark:from-cyan-500/80 dark:via-violet-500/70 dark:to-amber-400/80">
              <div className="relative overflow-hidden rounded-md bg-[#f9f9fb] dark:bg-neutral-950">
                <div
                  className="pointer-events-none absolute -left-1/4 top-0 h-[120%] w-[70%] opacity-70 dark:opacity-40"
                  style={{
                    background:
                      "radial-gradient(ellipse at 30% 40%, rgba(147, 197, 253, 0.35) 0%, rgba(196, 181, 253, 0.2) 35%, transparent 60%)",
                  }}
                />
                <div className="relative grid gap-10 px-4 py-10 sm:gap-12 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-8 lg:px-8">
                  <div className="flex flex-col gap-6 lg:max-w-xs">
                    <StepIndicator />
                    <h2 className="text-2xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
                      {cardTitle}
                    </h2>
                  </div>

                  <div className="flex min-h-[180px] items-center justify-center lg:min-h-[220px]">
                    <IsometricStack />
                  </div>

                  <div className="flex flex-col gap-5 lg:max-w-sm lg:justify-center">
                    <WireframeCube className="h-10 w-10 shrink-0 text-neutral-500 sm:h-12 sm:w-12" />
                    <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-[15px]">
                      {cardDescription}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:mt-12 sm:flex-row sm:gap-6">
              <a
                href={signupHref}
                className="group flex h-12 items-center gap-2 rounded-md bg-neutral-900 px-8 text-sm font-bold text-white shadow-lg shadow-neutral-900/10 transition-all hover:bg-neutral-800 active:scale-[0.98] dark:bg-white dark:text-neutral-900 dark:shadow-white/5 dark:hover:bg-neutral-100"
              >
                {ctaPrimary}
                <FaArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </a>
              <Link
                href={termsHref}
                className="text-sm font-bold text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                {ctaSecondary}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
