import { FaGithub, FaLinkedin } from "react-icons/fa";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="z-10 w-full px-6 py-4 lg:py-5">
      <div className="mx-auto flex max-w-7xl items-center justify-between text-[10px] text-neutral-400 sm:text-xs lg:text-sm">
        <p>&copy; {new Date().getFullYear()} Weave Notes</p>

        <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
          <Link
            href="/privacy"
            className="transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            Privacidade
          </Link>
          <Link
            href="/terms"
            className="transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            Termos
          </Link>
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
    </footer>
  );
}
