"use client";

import { useState, useRef } from "react";

interface ImportModalProps {
  onImport: (fileContent: string, password: string) => Promise<string | null>;
  onClose: () => void;
}

export default function ImportModal({ onImport, onClose }: ImportModalProps) {
  const [password,  setPassword]  = useState("");
  const [fileName,  setFileName]  = useState<string | null>(null);
  const [content,   setContent]   = useState<string | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setContent(ev.target?.result as string ?? null);
    reader.readAsText(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content || !password) return;
    setLoading(true);
    setError(null);
    const err = await onImport(content, password);
    setLoading(false);
    if (err) { setError(err); return; }
    setDone(true);
    setTimeout(onClose, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full mx-4 p-6 flex flex-col gap-5">

        <div>
          <p className="text-green-400 font-mono text-xs tracking-widest uppercase mb-1">// Restore Vault</p>
          <h2 className="text-zinc-100 font-mono text-lg font-bold">Import Backup</h2>
          <p className="text-zinc-500 font-mono text-xs mt-1">
            Replaces the current vault with the backup. Enter the password used when the backup was created.
          </p>
        </div>

        {done ? (
          <p className="text-green-400 font-mono text-sm text-center py-4">✓ Vault restored</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div>
              <label className="text-zinc-400 font-mono text-xs block mb-1.5">// Backup File (.nstar)</label>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded px-3 py-2.5 text-left font-mono text-sm transition-colors"
              >
                {fileName
                  ? <span className="text-zinc-200">{fileName}</span>
                  : <span className="text-zinc-600">Choose file...</span>}
              </button>
              <input ref={fileRef} type="file" accept=".nstar,.json" onChange={handleFile} className="hidden" />
            </div>

            <div>
              <label className="text-zinc-400 font-mono text-xs block mb-1.5">// Backup Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password used when backup was made"
                className="w-full bg-zinc-800 border border-zinc-700 focus:border-green-500 rounded px-3 py-2.5 text-zinc-100 font-mono text-sm outline-none transition-colors placeholder:text-zinc-600"
              />
            </div>

            {error && (
              <p className="text-red-400 font-mono text-xs">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={!content || !password || loading}
                className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-black font-bold font-mono py-3 rounded transition-colors"
              >
                {loading ? "Decrypting..." : "RESTORE VAULT"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 font-mono px-5 py-3 rounded transition-colors"
              >
                Cancel
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}
