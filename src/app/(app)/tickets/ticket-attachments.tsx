"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { apiBlob, apiRequest, apiUpload, ApiClientError } from "@/lib/client/api";
import {
  IMAGE_MAX_BYTES,
  MAX_ATTACHMENTS_PER_TICKET,
  VIDEO_MAX_BYTES,
  resolveAttachmentKind,
} from "@/lib/attachments/rules";
import type { PublicAttachment } from "@/types/attachment";
import { CloseIcon } from "../action-icons";
import styles from "../page-shared.module.css";

type AttachmentsPayload = { attachments: PublicAttachment[] };
type AttachmentPayload = { attachment: PublicAttachment };

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function AuthMedia({
  url,
  kind,
  fileName,
  mimeType,
}: {
  url: string;
  kind: PublicAttachment["kind"];
  fileName: string;
  mimeType: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setSrc(null);

    void (async () => {
      try {
        const blob = await apiBlob(url, mimeType);
        if (cancelled) return;

        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }

        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;
        setSrc(objectUrl);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setSrc(null);
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, mimeType]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  function openMedia() {
    if (!src) return;
    window.open(src, "_blank", "noopener,noreferrer");
  }

  if (status === "loading") {
    return <div className={styles.attachmentPlaceholder}>Carregando…</div>;
  }

  if (status === "error" || !src) {
    return <div className={styles.attachmentPlaceholder}>Falha ao carregar o anexo.</div>;
  }

  return (
    <button
      type="button"
      className={styles.attachmentOpenButton}
      onClick={openMedia}
      title={`Abrir ${fileName}`}
      aria-label={`Abrir ${fileName}`}
    >
      {kind === "VIDEO" ? (
        <video className={styles.attachmentMedia} src={src} muted preload="metadata" />
      ) : (
        <img className={styles.attachmentMedia} src={src} alt={fileName} />
      )}
      <span className={styles.attachmentOpenHint}>Abrir</span>
    </button>
  );
}

export function PendingFilesList({
  files,
  onRemove,
}: {
  files: File[];
  onRemove: (index: number) => void;
}) {
  if (files.length === 0) return null;

  return (
    <ul className={styles.pendingFiles}>
      {files.map((file, index) => (
        <li key={`${file.name}-${file.size}-${index}`}>
          <span>
            {file.name} · {formatBytes(file.size)}
          </span>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
            onClick={() => onRemove(index)}
            title="Remover"
            aria-label={`Remover ${file.name}`}
          >
            <CloseIcon />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function AttachmentFileInput({
  id,
  disabled,
  remainingSlots,
  onAdd,
  onError,
}: {
  id: string;
  disabled?: boolean;
  remainingSlots: number;
  onAdd: (files: File[]) => void;
  onError: (message: string) => void;
}) {
  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length === 0) return;

    if (selected.length > remainingSlots) {
      onError(`Limite de ${MAX_ATTACHMENTS_PER_TICKET} anexos por chamado.`);
      return;
    }

    const accepted: File[] = [];
    for (const file of selected) {
      try {
        const kind = resolveAttachmentKind(file.type || "application/octet-stream");
        const limit = kind === "IMAGE" ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES;
        if (file.size > limit) {
          onError(
            kind === "IMAGE"
              ? `Imagem "${file.name}" ultrapassa 5 MB.`
              : `Vídeo "${file.name}" ultrapassa 50 MB.`,
          );
          return;
        }
        accepted.push(file);
      } catch {
        onError(`Tipo não suportado: ${file.name}. Use JPEG, PNG, WebP, GIF, MP4 ou WebM.`);
        return;
      }
    }

    onAdd(accepted);
  }

  return (
    <div className="field">
      <label htmlFor={id}>Anexos (imagem ou vídeo)</label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
        multiple
        disabled={disabled || remainingSlots <= 0}
        onChange={onChange}
      />
      <p className="muted">
        Imagem até 5 MB · Vídeo até 50 MB · até {MAX_ATTACHMENTS_PER_TICKET} por chamado
      </p>
    </div>
  );
}

export function TicketAttachmentGallery({
  ticketId,
  canEdit,
  onError,
}: {
  ticketId: string;
  canEdit: boolean;
  onError: (message: string) => void;
}) {
  const [attachments, setAttachments] = useState<PublicAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const result = await apiRequest<AttachmentsPayload>(`/api/tickets/${ticketId}/attachments`);
      setAttachments(result.attachments);
    } catch (err) {
      onError(err instanceof ApiClientError ? err.message : "Falha ao carregar anexos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function uploadFiles(files: File[]) {
    setBusy(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        await apiUpload<AttachmentPayload>(`/api/tickets/${ticketId}/attachments`, formData);
      }
      await refresh();
    } catch (err) {
      onError(err instanceof ApiClientError ? err.message : "Falha ao enviar anexo");
    } finally {
      setBusy(false);
    }
  }

  async function removeAttachment(attachmentId: string) {
    setBusy(true);
    try {
      await apiRequest(`/api/tickets/${ticketId}/attachments/${attachmentId}`, { method: "DELETE" });
      setAttachments((current) => current.filter((item) => item.id !== attachmentId));
    } catch (err) {
      onError(err instanceof ApiClientError ? err.message : "Falha ao remover anexo");
    } finally {
      setBusy(false);
    }
  }

  const remaining = MAX_ATTACHMENTS_PER_TICKET - attachments.length;

  return (
    <div className={styles.attachmentSection}>
      <div className={styles.sectionHead}>
        <h3>Anexos</h3>
      </div>

      {loading ? <p className="muted">Carregando anexos…</p> : null}

      {!loading && attachments.length === 0 ? (
        <p className="muted">Nenhum anexo neste chamado.</p>
      ) : null}

      {attachments.length > 0 ? (
        <ul className={styles.attachmentGrid}>
          {attachments.map((attachment) => (
            <li key={attachment.id} className={styles.attachmentCard}>
              {canEdit ? (
                <button
                  type="button"
                  className={`${styles.iconBtn} ${styles.iconBtnDanger} ${styles.attachmentRemove}`}
                  disabled={busy}
                  onClick={() => void removeAttachment(attachment.id)}
                  title="Remover anexo"
                  aria-label={`Remover ${attachment.fileName}`}
                >
                  <CloseIcon />
                </button>
              ) : null}
              <AuthMedia
                url={attachment.url}
                kind={attachment.kind}
                fileName={attachment.fileName}
                mimeType={attachment.mimeType}
              />
              <div className={styles.attachmentMeta}>
                <strong title={attachment.fileName}>{attachment.fileName}</strong>
                <span className="muted">
                  {attachment.kind === "IMAGE" ? "Imagem" : "Vídeo"} · {formatBytes(attachment.sizeBytes)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {canEdit ? (
        <AttachmentFileInput
          id={`attach-${ticketId}`}
          disabled={busy}
          remainingSlots={remaining}
          onAdd={(files) => void uploadFiles(files)}
          onError={onError}
        />
      ) : null}
    </div>
  );
}

export async function uploadPendingFiles(ticketId: string, files: File[]): Promise<void> {
  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);
    await apiUpload<AttachmentPayload>(`/api/tickets/${ticketId}/attachments`, formData);
  }
}
