import { FaGithub, FaLinkedin } from "react-icons/fa";
import Link from "next/link";

// footer component
export default function Footer() {
  return (
    <footer className="z-10 w-full border-none px-4 py-3 text-[10px] text-neutral-400 sm:text-xs">
      <div className="mx-auto flex items-center justify-between">
        <div className="text-[11px] text-neutral-500 sm:text-xs">
          {new Date().getFullYear()} &copy;{" "}
          <Link
            href="https://blog.weavenotes.app"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-yellow-500 hover:underline"
          >
            Weave Notes
          </Link>
          <span className="mx-2">-</span>
          <span className="hidden sm:inline">Todos os direitos reservados.</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] sm:gap-3 sm:text-xs">
          <Link
            href="https://blog.weavenotes.app/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            Privacidade
          </Link>
          <Link
            href="https://blog.weavenotes.app/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            Termos
          </Link>
          <Link
            href="https://blog.weavenotes.app/about"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 transition-colors hover:text-purple-700 dark:hover:text-purple-300"
          >
            O Weave
          </Link>
          <Link
            href="/support/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 transition-colors hover:text-purple-700 dark:hover:text-purple-300"
          >
            Ajuda
          </Link>
        </div>
      </div>
    </footer>
  );
}
