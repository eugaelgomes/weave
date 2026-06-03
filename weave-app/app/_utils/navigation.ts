import { type LucideIcon } from "lucide-react";
import React from "react";

export const SUPPORT_URL = `${process.env.NEXT_PUBLIC_APP_URL || "https://weavenotes.app"}/support/`;

export interface NavigableItem {
  path: string;
  subItems?: NavigableItem[];
}

export interface NavigationItem {
  path: string;
  icon: React.ElementType<any>;
  label: string;
  subItems?: NavigationItem[];
  badge?: number;
}

/**
 * Verifica se `pathname` corresponde a `itemPath` ou a algum dos `subPaths`.
 *
 * Regras (em ordem):
 *  1. Match exato (`/notes` === `/notes`)
 *  2. Match exato com trailing slash (`/notes` === `/notes/`)
 *  3. Prefixo (`/notes/123` startsWith `/notes/`)
 *  4. Qualquer `subPath` satisfaz (1), (2) ou (3)
 *
 * @example
 * isPathActive("/notes/123", "/notes")          // true  (prefixo)
 * isPathActive("/home",      "/notes")          // false
 * isPathActive("/weave-ai/chat/1", "/weave-ai/chat", ["/weave-ai/agent"]) // true
 */
export function isPathActive(pathname: string, itemPath: string, subPaths?: string[]): boolean {
  if (pathname === itemPath || pathname === `${itemPath}/`) return true;
  if (pathname.startsWith(`${itemPath}/`)) return true;

  if (subPaths) {
    return subPaths.some(
      (sub) => pathname === sub || pathname === `${sub}/` || pathname.startsWith(`${sub}/`)
    );
  }

  return false;
}

/**
 * Dado um item de navegação com possíveis `subItems` aninhados,
 * retorna o path da primeira "folha" (item sem filhos).
 *
 * Isso permite que cliques em itens-pai redirecionem para o
 * primeiro destino real em vez de uma rota abstrata.
 *
 * @example
 * getFirstNavigablePath({ path: "/org", subItems: [{ path: "/org/settings" }] })
 * // => "/org/settings"
 */
export function getFirstNavigablePath(item: NavigableItem): string {
  if (!item.subItems?.length) return item.path;
  return getFirstNavigablePath(item.subItems[0]);
}
