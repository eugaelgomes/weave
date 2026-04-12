"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import {
  CornerDownRight,
  Download,
  Loader2,
  MessageCircle,
  Pencil,
  Paperclip,
  RefreshCw,
  Send,
  Trash2,
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

export function NoteCommentsSidebarTrigger({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const { comments } = useNoteComments();
  const count = comments.length;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      title={open ? "Fechar comentários" : "Abrir comentários"}
      className={`relative flex h-8 w-8 items-center justify-center rounded-md transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
        open
          ? "dark:text-brand-primary-700 text-yellow-600"
          : "text-neutral-500 dark:text-neutral-400"
      }`}
    >
      <MessageCircle size={15} />
      {count > 0 && (
        <span className="dark:bg-brand-primary-700 absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-yellow-600 px-0.5 text-[9px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

export interface NoteCommentsSidebarProps {
  canComment: boolean;
  onClose: () => void;
}

export function NoteCommentsSidebar({ canComment, onClose }: NoteCommentsSidebarProps) {
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
        <div className="rounded-lg border border-neutral-200 bg-neutral-50/90 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="flex items-start gap-2.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-xs font-semibold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200">
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
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    rows={3}
                    className="w-full resize-y rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
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
                          className="flex items-center gap-1 rounded border border-neutral-200 px-1.5 py-0.5 dark:border-neutral-700"
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
                      className="inline-flex items-center gap-1 rounded border border-neutral-200 px-2 py-1 text-[11px] dark:border-neutral-700"
                    >
                      <Paperclip size={12} /> Anexo
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveEdit()}
                      disabled={editSubmitting}
                      className="dark:bg-brand-primary-700 rounded bg-yellow-600 px-2 py-1 text-[11px] font-medium text-white"
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
                    <p className="text-sm whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                      {body}
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
                            className="dark:hover:text-brand-primary-700 inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] text-neutral-600 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300"
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
                    className="dark:hover:text-brand-primary-700 rounded-md p-1.5 text-neutral-400 hover:bg-neutral-200 hover:text-yellow-700 dark:hover:bg-neutral-800"
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
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-neutral-950">
      <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
        <div className="flex min-w-0 items-center gap-2">
          <MessageCircle
            size={16}
            className="dark:text-brand-primary-700 flex-shrink-0 text-yellow-600"
          />
          <h2 className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Comentários
          </h2>
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
        <div className="flex-shrink-0 border-t border-neutral-200 bg-neutral-50/80 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-900/30">
          {replyingTo && (
            <div className="dark:border-brand-primary-700/40 dark:bg-brand-primary-700/10 mb-2 flex items-center justify-between gap-2 rounded-md border border-yellow-500/30 bg-yellow-50/80 px-2 py-1.5 text-[11px]">
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
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={replyingTo ? "Sua resposta…" : "Escreva um comentário…"}
              rows={3}
              className="w-full resize-y rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-yellow-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
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
                    className="flex items-center gap-1 rounded border border-neutral-200 px-1.5 py-0.5 dark:border-neutral-700"
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
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs dark:border-neutral-700"
              >
                <Paperclip size={14} /> Anexar
              </button>
              <button
                type="submit"
                disabled={submitting || (!draft.trim() && pendingFiles.length === 0)}
                className="dark:bg-brand-primary-700 inline-flex items-center gap-1 rounded-md bg-yellow-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
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
