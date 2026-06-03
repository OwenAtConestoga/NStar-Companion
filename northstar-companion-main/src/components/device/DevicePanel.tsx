"use client";

import { useState, useEffect, useCallback } from "react";
import type { Credential } from "@/types/credential";
import type { LastSync } from "@/hooks/useSerialDevice";

interface DevicePanelProps {
  credentials: Credential[];
  isConnected: boolean;
  isPaired: boolean;
  onConnect: () => void;
  onSync: () => void;
  lastSync: LastSync | null;
}

const MAX_SLOTS = 20;

// ── LCD Simulator ─────────────────────────────────────────────────────────────
// Mirrors firmware button mapping exactly:
//   JOY UP/DOWN → cycle (wraps)   KEY1 → select/enter   KEY2 → back

type MenuScreen =
  | "home" | "accounts" | "detail" | "typing" | "sent"
  | "removeConfirm" | "delAllConfirm" | "settings" | "info";

const HOME_MENU     = ["// accounts", "// settings", "// delete all"] as const;
const SETTINGS_MENU = ["// device info"] as const;

function lcdPad(s: string): string {
  return s.slice(0, 16).padEnd(16, " ");
}

function useLCDSimulator(credentials: Credential[]) {
  const [screen,    setScreen]    = useState<MenuScreen>("home");
  const [cursor,    setCursor]    = useState(0);
  const [countdown, setCountdown] = useState(3);

  // If creds removed while browsing accounts, go home
  useEffect(() => {
    if (credentials.length === 0 && screen === "accounts") {
      setCursor(0); setScreen("home");
    }
  }, [credentials.length, screen]);

  // Typing countdown → sent
  useEffect(() => {
    if (screen !== "typing") return;
    let count = 3;
    setCountdown(count);
    const id = setInterval(() => {
      count -= 1;
      if (count <= 0) { clearInterval(id); setScreen("sent"); }
      else            { setCountdown(count); }
    }, 1000);
    return () => clearInterval(id);
  }, [screen]);

  // Sent → back to detail (mirrors firmware: 1.8s then S.DETAIL)
  useEffect(() => {
    if (screen !== "sent") return;
    const t = setTimeout(() => setScreen("detail"), 1800);
    return () => clearTimeout(t);
  }, [screen]);

  // Compute menu size for the current screen (used for wrap-around cycling)
  const menuSz = useCallback((): number => {
    if (screen === "home")                                          return HOME_MENU.length;
    if (screen === "accounts")                                      return credentials.length + 1; // +1 for "remove all"
    if (screen === "settings")                                      return SETTINGS_MENU.length;
    if (screen === "removeConfirm" || screen === "delAllConfirm")   return 2; // YES / NO
    return 1;
  }, [screen, credentials.length]);

  // JOY UP — cycle up (wraps)
  const pressUp = useCallback(() => {
    const sz = menuSz();
    if (sz > 1) setCursor((c) => (c - 1 + sz) % sz);
  }, [menuSz]);

  // JOY DOWN — cycle down (wraps)
  const pressDown = useCallback(() => {
    const sz = menuSz();
    if (sz > 1) setCursor((c) => (c + 1) % sz);
  }, [menuSz]);

  // KEY1 — select / enter
  const pressSelect = useCallback(() => {
    if (screen === "home") {
      if (cursor === 0) { setScreen("accounts");      setCursor(0); }
      if (cursor === 1) { setScreen("settings");      setCursor(0); }
      if (cursor === 2) { setScreen("delAllConfirm"); setCursor(1); } // default NO
    } else if (screen === "accounts") {
      if (credentials.length === 0) return;
      if (cursor < credentials.length) setScreen("detail");
      else                             { setScreen("removeConfirm"); setCursor(1); } // default NO
    } else if (screen === "detail") {
      setScreen("typing");
    } else if (screen === "removeConfirm") {
      // simulator: both YES and NO just go back (can't wipe device from sim)
      setScreen("accounts"); setCursor(0);
    } else if (screen === "settings") {
      if (cursor === 0) setScreen("info");
    } else if (screen === "delAllConfirm") {
      if (cursor === 0) { setScreen("home"); setCursor(0); }
      else              { setScreen("home"); setCursor(2); }
    }
  }, [screen, cursor, credentials.length]);

  // KEY2 — back
  const pressBack = useCallback(() => {
    if (screen === "accounts" || screen === "settings" || screen === "delAllConfirm") {
      setScreen("home");     setCursor(0);
    } else if (screen === "detail" || screen === "removeConfirm") {
      setScreen("accounts"); setCursor(0);
    } else if (screen === "info") {
      setScreen("settings"); setCursor(0);
    }
  }, [screen]);

  const listCred = credentials[cursor];

  let line1 = "";
  let line2 = "";

  switch (screen) {
    case "home":
      line1 = lcdPad("NorthStar Auth");
      line2 = lcdPad(HOME_MENU[cursor]);
      break;
    case "accounts":
      if (credentials.length === 0) {
        line1 = lcdPad("  no accounts");
        line2 = lcdPad("  sync to add");
      } else if (cursor < credentials.length) {
        line1 = lcdPad(`~${listCred.serviceName}`);
        line2 = lcdPad(`  ${listCred.username}`);
      } else {
        line1 = lcdPad("~// remove all");
        line2 = lcdPad(`  ${credentials.length} account${credentials.length !== 1 ? "s" : ""}`);
      }
      break;
    case "detail":
      line1 = lcdPad(`~${listCred?.serviceName ?? ""}`);
      line2 = lcdPad("  K1=send K2=back");
      break;
    case "typing":
      line1 = lcdPad(`~${listCred?.serviceName ?? ""}`);
      line2 = lcdPad(`  typing... ${countdown}s`);
      break;
    case "sent":
      line1 = lcdPad(`~${listCred?.serviceName ?? ""}`);
      line2 = lcdPad("  sent! returning");
      break;
    case "removeConfirm":
      line1 = lcdPad("// remove all?");
      line2 = lcdPad(cursor === 0 ? "~YES    no    " : "  yes   ~NO   ");
      break;
    case "delAllConfirm":
      line1 = lcdPad("// delete all?");
      line2 = lcdPad(cursor === 0 ? "~YES    no    " : "  yes   ~NO   ");
      break;
    case "settings":
      line1 = lcdPad("~// settings");
      line2 = lcdPad(`  ${SETTINGS_MENU[cursor]}`);
      break;
    case "info":
      line1 = lcdPad("~// device info");
      line2 = lcdPad("  Pi Zero 2 W");
      break;
  }

  const isTyping  = screen === "typing" || screen === "sent";
  const sz        = menuSz();
  const canUp     = sz > 1 && !isTyping;
  const canDown   = sz > 1 && !isTyping;
  const canBack   = screen !== "home" && !isTyping;
  const canSelect = !isTyping && screen !== "info"
    && !(screen === "accounts" && credentials.length === 0);

  return { line1, line2, screen, cursor, pressUp, pressDown, pressBack, pressSelect, canUp, canDown, canBack, canSelect, isTyping };
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function DevicePanel({ credentials, isConnected, isPaired, onConnect, onSync, lastSync }: DevicePanelProps) {
  const staged   = credentials.length;
  const [search, setSearch] = useState("");
  const fillPct  = Math.round((staged / MAX_SLOTS) * 100);
  const fillBars = Math.round((staged / MAX_SLOTS) * 12);

  const {
    line1, line2, screen, cursor,
    pressUp, pressDown, pressBack, pressSelect,
    canUp, canDown, canBack, canSelect, isTyping,
  } = useLCDSimulator(credentials);

  // Buttons always work — simulator is available regardless of pairing state
  const buttons = [
    { label: "↑",  action: pressUp,     title: "UP",     enabled: canUp    },
    { label: "↓",  action: pressDown,   title: "DOWN",   enabled: canDown  },
    { label: "K1", action: pressSelect, title: "ENTER",  enabled: canSelect },
    { label: "K2", action: pressBack,   title: "BACK",   enabled: canBack  },
  ];

  const hint: Record<MenuScreen, string> = {
    home:          "↑↓ cycle · K1 select",
    accounts:      "↑↓ cycle · K1 select · K2 back",
    detail:        "K1 send · K2 back",
    typing:        "typing credentials...",
    sent:          "sent — returning to detail",
    removeConfirm: "↑↓ YES/NO · K1 confirm · K2 back",
    delAllConfirm: "↑↓ YES/NO · K1 confirm · K2 back",
    settings:      "↑↓ cycle · K1 select · K2 back",
    info:          "K2 back",
  };

  return (
    <div className="flex flex-col gap-6 p-5 h-full overflow-y-auto">

      {/* Header */}
      <div>
        <p className="text-green-400 font-mono text-xs tracking-widest uppercase mb-0.5">// Device</p>
        <h2 className="text-zinc-100 font-mono text-lg font-bold">NorthStar Auth</h2>
        <p className="text-zinc-500 font-mono text-xs">Pi Zero 2 W · Waveshare 1.3" LCD</p>
      </div>

      {/* LCD Simulator */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-zinc-500 font-mono text-xs">// LCD Simulator</p>
          <p className="text-zinc-700 font-mono text-xs">mirrors firmware</p>
        </div>

        <div className="rounded-lg overflow-hidden border-2 border-zinc-600 shadow-inner">
          {/* Bezel top */}
          <div className="bg-zinc-800 px-3 py-1.5 flex items-center justify-between border-b border-zinc-700">
            <span className="text-zinc-500 font-mono text-xs">240×240 LCD</span>
            <span className={`w-2 h-2 rounded-full ${
              isPaired ? "bg-green-500 animate-pulse" : isConnected ? "bg-yellow-500 animate-pulse" : "bg-zinc-600"
            }`} />
          </div>

          {/* LCD screen */}
          <div className="bg-[#1a2a1a] px-4 py-3 font-mono text-xs leading-relaxed">
            <div className="text-[#4ade80] tracking-wider whitespace-pre">{line1}</div>
            <div className="text-[#22c55e] tracking-wider whitespace-pre">{line2}</div>
          </div>

          {/* Button row */}
          <div className="bg-zinc-800 px-3 py-2.5 border-t border-zinc-700 flex items-center justify-center gap-3">
            {buttons.map(({ label, action, title, enabled }) => (
              <button
                key={title}
                onClick={action}
                title={title}
                disabled={!enabled || isTyping}
                className={`min-w-[2rem] px-2 h-7 border rounded-sm flex items-center justify-center font-mono text-xs select-none transition-all ${
                  enabled && !isTyping
                    ? "bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 border-zinc-500 hover:border-zinc-400 text-zinc-100 cursor-pointer"
                    : "bg-zinc-800 border-zinc-700 text-zinc-600 cursor-not-allowed"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-zinc-600 font-mono text-xs mt-1.5 text-center">{hint[screen]}</p>
      </div>

      {/* Context panel */}
      {(() => {
        const isSettingsCtx = screen === "settings" || screen === "info"       || (screen === "home" && cursor === 1);
        const isDeleteCtx   = screen === "delAllConfirm" || screen === "removeConfirm" || (screen === "home" && cursor === 2);

        if (isSettingsCtx && screen === "info") return (
          <div>
            <p className="text-zinc-500 font-mono text-xs mb-3">// Device Info</p>
            <div className="flex flex-col gap-1.5">
              {[
                { label: "Board",   value: "Pi Zero 2 W" },
                { label: "Display", value: "Waveshare 1.3\" 240×240" },
                { label: "Input",   value: "Joystick + 3 keys" },
                { label: "USB",     value: "CDC ACM + HID keyboard" },
                { label: "Storage", value: "microSD · 20 slots" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-baseline justify-between gap-2">
                  <span className="text-zinc-600 font-mono text-xs">{label}</span>
                  <span className="border-b border-dashed border-zinc-800 flex-1" />
                  <span className="text-zinc-300 font-mono text-xs">{value}</span>
                </div>
              ))}
            </div>
          </div>
        );

        if (isSettingsCtx) return (
          <div>
            <p className="text-zinc-500 font-mono text-xs mb-3">// Settings</p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-zinc-600 font-mono text-xs">Staged</span>
                <span className="border-b border-dashed border-zinc-800 flex-1" />
                <span className="text-zinc-300 font-mono text-xs">{staged}/{MAX_SLOTS}</span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-zinc-600 font-mono text-xs">Last sync</span>
                <span className="border-b border-dashed border-zinc-800 flex-1" />
                <span className="text-zinc-300 font-mono text-xs">
                  {lastSync ? new Date(lastSync.at).toLocaleDateString("en-CA") : "never"}
                </span>
              </div>
            </div>
          </div>
        );

        if (isDeleteCtx) return (
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">
            <p className="text-red-400 font-mono text-xs mb-2">// Delete All</p>
            <p className="text-zinc-400 font-mono text-xs leading-relaxed">
              Erases all accounts from the device. Your web vault is unaffected.
            </p>
          </div>
        );

        const filtered = credentials.filter((c) =>
          c.serviceName.toLowerCase().includes(search.toLowerCase()) ||
          c.username.toLowerCase().includes(search.toLowerCase())
        );
        return (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-zinc-500 font-mono text-xs flex-shrink-0">// Staged</p>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="search..."
                className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 focus:border-zinc-500 rounded px-2 py-0.5 text-zinc-300 font-mono text-xs outline-none placeholder:text-zinc-600 transition-colors"
              />
              <p className="text-zinc-600 font-mono text-xs flex-shrink-0">{staged}/{MAX_SLOTS}</p>
            </div>

            {staged === 0 ? (
              <p className="text-zinc-700 font-mono text-xs py-2">no accounts staged yet</p>
            ) : filtered.length === 0 ? (
              <p className="text-zinc-700 font-mono text-xs py-2">no matches</p>
            ) : (
              <div className="flex flex-col gap-1">
                {filtered.map((cred) => {
                  const originalIdx = credentials.indexOf(cred);
                  const isCursorActive = screen === "accounts" && cursor === originalIdx;
                  const isSynced = lastSync !== null && cred.createdAt
                    ? new Date(cred.createdAt) <= new Date(lastSync.at)
                    : lastSync !== null;
                  return (
                    <div
                      key={cred.id}
                      className={`flex items-start gap-2 px-2 py-1.5 rounded font-mono text-xs transition-colors ${
                        isCursorActive
                          ? "bg-green-500/10 border border-green-500/20 text-green-400"
                          : "text-zinc-500 border border-transparent"
                      }`}
                    >
                      <span className="w-4 text-center flex-shrink-0 mt-0.5">{cred.icon}</span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate">{cred.serviceName}</span>
                        <span className={`truncate text-xs ml-2 ${isCursorActive ? "text-green-600" : "text-zinc-600"}`}>
                          {cred.username}
                        </span>
                      </div>
                      {lastSync !== null && (
                        <span
                          title={isSynced ? "Synced to device" : "Not yet synced"}
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${isSynced ? "bg-green-500" : "bg-yellow-400"}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {lastSync !== null && staged > 0 && (
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-zinc-600 font-mono text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> synced
                </span>
                <span className="flex items-center gap-1 text-zinc-600 font-mono text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" /> not synced
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Connection status */}
      <div className={`rounded-lg px-4 py-3 border font-mono text-xs flex items-center gap-3 ${
        isPaired      ? "bg-green-500/10 border-green-500/30 text-green-400"
        : isConnected ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
        :               "bg-zinc-800 border-zinc-700 text-zinc-500"
      }`}>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isPaired ? "bg-green-500 animate-pulse" : isConnected ? "bg-yellow-500 animate-pulse" : "bg-zinc-600"
        }`} />
        <span>
          {isPaired ? "Device Ready — sync enabled" : isConnected ? "Connected — awaiting pair" : "No device connected"}
        </span>
        {!isConnected && (
          <button
            onClick={onConnect}
            className="ml-auto text-green-500 hover:text-green-400 border border-green-500/40 hover:border-green-500 px-2 py-0.5 rounded transition-colors"
          >
            CONNECT
          </button>
        )}
      </div>

      {/* Last sync */}
      {(() => {
        const needsSync   = isPaired && lastSync !== null && lastSync.count !== staged;
        const neverSynced = lastSync === null;
        const syncDate    = lastSync ? new Date(lastSync.at).toLocaleString("en-CA", {
          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
        }) : null;
        return (
          <div className={`rounded-lg px-4 py-3 border font-mono text-xs flex flex-col gap-2 ${
            needsSync ? "bg-yellow-500/5 border-yellow-500/20" : "bg-zinc-900 border-zinc-800"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">// Last Sync</span>
              {isPaired && (
                <button onClick={onSync} className="text-green-500 hover:text-green-400 border border-green-500/40 hover:border-green-500 px-2 py-0.5 rounded transition-colors text-xs">
                  SYNC NOW
                </button>
              )}
            </div>
            {neverSynced ? (
              <p className="text-zinc-600">Never synced — connect and sync to push credentials to device.</p>
            ) : (
              <div className="flex flex-col gap-1">
                <p className="text-zinc-400">{syncDate}</p>
                <p className="text-zinc-600">{lastSync!.count} account{lastSync!.count !== 1 ? "s" : ""} pushed</p>
              </div>
            )}
            {needsSync && <p className="text-yellow-400 text-xs">⚠ Credentials changed — device may be out of date.</p>}
          </div>
        );
      })()}

      {/* Storage bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-zinc-400 font-mono text-xs">// Storage Slots</span>
          <span className="text-zinc-300 font-mono text-xs">{staged} / {MAX_SLOTS}</span>
        </div>
        <div className="bg-zinc-800 rounded px-2 py-1 font-mono text-xs text-green-500 tracking-widest">
          {"█".repeat(fillBars)}{"░".repeat(12 - fillBars)}
          <span className="text-zinc-500 ml-2">{fillPct}%</span>
        </div>
        <p className="text-zinc-600 font-mono text-xs mt-1">
          {MAX_SLOTS - staged} slot{MAX_SLOTS - staged !== 1 ? "s" : ""} remaining
        </p>
      </div>

      {/* Spec grid */}
      <div>
        <p className="text-zinc-400 font-mono text-xs mb-3">// Hardware Specs</p>
        <div className="flex flex-col gap-2">
          {[
            { label: "Board",   value: "Raspberry Pi Zero 2 W" },
            { label: "CPU",     value: "Cortex-A53 @ 1GHz" },
            { label: "RAM",     value: "512MB" },
            { label: "Display", value: "Waveshare 1.3\" 240×240" },
            { label: "Input",   value: "Joystick + KEY1/2/3" },
            { label: "USB",     value: "CDC ACM + HID" },
            { label: "Baud",    value: "9600" },
            { label: "Vault",   value: "AES-256-GCM PBKDF2" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-baseline justify-between gap-2">
              <span className="text-zinc-600 font-mono text-xs flex-shrink-0">{label}</span>
              <span className="border-b border-dashed border-zinc-800 flex-1" />
              <span className="text-zinc-300 font-mono text-xs text-right">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Standalone guide */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <p className="text-green-400 font-mono text-xs tracking-widest mb-2">// Standalone Use</p>
        <ol className="text-zinc-500 font-mono text-xs space-y-1 list-none">
          <li>1. Add credentials + sync once</li>
          <li>2. Unplug — carry anywhere</li>
          <li>3. Plug into any computer</li>
          <li>4. Navigate → SELECT account</li>
          <li>5. K1 → types username + password</li>
        </ol>
      </div>

    </div>
  );
}
