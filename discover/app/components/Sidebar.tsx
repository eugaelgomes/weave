'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarSection {
  title: string;
  id: string;
}

interface SidebarProps {
  sections: SidebarSection[];
}

export default function Sidebar({ sections }: SidebarProps) {
  const pathname = usePathname();

  const links = [
    { name: 'Política de Privacidade', href: '/privacy' },
    { name: 'Termos de Uso', href: '/terms' },
  ];

  return (
    <aside className="sticky top-28 bg-white/50 hidden h-[calc(100vh-140px)] overflow-y-auto w-64 flex-shrink-0 lg:block dark:bg-neutral-900/50 border border-neutral-200/50 dark:border-neutral-800/50 rounded-2xl p-4 transition-all">
      <nav className="space-y-8">
        {/* Main Links */}
        <div>
          <h3 className="mb-4 text-sm font-semibold tracking-wider text-brand-primary-500 dark:text-brand-primary-500">
            Documentos
          </h3>
          <ul className="space-y-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-50'
                  }`}
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Section Anchors */}
        {sections.length > 0 && (
          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wider text-brand-primary-500 dark:text-brand-primary-500">
              Nesta página
            </h3>
            <ul className="border-l border-neutral-200 space-y-2 dark:border-neutral-800">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block border-l-2 border-transparent py-1 pl-4 text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
    </aside>
  );
}
