import Link from "next/link";
import React from "react";

const PagesFooter = () => {
  return (
    <div>
      <div className="flex justify-between rounded-md border border-neutral-200 bg-white px-4 py-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
        <div className="text-xs text-neutral-500">
          &copy; {new Date().getFullYear()}{" "}
          <Link href="/about" target="_blank" className="text-yellow-500 hover:underline">
            Weave Notes
          </Link>
        </div>
        <div className="text-xs text-neutral-500">
          <Link href="/privacy" target="_blank" className="hover:underline">
            Privacidade
          </Link>
          <span className="mx-2">|</span>
          <Link href="/terms" target="_blank" className="hover:underline">
            Termos de Serviço
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PagesFooter;
