"use client";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Cards from "./components/Cards";
import { APP_URL } from "./config/urls";
import { useLanguage } from "./contexts/LanguageContext";
import ContactArea from "./components/ContactArea";
import Blocks from "./components/Blocks";

function SharedMainSurfaceBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-b from-yellow-200/90 via-yellow-100 to-yellow-50 dark:from-neutral-950 dark:via-yellow-950/35 dark:to-neutral-950" />
      <div className="absolute -left-[8%] -top-[12%] h-[min(520px,90vw)] w-[min(520px,90vw)] rounded-full bg-yellow-500/30 blur-[110px] dark:bg-yellow-500/25" />
      <div className="absolute bottom-[-8%] right-[-6%] h-[min(440px,80vw)] w-[min(440px,80vw)] rounded-full bg-yellow-400/35 blur-[100px] dark:bg-yellow-500/20" />
      <div
        className="absolute inset-0 opacity-[0.55] [background-image:radial-gradient(rgb(234_179_8_/_0.16)_1px,transparent_1px)] [background-size:22px_22px] dark:opacity-[0.35] dark:[background-image:radial-gradient(rgb(234_179_8_/_0.14)_1px,transparent_1px)]"
      />
    </div>
  );
}

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-white dark:bg-neutral-950 selection:bg-brand-primary-500/30 selection:text-yellow-900 dark:text-neutral-50 dark:selection:bg-brand-primary-500/40 dark:selection:text-yellow-100">
      <Navbar ctaLabel={t.navbar.cta} ctaHref="/auth/" />

      <div className="relative isolate w-full flex-1">
        <SharedMainSurfaceBackground />
        <Hero
          kicker={t.home.heroVisual.kicker}
          headline={t.home.heroVisual.headline}
          headlineSub={t.home.heroVisual.headlineSub}
          cardTitle={t.home.heroVisual.cardTitle}
          cardDescription={t.home.heroVisual.cardDescription}
          ctaPrimary={t.home.ctaGetStarted}
          ctaSecondary={t.home.ctaViewTerms}
          signupHref={`${APP_URL}/auth/`}
          termsHref="/privacy"
        />
        <Blocks
          ariaLabel={t.home.principles.sectionAria}
          items={t.home.principles.items}
        />
        <Cards />
      </div>
      <ContactArea />
      <Footer />
    </div>
  );
}

