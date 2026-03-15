import React from "react";

const PagesFooter = () => {
  return (
    <div>
      <div className="flex justify-between rounded-md border border-neutral-200 bg-neutral-50 px-4 py-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <div className="text-xs text-neutral-500">
          &copy; {new Date().getFullYear()}{" "}
          <a
            href={process.env.NEXT_PUBLIC_BLOG_URL || "https://blog.weavenotes.app"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-500 hover:underline"
          >
            Weave Notes
          </a>
        </div>
        <div className="text-xs text-neutral-500">
          <a
            href={`${process.env.NEXT_PUBLIC_BLOG_URL || "https://blog.weavenotes.app"}/privacy`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Privacidade
          </a>
          <span className="mx-2">|</span>
          <a
            href={`${process.env.NEXT_PUBLIC_BLOG_URL || "https://blog.weavenotes.app"}/terms`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Termos de Serviço
          </a>
          <span className="mx-2">|</span>
          <a
            href={`${process.env.NEXT_PUBLIC_APP_URL || "https://weavenotes.app"}/support/`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Ajuda
          </a>
        </div>
      </div>
    </div>
  );
};

export default PagesFooter;
