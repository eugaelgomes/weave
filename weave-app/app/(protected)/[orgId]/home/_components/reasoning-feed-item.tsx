"use client";

import React from "react";
import { ChevronDown, ChevronRight, Pin, PinOff, X } from "lucide-react";
import type { WeaveEngineFeedItem } from "@/app/_contexts/weave-engine-context";
import type { ReasoningActionItem } from "@/app/_services/engine-service/reasonings.schema";
import type { TranslationKeys } from "@/app/_i18n/locales/pt-BR";
import { cn } from "@/lib/utils";
import {
  engineFeedItemClass,
  engineIconActionClass,
} from "@/app/(protected)/[orgId]/weave-engine/_components/engine-styles";
import {
  formatRelativeTime,
  getReasoningTypeLabel,
  interpolate,
} from "@/app/(protected)/[orgId]/home/_components/engine-utils";

type EngineCopy = TranslationKeys["home"]["engine"];

export type ReasoningFeedItemProps = {
  item: WeaveEngineFeedItem;
  expanded: boolean;
  actionItems: ReasoningActionItem[];
  locale: string;
  copy: EngineCopy;
  onRead: () => void;
  onToggleExpand: () => void;
  onTogglePinned: () => void;
  onDismiss: () => void;
  onToggleActionItem: (itemId: string, completed: boolean) => void;
};

export function ReasoningFeedItem({
  item,
  expanded,
  actionItems,
  locale,
  copy,
  onRead,
  onToggleExpand,
  onTogglePinned,
  onDismiss,
  onToggleActionItem,
}: ReasoningFeedItemProps) {
  const typeLabel = getReasoningTypeLabel(item.reasoning_type, copy.reasoningTypes);
  const relativeTime = formatRelativeTime(item.created_at || item.updated_at, locale);

  const metaParts: string[] = [item.projectName];
  if (item.sprint_title) metaParts.push(item.sprint_title);
  metaParts.push(typeLabel);
  if (relativeTime) metaParts.push(relativeTime);
  if (typeof item.action_items_count === "number" && item.action_items_count > 0) {
    metaParts.push(interpolate(copy.actionItemsCount, { count: item.action_items_count }));
  }
  if (!item.is_read) metaParts.push(copy.unread);
  else metaParts.push(copy.read);
  if (item.safety_label && item.safety_label !== "safe") metaParts.push(copy.reviewSuggested);
  if (item.is_pinned) metaParts.push(copy.pinned);

  const completedCount = actionItems.filter((it) => it.is_completed).length;
  const showProgress = expanded && actionItems.length > 0;

  return (
    <article className={engineFeedItemClass}>
      <div className="flex gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <button type="button" onClick={onRead} className="block w-full text-left">
            <h3 className="line-clamp-2 text-sm leading-snug font-medium text-neutral-900 transition-colors hover:text-neutral-700 dark:text-neutral-100 dark:hover:text-neutral-300">
              {item.title}
            </h3>
          </button>

          <p className="mt-1 truncate text-[11px] font-normal text-neutral-500 dark:text-neutral-400">
            {metaParts.join(" · ")}
          </p>

          {showProgress && (
            <p className="mt-1 text-[10px] font-normal text-neutral-400 dark:text-neutral-500">
              {interpolate(copy.actionItemsProgress, {
                done: completedCount,
                total: actionItems.length,
              })}
            </p>
          )}

          {expanded && (
            <div className="mt-2 space-y-1.5">
              {actionItems.length === 0 ? (
                <p className="text-[11px] font-normal text-neutral-500 dark:text-neutral-400">
                  {copy.noActionItems}
                </p>
              ) : (
                actionItems.map((it) => (
                  <label
                    key={it.id}
                    className="flex cursor-pointer items-start gap-2 text-[12px] font-normal"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-neutral-500"
                      checked={Boolean(it.is_completed)}
                      onChange={(e) => onToggleActionItem(it.id, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "text-neutral-700 dark:text-neutral-300",
                          it.is_completed && "line-through opacity-50"
                        )}
                      >
                        {it.content}
                      </span>
                      {it.assigned_to_name ? (
                        <span className="mt-0.5 block text-[10px] text-neutral-400 dark:text-neutral-500">
                          {interpolate(copy.assignedTo, { name: it.assigned_to_name })}
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-start gap-0.5 pt-0.5">
          <button
            type="button"
            onClick={onRead}
            className={cn(engineIconActionClass, "sm:order-last")}
            title={copy.readInsight}
            aria-label={copy.readInsight}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className={engineIconActionClass}
            title={expanded ? copy.collapseActions : copy.expandActions}
            aria-label={expanded ? copy.collapseActions : copy.expandActions}
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
            />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePinned();
            }}
            className={engineIconActionClass}
            title={item.is_pinned ? copy.unpin : copy.pin}
            aria-label={item.is_pinned ? copy.unpin : copy.pin}
          >
            {item.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className={engineIconActionClass}
            title={copy.dismiss}
            aria-label={copy.dismiss}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
