"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  CornerDownRight,
  Download,
  FileText,
  Loader2,
  MessageCircle,
  Pencil,
  Paperclip,
  RefreshCw,
  Send,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/app/_contexts/auth-context";
import { useNoteComments } from "@/app/_contexts/note-comments-context";
import {
  buildCommentContentFromPlainText,
  getPlainTextFromCommentContent,
  type NoteComment,
  type NoteCommentFile,
} from "@/app/_services/notes-comments-service/notes-comments-service";
import type { User as MentionUser } from "@/app/_services/notes-service/notes-service";
import getStorageUrl from "@/app/_utils/get-storage-url";

function formatCommentDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

type CommentNode = NoteComment & { replies: CommentNode[] };

function buildCommentTree(flat: NoteComment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  flat.forEach((c) => {
    map.set(c.id, { ...c, replies: [] });
  });
  const roots: CommentNode[] = [];
  const sortByTime = (a: NoteComment, b: NoteComment) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

  flat.forEach((c) => {
    const node = map.get(c.id)!;
    const pid = c.parent_id || null;
    if (pid && map.has(pid)) {
      map.get(pid)!.replies.push(node);
    } else {
      roots.push(node);
    }
  });
  roots.sort(sortByTime);
  roots.forEach((r) => r.replies.sort(sortByTime));
  return roots;
}

function parseFiles(raw: unknown): NoteCommentFile[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (f): f is NoteCommentFile =>
      !!f &&
      typeof f === "object" &&
      typeof (f as NoteCommentFile).id === "string" &&
      typeof (f as NoteCommentFile).path === "string"
  );
}

/** Tokens `@[rótulo](user:id)` e `@[nome](note-file:id)` salvos no texto do comentário. */
const COMMENT_MENTION_TOKEN_RE = /@\[(.+?)\]\((user|note-file):([^)]+)\)/g;

function sanitizeMentionLabel(raw: string): string {
  const t = raw.replace(/[\[\]]/g, "").trim();
  return t || "Usuário";
}

function makeUserMentionToken(u: MentionUser): string {
  const label = sanitizeMentionLabel(u.name ?? u.username ?? u.email);
  return `@[${label}](user:${u.id})`;
}

function makeNoteFileMentionToken(f: NoteCommentsEmbeddableFile): string {
  const label = sanitizeMentionLabel(f.name || "arquivo");
  return `@[${label}](note-file:${f.id})`;
}

function getAtMentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const left = text.slice(0, caret);
  const at = left.lastIndexOf("@");
  if (at < 0) {
    return null;
  }
  const after = left.slice(at + 1);
  if (after.includes("]")) {
    return null;
  }
  if (/^\s/.test(after)) {
    return null;
  }
  return { start: at, query: after };
}

export interface NoteCommentsEmbeddableFile {
  id: string;
  name: string;
  path: string;
  type?: string;
}

type AtMenuState = { field: "draft" | "edit"; start: number; query: string } | null;

type AtPickItem =
  | { type: "file"; file: NoteCommentsEmbeddableFile }
  | { type: "user"; user: MentionUser };

function CommentRichText({
  text,
  noteFiles,
}: {
  text: string;
  noteFiles: NoteCommentsEmbeddableFile[];
}) {
  const fileById = useMemo(() => new Map(noteFiles.map((f) => [f.id, f])), [noteFiles]);
  if (!text.includes("@[")) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }
  const nodes: React.ReactNode[] = [];
  const re = new RegExp(COMMENT_MENTION_TOKEN_RE.source, "g");
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(text.slice(last, m.index));
    }
    const [, label, kind, id] = m;
    if (kind === "user") {
      nodes.push(
        <span
          key={`m-${k++}`}
          className="font-medium text-amber-800 dark:text-amber-200"
          title="Menção"
        >
          @{sanitizeMentionLabel(label)}
        </span>
      );
    } else {
      const f = fileById.get(id);
      const href = f?.path ? getStorageUrl(f.path) : undefined;
      if (href) {
        nodes.push(
          <a
            key={`m-${k++}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sky-700 underline decoration-sky-700/40 underline-offset-2 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-200"
          >
            @{sanitizeMentionLabel(label)}
          </a>
        );
      } else {
        nodes.push(
          <span key={`m-${k++}`} className="text-neutral-500 italic dark:text-neutral-400">
            @{sanitizeMentionLabel(label)}
          </span>
        );
      }
    }
    last = re.lastIndex;
  }
  if (last < text.length) {
    nodes.push(text.slice(last));
  }
  return <span className="whitespace-pre-wrap">{nodes}</span>;
}

function CommentComposerTextarea({
  field,
  value,
  onChangeValue,
  activeAt,
  setActiveAt,
  atItems,
  mentionHighlightIdx,
  setMentionHighlightIdx,
  onPickItem,
  searchMentionUsers,
  remoteMentionLoading,
  textareaRef,
  ...textareaProps
}: Omit<
  React.ComponentProps<"textarea">,
  "value" | "onChange" | "onSelect" | "onBlur" | "onKeyDown" | "ref"
> & {
  field: "draft" | "edit";
  value: string;
  onChangeValue: (v: string) => void;
  activeAt: AtMenuState;
  setActiveAt: React.Dispatch<React.SetStateAction<AtMenuState>>;
  atItems: AtPickItem[];
  mentionHighlightIdx: number;
  setMentionHighlightIdx: React.Dispatch<React.SetStateAction<number>>;
  onPickItem: (item: AtPickItem) => void;
  searchMentionUsers?: (query: string) => Promise<MentionUser[]>;
  remoteMentionLoading: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const syncAt = (text: string, caret: number) => {
    const q = getAtMentionQuery(text, caret);
    if (!q) {
      setActiveAt(null);
    } else {
      setActiveAt({ field, start: q.start, query: q.query });
    }
  };

  const tryPick = useCallback(() => {
    if (atItems.length === 0) {
      return false;
    }
    const item = atItems[Math.min(mentionHighlightIdx, atItems.length - 1)];
    if (item) {
      onPickItem(item);
    }
    return true;
  }, [atItems, mentionHighlightIdx, onPickItem]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!activeAt || activeAt.field !== field) {
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setActiveAt(null);
      return;
    }
    if (atItems.length === 0) {
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionHighlightIdx((i) => Math.min(i + 1, atItems.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionHighlightIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      tryPick();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      tryPick();
      return;
    }
  };

  const showMenu = Boolean(activeAt?.field === field);
  const needsOrgHint = Boolean(
    searchMentionUsers && activeAt?.field === field && activeAt.query.trim().length < 3
  );
  const showEmptyHint = showMenu && atItems.length === 0 && !remoteMentionLoading && !needsOrgHint;

  return (
    <div className="relative">
      <textarea
        {...textareaProps}
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChangeValue(e.target.value);
          syncAt(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onSelect={(e) => {
          const ta = e.target as HTMLTextAreaElement;
          syncAt(ta.value, ta.selectionStart ?? ta.value.length);
        }}
        onBlur={() => {
          window.setTimeout(() => setActiveAt(null), 180);
        }}
        onKeyDown={onKeyDown}
      />
      {showMenu &&
        (atItems.length > 0 || needsOrgHint || remoteMentionLoading || showEmptyHint) && (
          <div
            className="absolute right-0 bottom-full z-20 mb-1 max-h-52 w-full overflow-y-auto rounded-md border border-neutral-200 bg-white py-1 text-left text-xs shadow-lg dark:border-surface-dark-border-strong dark:bg-[#1d1d1b]"
            role="listbox"
          >
            {remoteMentionLoading && (
              <div className="flex items-center gap-2 px-2 py-1.5 text-neutral-500">
                <Loader2 size={12} className="animate-spin" /> Buscando…
              </div>
            )}
            {needsOrgHint && (
              <p className="border-b border-neutral-100 px-2 py-1.5 text-[11px] text-neutral-500 dark:border-surface-dark-border dark:text-neutral-400">
                Digite pelo menos 3 caracteres após @ para buscar pessoas na organização.
              </p>
            )}
            {atItems.map((item, idx) => (
              <button
                key={item.type === "file" ? `f-${item.file.id}` : `u-${item.user.id}`}
                type="button"
                role="option"
                aria-selected={idx === mentionHighlightIdx ? "true" : "false"}
                className={`flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                  idx === mentionHighlightIdx ? "bg-neutral-100 dark:bg-neutral-800" : ""
                }`}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => onPickItem(item)}
                onMouseEnter={() => setMentionHighlightIdx(idx)}
              >
                {item.type === "file" ? (
                  <>
                    <FileText size={14} className="flex-shrink-0 text-sky-600 dark:text-sky-400" />
                    <span className="min-w-0 truncate">{item.file.name}</span>
                    <span className="flex-shrink-0 text-[10px] text-neutral-400">
                      Arquivo da tarefa
                    </span>
                  </>
                ) : (
                  <>
                    <UserRound
                      size={14}
                      className="flex-shrink-0 text-amber-600 dark:text-amber-400"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {item.user.name?.trim() || item.user.username}
                      <span className="block truncate text-[10px] font-normal text-neutral-500">
                        {item.user.email}
                      </span>
                    </span>
                  </>
                )}
              </button>
            ))}
            {showEmptyHint && (
              <p className="px-2 py-1.5 text-[11px] text-neutral-400">
                Nenhuma opção para esta busca.
              </p>
            )}
          </div>
        )}
    </div>
  );
}

export function NoteCommentsSidebarTrigger({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const { comments } = useNoteComments();
  const count = comments.length;

  const label = "Ver ou criar comentários";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      title={open ? "Fechar comentários" : label}
      aria-label={open ? "Fechar comentários" : label}
      className={`relative flex w-full max-w-full min-w-0 items-center gap-2 rounded-md py-1.5 pr-2 pl-1.5 text-left transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
        open
          ? "dark:text-brand-primary-500 text-yellow-600"
          : "text-neutral-500 dark:text-neutral-400"
      }`}
    >
      <span className="relative inline-flex h-8 w-8 flex-shrink-0 items-center justify-center">
        <MessageCircle size={15} />
        {count > 0 && (
          <span className="dark:bg-brand-primary-500 absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-yellow-600 px-0.5 text-[9px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
      <span className="min-w-0 truncate text-[11px] leading-snug font-medium sm:max-w-[15rem] sm:text-xs">
        {open ? "Fechar comentários" : label}
      </span>
    </button>
  );
}

export interface NoteCommentsSidebarProps {
  canComment: boolean;
  onClose: () => void;
  /** Busca pessoas na organização ao digitar @ (não fica limitado a colaboradores da tarefa). */
  searchMentionUsers?: (query: string) => Promise<MentionUser[]>;
  /** Arquivos anexados à tarefa para embutir no texto com @. */
  embeddableNoteFiles?: NoteCommentsEmbeddableFile[];
}

export function NoteCommentsSidebar({
  canComment,
  onClose,
  searchMentionUsers,
  embeddableNoteFiles = [],
}: NoteCommentsSidebarProps) {
  const { user } = useAuth();
  const {
    comments,
    createComment,
    deleteComment,
    error,
    loading,
    refreshComments,
    updateComment,
    uploadAttachments,
  } = useNoteComments();

  const [draft, setDraft] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<NoteComment | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editFiles, setEditFiles] = useState<NoteCommentFile[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const draftTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [activeAt, setActiveAt] = useState<AtMenuState>(null);
  const [mentionHighlightIdx, setMentionHighlightIdx] = useState(0);
  const [remoteMentionUsers, setRemoteMentionUsers] = useState<MentionUser[]>([]);
  const [remoteMentionLoading, setRemoteMentionLoading] = useState(false);

  useEffect(() => {
    setMentionHighlightIdx(0);
  }, [activeAt?.field, activeAt?.start, activeAt?.query]);

  useEffect(() => {
    if (!activeAt || !searchMentionUsers) {
      setRemoteMentionUsers([]);
      setRemoteMentionLoading(false);
      return;
    }
    const q = activeAt.query.trim();
    if (q.length < 3) {
      setRemoteMentionUsers([]);
      setRemoteMentionLoading(false);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      setRemoteMentionLoading(true);
      void searchMentionUsers(q)
        .then((rows) => {
          if (!cancelled) {
            setRemoteMentionUsers(Array.isArray(rows) ? rows : []);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setRemoteMentionUsers([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setRemoteMentionLoading(false);
          }
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [activeAt, searchMentionUsers]);

  const atItems = useMemo((): AtPickItem[] => {
    if (!activeAt) {
      return [];
    }
    const q = activeAt.query.toLowerCase();
    const files = embeddableNoteFiles
      .filter((f) => (f.name || "").toLowerCase().includes(q))
      .slice(0, 12)
      .map((file) => ({ type: "file" as const, file }));
    const out: AtPickItem[] = [...files];
    if (searchMentionUsers && activeAt.query.trim().length >= 3) {
      for (const u of remoteMentionUsers.slice(0, 12)) {
        out.push({ type: "user", user: u });
      }
    }
    return out;
  }, [activeAt, embeddableNoteFiles, remoteMentionUsers, searchMentionUsers]);

  const insertAtPick = useCallback(
    (field: "draft" | "edit", item: AtPickItem) => {
      const ta = field === "draft" ? draftTextareaRef.current : editTextareaRef.current;
      const text = field === "draft" ? draft : editDraft;
      if (!ta || !activeAt || activeAt.field !== field) {
        return;
      }
      const token =
        item.type === "file"
          ? makeNoteFileMentionToken(item.file)
          : makeUserMentionToken(item.user);
      const before = text.slice(0, activeAt.start);
      const after = text.slice(ta.selectionStart);
      const next = `${before}${token} ${after}`;
      const caret = before.length + token.length + 1;
      if (field === "draft") {
        setDraft(next);
      } else {
        setEditDraft(next);
      }
      setActiveAt(null);
      window.requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(caret, caret);
      });
    },
    [activeAt, draft, editDraft]
  );

  const tree = React.useMemo(() => buildCommentTree(comments), [comments]);

  const handlePickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (list?.length) {
      setPendingFiles((prev) => [...prev, ...Array.from(list)].slice(0, 10));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text && pendingFiles.length === 0) {
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      let uploadedMeta: NoteCommentFile[] = [];
      if (pendingFiles.length > 0) {
        uploadedMeta = await uploadAttachments(pendingFiles);
      }
      await createComment({
        content: text ? buildCommentContentFromPlainText(text) : undefined,
        files: uploadedMeta.length ? uploadedMeta : undefined,
        parent_id: replyingTo?.id ?? null,
      });
      setDraft("");
      setPendingFiles([]);
      setReplyingTo(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao publicar");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (c: NoteComment) => {
    setEditingId(c.id);
    setEditDraft(getPlainTextFromCommentContent(c.content));
    setEditFiles(parseFiles(c.files));
    setActionError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
    setEditFiles([]);
  };

  const handleEditPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length || !editingId) {
      return;
    }
    const picked = Array.from(list);
    void (async () => {
      setEditSubmitting(true);
      setActionError(null);
      try {
        const uploaded = await uploadAttachments(picked);
        setEditFiles((prev) => [...prev, ...uploaded].slice(0, 10));
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Erro no upload");
      } finally {
        setEditSubmitting(false);
      }
      if (editFileInputRef.current) {
        editFileInputRef.current.value = "";
      }
    })();
  };

  const saveEdit = async () => {
    if (!editingId) {
      return;
    }
    const text = editDraft.trim();
    if (!text && editFiles.length === 0) {
      setActionError("Texto ou pelo menos um anexo é obrigatório");
      return;
    }
    setEditSubmitting(true);
    setActionError(null);
    try {
      await updateComment(editingId, {
        content: buildCommentContentFromPlainText(text),
        files: editFiles,
      });
      cancelEdit();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao atualizar");
    } finally {
      setEditSubmitting(false);
    }
  };

  const removeEditFile = (id: string) => {
    setEditFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const renderComment = (c: CommentNode, depth: number) => {
    const body = getPlainTextFromCommentContent(c.content);
    const displayName = c.user_name?.trim() || c.user_username?.trim() || "Colaborador";
    const isOwn = Boolean(user?.id && c.user_id === user.id);
    const files = parseFiles(c.files);
    const isEditing = editingId === c.id;

    return (
      <li
        key={c.id}
        className={
          depth > 0
            ? "dark:border-brand-primary-700/30 mt-3 border-l-2 border-yellow-500/25 pl-3"
            : ""
        }
      >
        <div className="rounded-lg border border-neutral-200 bg-neutral-50/90 px-3 py-3 dark:border-surface-dark-border dark:bg-[#1d1d1b]/50">
          <div className="flex items-start gap-2.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200">
              {c.user_avatar_url ? (
                <Image
                  src={getStorageUrl(c.user_avatar_url)}
                  alt=""
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-xs font-medium text-neutral-800 dark:text-neutral-100">
                  {displayName}
                </span>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                  {formatCommentDate(c.created_at)}
                </span>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <CommentComposerTextarea
                    field="edit"
                    value={editDraft}
                    onChangeValue={setEditDraft}
                    activeAt={activeAt}
                    setActiveAt={setActiveAt}
                    atItems={atItems}
                    mentionHighlightIdx={mentionHighlightIdx}
                    setMentionHighlightIdx={setMentionHighlightIdx}
                    onPickItem={(item) => insertAtPick("edit", item)}
                    searchMentionUsers={searchMentionUsers}
                    remoteMentionLoading={remoteMentionLoading}
                    textareaRef={editTextareaRef}
                    rows={3}
                    aria-label="Editar texto do comentário"
                    className="w-full resize-y rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm dark:border-surface-dark-border-strong dark:bg-[#1d1d1b]"
                  />
                  <input
                    ref={editFileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleEditPickFiles}
                  />
                  {editFiles.length > 0 && (
                    <ul className="flex flex-wrap gap-1 text-[11px]">
                      {editFiles.map((f) => (
                        <li
                          key={f.id}
                          className="flex items-center gap-1 rounded border border-neutral-200 px-1.5 py-0.5 dark:border-surface-dark-border-strong"
                        >
                          <span className="max-w-[120px] truncate">{f.name}</span>
                          <button
                            type="button"
                            className="text-neutral-400 hover:text-red-500"
                            onClick={() => removeEditFile(f.id)}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={editSubmitting || editFiles.length >= 10}
                      className="inline-flex items-center gap-1 rounded border border-neutral-200 px-2 py-1 text-[11px] dark:border-surface-dark-border-strong"
                    >
                      <Paperclip size={12} /> Anexo
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveEdit()}
                      disabled={editSubmitting}
                      className="dark:bg-brand-primary-500 rounded bg-yellow-600 px-2 py-1 text-[11px] font-medium text-white"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded px-2 py-1 text-[11px] text-neutral-500"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {body ? (
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                      <CommentRichText text={body} noteFiles={embeddableNoteFiles} />
                    </p>
                  ) : (
                    <p className="text-xs text-neutral-400 italic dark:text-neutral-500">
                      (sem texto)
                    </p>
                  )}
                  {files.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {files.map((f) => (
                        <li key={f.id}>
                          <a
                            href={getStorageUrl(f.path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="dark:hover:text-brand-primary-500 inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] text-neutral-600 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-300"
                          >
                            <span className="max-w-[120px] truncate">{f.name}</span>
                            <Download size={10} />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
            {!isEditing && (
              <div className="flex flex-shrink-0 flex-col gap-0.5">
                {canComment && (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(c);
                      setEditingId(null);
                    }}
                    className="dark:hover:text-brand-primary-500 rounded-md p-1.5 text-neutral-400 hover:bg-neutral-200 hover:text-yellow-700 dark:hover:bg-neutral-800"
                    title="Responder"
                  >
                    <CornerDownRight size={14} />
                  </button>
                )}
                {isOwn && (
                  <>
                    <button
                      type="button"
                      onClick={() => startEdit(c)}
                      className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-200 hover:text-yellow-700 dark:hover:bg-neutral-800"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteComment(c.id)}
                      className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        {c.replies.length > 0 && (
          <ul className="mt-2 space-y-0">
            {c.replies.map((r) => (
              <React.Fragment key={r.id}>{renderComment(r, depth + 1)}</React.Fragment>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-[#1d1d1b]">
      <div className="flex flex-shrink-0 items-center justify-between gap-2 rounded-md border border-neutral-200 px-3 py-1 dark:border-surface-dark-border">
        <div className="flex min-w-0 items-center gap-2">
          <MessageCircle
            size={16}
            className="dark:text-brand-primary-500 flex-shrink-0 text-yellow-600"
          />
          <h2 className="truncate text-sm text-neutral-900 dark:text-neutral-100">Comentários</h2>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => void refreshComments({ silent: true })}
            className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title="Atualizar"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title="Fechar painel"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {error && (
          <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        )}
        {actionError && (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            {actionError}
          </p>
        )}

        {!comments.length && !loading && (
          <p className="mb-4 text-center text-xs text-neutral-400 dark:text-neutral-500">
            Nenhum comentário ainda.
          </p>
        )}

        <ul className="space-y-3">{tree.map((c) => renderComment(c, 0))}</ul>
      </div>

      {canComment && (
        <div className="flex-shrink-0 border-t border-neutral-200 bg-neutral-50/80 px-3 py-3 dark:border-surface-dark-border dark:bg-[#1d1d1b]/30">
          {replyingTo && (
            <div className="dark:border-brand-primary-700/40 dark:bg-brand-primary-500/10 mb-2 flex items-center justify-between gap-2 rounded-md border border-yellow-500/30 bg-yellow-50/80 px-2 py-1.5 text-[11px]">
              <span className="truncate text-neutral-700 dark:text-neutral-200">
                Respondendo a{" "}
                <strong>
                  {replyingTo.user_name?.trim() || replyingTo.user_username?.trim() || "comentário"}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="flex-shrink-0 rounded p-0.5 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800"
              >
                <X size={14} />
              </button>
            </div>
          )}
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2">
            <CommentComposerTextarea
              field="draft"
              value={draft}
              onChangeValue={setDraft}
              activeAt={activeAt}
              setActiveAt={setActiveAt}
              atItems={atItems}
              mentionHighlightIdx={mentionHighlightIdx}
              setMentionHighlightIdx={setMentionHighlightIdx}
              onPickItem={(item) => insertAtPick("draft", item)}
              searchMentionUsers={searchMentionUsers}
              remoteMentionLoading={remoteMentionLoading}
              textareaRef={draftTextareaRef}
              aria-label="Novo comentário"
              placeholder={
                replyingTo
                  ? "Sua resposta… (@ para mencionar ou anexar arquivo da tarefa)"
                  : "Escreva um comentário… (@ para mencionar ou anexar arquivo da tarefa)"
              }
              rows={3}
              className="w-full resize-y rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-yellow-500 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-100"
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handlePickFiles}
            />
            {pendingFiles.length > 0 && (
              <ul className="flex flex-wrap gap-1 text-[11px] text-neutral-500">
                {pendingFiles.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center gap-1 rounded border border-neutral-200 px-1.5 py-0.5 dark:border-surface-dark-border-strong"
                  >
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <button
                      type="button"
                      className="text-neutral-400 hover:text-red-500"
                      onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting || pendingFiles.length >= 10}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs dark:border-surface-dark-border-strong"
              >
                <Paperclip size={14} /> Anexar
              </button>
              <button
                type="submit"
                disabled={submitting || (!draft.trim() && pendingFiles.length === 0)}
                className="dark:bg-brand-primary-500 inline-flex items-center gap-1 rounded-md bg-yellow-600 px-2.5 py-1.5 text-xs text-white disabled:opacity-50"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {replyingTo ? "Responder" : "Publicar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
