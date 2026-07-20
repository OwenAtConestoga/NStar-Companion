"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Credential } from "@/types/credential";

// ── Minimal Web Serial API types (not in standard TS dom lib) ──────────────

interface NSASerialPort extends EventTarget {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
}

interface NSASerial extends EventTarget {
  requestPort(options?: object): Promise<NSASerialPort>;
  getPorts(): Promise<NSASerialPort[]>;
}

type DeviceMessage = Record<string, unknown>;

// ── Public sync state shape ────────────────────────────────────────────────

export type SyncPhase = "idle" | "encrypting" | "sending" | "done" | "error";

export interface SyncState {
  phase: SyncPhase;
  progress: number;   // 0–100
  statusLine: string;
  error?: string;
}

export interface LastSync {
  at: string;    // ISO timestamp
  count: number; // number of credentials synced
}

const LAST_SYNC_KEY = "nsa-last-sync";

// ── Internal helpers ───────────────────────────────────────────────────────

function getSerial(): NSASerial | null {
  if (typeof navigator === "undefined") return null;
  return "serial" in navigator
    ? (navigator as unknown as { serial: NSASerial }).serial
    : null;
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useSerialDevice() {
  const [isSupported, setIsSupported]             = useState(false);
  const [isConnected, setIsConnected]             = useState(false);
  const [isPaired, setIsPaired]                   = useState(false);
  const [syncState, setSyncState]                 = useState<SyncState>({
    phase: "idle", progress: 0, statusLine: "",
  });
  const [deviceSelectedIdx, setDeviceSelectedIdx] = useState<number | null>(null);
  const [lastSync, setLastSync]                   = useState<LastSync | null>(() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(LAST_SYNC_KEY) ?? "null"); } catch { return null; }
  });

  const portRef     = useRef<NSASerialPort | null>(null);
  const writerRef   = useRef<WritableStreamDefaultWriter<string> | null>(null);
  const readerRef   = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const pipesRef    = useRef<Promise<unknown>[]>([]);
  const msgQueueRef = useRef<Array<(msg: DeviceMessage) => void>>([]);

  useEffect(() => {
    setIsSupported(!!getSerial());
  }, []);

  // Handles messages that arrive outside the sync ack-wait flow
  const handleAsyncMessage = useCallback((msg: DeviceMessage) => {
    if (msg.event === "PAIR") {
      // HID firmware sends PAIR without a key — passwords stored on device directly.
      // Old Uno firmware sends PAIR with a key — we ignore the key since we no longer
      // encrypt the sync payload; the handshake still functions as a ready signal.
      setIsPaired(true);
      writerRef.current?.write('{"cmd":"PAIR_ACK"}\n').catch(() => {});
    }
    // Device SELECT event — used in companion-app clipboard mode (optional)
    if (msg.event === "SELECT" && typeof msg.idx === "number") {
      setDeviceSelectedIdx(msg.idx);
    }
  }, []);

  // Dispatch: if sync is waiting for an ack, route to it; otherwise handle as async event
  const dispatchMessage = useCallback((msg: DeviceMessage) => {
    if (msgQueueRef.current.length > 0) {
      const resolve = msgQueueRef.current.shift()!;
      resolve(msg);
    } else {
      handleAsyncMessage(msg);
    }
  }, [handleAsyncMessage]);

  // Promise that resolves when the next device message arrives
  function waitForAck(timeoutMs = 4000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const i = msgQueueRef.current.indexOf(resolver);
        if (i !== -1) msgQueueRef.current.splice(i, 1);
        reject(new Error("Device did not respond — check connection and try again."));
      }, timeoutMs);
      const resolver = (_msg: DeviceMessage) => {
        clearTimeout(timer);
        resolve();
      };
      msgQueueRef.current.push(resolver);
    });
  }

  function resetPort() {
    setIsConnected(false);
    setIsPaired(false);
    portRef.current   = null;
    writerRef.current = null;
    readerRef.current = null;
    pipesRef.current  = [];
    msgQueueRef.current = [];
  }

  // Opens an already-permitted port (fresh from requestPort(), or one
  // returned by getPorts() from a prior session) and wires up the
  // reader/writer pipeline. Shared by connect() and the auto-reconnect
  // effect below. Returns true if the port actually opened.
  const attachPort = useCallback(async (port: NSASerialPort): Promise<boolean> => {
    try {
      await port.open({ baudRate: 9600 });
      portRef.current = port;

      const decoder = new TextDecoderStream();
      // Web Serial readable is Uint8Array; TextDecoderStream writable types as BufferSource — cast required
      // Keep the pipeTo promise so disconnect() can wait for it to actually settle.
      const readPipeClosed = port.readable!.pipeTo(decoder.writable as unknown as WritableStream<Uint8Array>).catch(() => {});
      const reader = decoder.readable.getReader();
      readerRef.current = reader;

      const encoder = new TextEncoderStream();
      // Web Serial types ship as WritableStream<BufferSource>; cast needed for TextEncoderStream compatibility
      const writePipeClosed = encoder.readable.pipeTo(port.writable as unknown as WritableStream<Uint8Array>).catch(() => {});
      writerRef.current = encoder.writable.getWriter();
      pipesRef.current = [readPipeClosed, writePipeClosed];

      setIsConnected(true);
      port.addEventListener("disconnect", resetPort, { once: true });

      // If device already booted before we connected, ask it to re-send PAIR
      setTimeout(() => {
        writerRef.current?.write('{"cmd":"REQUEST_KEY"}\n').catch(() => {});
      }, 700);

      // Async reader loop — runs until port closes
      (async () => {
        let buf = "";
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += value;
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              try {
                const msg = JSON.parse(trimmed) as DeviceMessage;
                dispatchMessage(msg);
              } catch {
                // Non-JSON device output — ignore
              }
            }
          }
        } catch {
          // Port closed or read error
        }
        resetPort();
      })();

      return true;
    } catch {
      return false;
    }
  }, [dispatchMessage]);

  const connect = useCallback(async () => {
    const serial = getSerial();
    if (!serial) return;
    try {
      // No vendor filter — shows all serial ports in the picker.
      // Pi Zero 2 W (g_serial / CDC ACM) enumerates with a Linux Foundation VID
      // that doesn't match the old Arduino / CH340 filter, so we open the picker
      // to everything and let the user select the correct port.
      const port = await serial.requestPort();
      await attachPort(port);
    } catch {
      // User cancelled the port picker — no-op
    }
  }, [attachPort]);

  // Silently resume a connection to a port the user already granted
  // permission for in a previous session — getPorts() doesn't prompt, so this
  // needs no user gesture and can run on mount. If nothing was previously
  // granted, or the device isn't plugged in, this is just a no-op — the user
  // still sees the normal "No Device Connected" state and can connect manually.
  useEffect(() => {
    const serial = getSerial();
    if (!serial) return;
    let cancelled = false;
    (async () => {
      const ports = await serial.getPorts().catch(() => [] as NSASerialPort[]);
      for (const port of ports) {
        if (cancelled) return;
        const ok = await attachPort(port);
        if (ok) break; // stop at the first port that actually opens
      }
    })();
    return () => { cancelled = true; };
  }, [attachPort]);

  const disconnect = useCallback(async () => {
    const port = portRef.current;
    try {
      // Web Serial requires the readable/writable streams to be fully unlocked
      // (reader cancelled, writer closed) before port.close() will resolve — otherwise
      // close() hangs indefinitely and the OS-level handle never frees, which is why
      // reconnecting used to require a full page refresh. Cancel/close both sides first,
      // then wait for the pump promises to actually settle (capped so a wedged pipeTo
      // can't hang this forever), then close the port itself with its own cap.
      await readerRef.current?.cancel().catch(() => {});
      await writerRef.current?.close().catch(() => {});
      await Promise.race([
        Promise.allSettled(pipesRef.current),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
      await Promise.race([
        (port?.close() ?? Promise.resolve()).catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } finally {
      resetPort();
    }
  }, []);

  const syncCredentials = useCallback(async (credentials: Credential[]) => {
    const writer = writerRef.current;
    if (!writer) {
      setSyncState({ phase: "error", progress: 0, statusLine: "// Not connected to device." });
      return;
    }

    try {
      // Build plaintext payload.
      // Passwords travel over the physical USB cable to the device and are stored
      // in EEPROM. Physical security (planned biometric) protects the device.
      setSyncState({ phase: "encrypting", progress: 5, statusLine: "// Building payload..." });

      const payload     = JSON.stringify({
        credentials: credentials.map((c) => ({ svc: c.serviceName, usr: c.username, pwd: c.password })),
      });
      const CHUNK_SIZE  = 48;
      const totalChunks = Math.ceil(payload.length / CHUNK_SIZE);

      setSyncState({ phase: "sending", progress: 15, statusLine: "// Opening channel to device..." });

      // ── BEGIN handshake ──────────────────────────────────────────────────
      await writer.write(`{"cmd":"BEGIN","count":${credentials.length},"len":${payload.length}}\n`);
      await waitForAck(6000);

      setSyncState({ phase: "sending", progress: 20, statusLine: `// Sending ${totalChunks} blocks to device...` });

      // ── Chunked transfer ─────────────────────────────────────────────────
      for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
        const chunk    = payload.slice(i, i + CHUNK_SIZE);
        const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
        await writer.write(chunk + "\n");
        await waitForAck(4000);
        const pct = 20 + Math.round((chunkNum / totalChunks) * 70);
        setSyncState({
          phase: "sending",
          progress: Math.min(pct, 90),
          statusLine: `// Block ${chunkNum} / ${totalChunks} — ${payload.length} bytes total`,
        });
      }

      // ── END — device writes to EEPROM ────────────────────────────────────
      setSyncState({ phase: "sending", progress: 92, statusLine: "// Finalizing — device writing to EEPROM..." });
      await writer.write('{"cmd":"END"}\n');
      await waitForAck(12000);

      const sync: LastSync = { at: new Date().toISOString(), count: credentials.length };
      localStorage.setItem(LAST_SYNC_KEY, JSON.stringify(sync));
      setLastSync(sync);

      setSyncState({
        phase: "done",
        progress: 100,
        statusLine: `// ${credentials.length} account${credentials.length !== 1 ? "s" : ""} synced to device.`,
      });

    } catch (err) {
      setSyncState({
        phase: "error",
        progress: 0,
        statusLine: "// Transfer failed.",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, []);

  const resetSync = useCallback(() => {
    setSyncState({ phase: "idle", progress: 0, statusLine: "" });
  }, []);

  const clearDeviceSelect = useCallback(() => setDeviceSelectedIdx(null), []);

  return {
    isSupported,
    isConnected,
    isPaired,
    syncState,
    lastSync,
    deviceSelectedIdx,
    connect,
    disconnect,
    syncCredentials,
    resetSync,
    clearDeviceSelect,
  };
}
