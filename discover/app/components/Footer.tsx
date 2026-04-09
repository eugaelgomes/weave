import { FaGithub, FaLinkedin } from "react-icons/fa";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full px-6 py-8 mt-auto border-t border-neutral-200/50 dark:border-neutral-800/50 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm">
      <div
        className="
          mx-auto max-w-7xl
          flex flex-col sm:flex-row
          items-center
          justify-between
          gap-4
          text-xs font-medium
        "
      >
        <div className="text-xs text-neutral-500">
          {new Date().getFullYear()} &copy;{" "}
          <a
            href={
              process.env.NEXT_PUBLIC_BLOG_URL ||
              "https://blog.weavenotes.app/about"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-primary-700 hover:underline"
          >
            Weave Notes
          </a>
          <span className="mx-2 hidden xs:inline">-</span>
          <span className="hidden sm:inline">
            {" "}Todos os direitos reservados.
          </span>
        </div>

        <div
          className="
            flex flex-wrap
            items-center
            justify-center sm:justify-end
            gap-2 sm:gap-4 lg:gap-6
            text-xs font-semibold text-neutral-400
          "
        >
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

          {/* Descomente se quiser mostrar os ícones, eles também ficarão responsivos */}
          {/* <a
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
          </a> */}

          <Link
            href="https://blog.weavenotes.app/support"
            target="_blank"
            className="transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            Ajuda
          </Link>
        </div>
      </div>
    </footer>
  );
}
