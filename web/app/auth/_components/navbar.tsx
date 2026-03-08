import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="relative top-0 z-50 flex w-full justify-center shadow shadow-md">
      <div className="flex w-full items-center justify-between bg-white px-6 h-14">
        <Link
          href={process.env.NEXT_PUBLIC_BLOG_URL || "https://blog.weavenotes.app"}
          className="group flex items-center gap-3 rounded-lg transition-opacity focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 focus-visible:outline-none"
        >
          {/*<div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-neutral-200/50 transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/weave.png"
              alt="Weave Logo"
              width={32}
              height={32}
              className="h-full w-full object-cover"
              priority
            />
          </div>*/}
          <span className="text-lg font-black tracking-tight text-yellow-500">Weave Notes</span>
        </Link>

        <div className="hidden items-center sm:flex">
          <span className="bg-gradient-to-r from-yellow-500 to-violet-500 bg-clip-text text-sm font-medium tracking-wide text-transparent">
            O workspace inteligente para quem pensa grande.
          </span>
        </div>
      </div>
    </nav>
  );
}
