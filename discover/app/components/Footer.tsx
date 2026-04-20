"use client";

import Link from "next/link";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { SOCIAL_GITHUB_URL, SOCIAL_LINKEDIN_URL } from "../config/urls";
import { useLanguage } from "../contexts/LanguageContext";

const iconBaseClass =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-all duration-300";

const githubClass = 
  `${iconBaseClass} text-neutral-600 hover:bg-neutral-200 hover:text-black dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white`;

const linkedinClass = 
  `${iconBaseClass} text-neutral-600 hover:bg-blue-50 hover:text-[#0A66C2] dark:text-neutral-400 dark:hover:bg-blue-900/20 dark:hover:text-[#0A66C2]`;

const legalLinkClass =
  "inline-flex items-center justify-center rounded-md px-2 py-0.5 text-center text-[10px] font-bold leading-tight tracking-wide text-neutral-600 transition-colors hover:text-yellow-600 dark:text-neutral-400 dark:hover:text-yellow-400 sm:text-[11px]";

export default function Footer() {
  const year = new Date().getFullYear();
  const { t } = useLanguage();

  return (
    <footer className="mt-auto w-full border-t border-neutral-200/90 bg-[#F9F9F9] dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:px-6 lg:px-8">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          &copy; {year} Weave Notes
        </p>

        <nav
          className="flex flex-wrap items-center gap-2 sm:gap-4"
          aria-label={t.home.contact.siteMapAria}
        >
          <a
            href={SOCIAL_GITHUB_URL}
            className={githubClass}
            aria-label="GitHub"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaGithub className="h-4 w-4" />
          </a>
          <a
            href={SOCIAL_LINKEDIN_URL}
            className={linkedinClass}
            aria-label="LinkedIn"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaLinkedin className="h-4 w-4" />
          </a>

          <Link
            href="/privacy"
            title={t.footer.privacyNotice}
            className={legalLinkClass}
          >
            {t.home.contact.trustPrivacy}
          </Link>
          <Link
            href="/terms"
            title={t.footer.termsOfService}
            className={legalLinkClass}
          >
            {t.home.contact.trustTerms}
          </Link>
        </nav>
      </div>
    </footer>
  );
}