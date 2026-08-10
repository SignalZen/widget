import { useCallback, useRef, useState } from "react";
import { ArrowRightIcon, CameraIcon, FileIcon, ImageIcon, PlusIcon, XIcon } from "../icons";
import { useSession } from "../SessionProvider";
import { useBackend } from "../useSignalzenBackend";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type LocalFile = {
  id: string;
  file: File;
  sizeError?: boolean;
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ file }: { file: File }) {
  if (file.type.startsWith("image/")) return <ImageIcon />;
  return <FileIcon />;
}

export function AttachmentsScreen({ onBack }: { onBack: () => void }) {
  const { sendWithFiles } = useBackend();
  const { translation } = useSession();

  const [files, setFiles] = useState<LocalFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const next: LocalFile[] = Array.from(incoming).map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      sizeError: file.size > MAX_FILE_SIZE,
    }));
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.file.name));
      return [...prev, ...next.filter((f) => !existingNames.has(f.file.name))];
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const validFiles = files.filter((f) => !f.sizeError);
  const canAttach = validFiles.length > 0 && !uploading;

  const handleAttach = async () => {
    if (!canAttach) return;
    setUploading(true);
    setProgress(0);
    setUploadError(null);
    try {
      await sendWithFiles(
        validFiles.map((f) => f.file),
        (pct) => setProgress(pct),
      );
      onBack();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : translation.chat_attach_upload_error);
      setUploading(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto scrollbar-thin px-5 py-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {translation.chat_attach_title}
          </h2>
          <p className="text-sm text-muted-foreground">{translation.chat_attach_subtitle}</p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragging ? "border-accent bg-accent/5" : "border-border bg-subtle/40 hover:bg-subtle/60"
          }`}
        >
          <div
            className={`grid h-10 w-10 place-items-center rounded-xl border border-border bg-card ${dragging ? "text-accent" : "text-muted-foreground"}`}
          >
            <PlusIcon />
          </div>
          <div className="mt-3 text-sm font-medium text-foreground">
            {dragging ? translation.chat_attach_release : translation.chat_attach_drop}
          </div>
          <div className="text-xs text-muted-foreground">{translation.chat_attach_hint}</div>
        </div>

        {/* Picker buttons */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: <ImageIcon />, label: translation.chat_attach_image, ref: imageInputRef },
            { icon: <FileIcon />, label: translation.chat_attach_file, ref: fileInputRef },
            { icon: <CameraIcon />, label: translation.chat_attach_screenshot, ref: imageInputRef },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => o.ref.current?.click()}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-3 py-4 text-xs font-medium text-foreground transition-shadow hover:shadow-card"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-subtle text-foreground">
                {o.icon}
              </span>
              {o.label}
            </button>
          ))}
        </div>

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* File list */}
        {files.length > 0 && (
          <div>
            <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {translation.chat_attach_selected} · {files.length}
            </div>
            <div className="flex flex-col gap-2">
              {files.map((lf) => (
                <div
                  key={lf.id}
                  className={`flex items-center gap-3 rounded-2xl border bg-card p-3 ${lf.sizeError ? "border-red-200" : "border-border"}`}
                >
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-subtle ${lf.sizeError ? "text-red-400" : "text-muted-foreground"}`}
                  >
                    <FileTypeIcon file={lf.file} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {lf.file.name}
                    </div>
                    {lf.sizeError ? (
                      <div className="text-xs text-red-500">
                        {translation.chat_attach_size_error}
                      </div>
                    ) : uploading ? (
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-subtle">
                        <div
                          className="h-full rounded-full bg-foreground transition-[width] duration-150"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        {formatSize(lf.file.size)}
                      </div>
                    )}
                  </div>
                  {uploading && !lf.sizeError ? (
                    <span className="shrink-0 text-xs text-muted-foreground">{progress}%</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeFile(lf.id)}
                      disabled={uploading}
                      className="shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-40"
                    >
                      <XIcon />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {uploadError && (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{uploadError}</div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border bg-card px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          disabled={uploading}
          className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-subtle hover:text-foreground disabled:opacity-50"
        >
          {translation.chat_cancel_button}
        </button>
        <button
          type="button"
          onClick={handleAttach}
          disabled={!canAttach}
          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-40"
        >
          {uploading
            ? translation.chat_attach_uploading.replace("{{ progress }}", String(progress))
            : translation.chat_attach_send}
          {!uploading && <ArrowRightIcon className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
