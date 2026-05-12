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
// Mirrors northstar_hid.ino state machine.
// Home menu: Accounts · Device · Settings · Delete All

type MenuScreen = "home" | "list" | "detail" | "typing" | "device" | "settings" | "deleteConfirm";

const HOME_MENU = ["Accounts", "Device", "Settings", "Delete All"] as const;

function lcdPad(s: string): string {
  return s.slice(0, 16).padEnd(16, " ");
}

function useLCDSimulator(credentials: Credential[]) {
  const [screen,    setScreen]    = useState<MenuScreen>("home");
  const [cursor,    setCursor]    = useState(0);
  const [countdown, setCountdown] = useState(3);

  // When credentials shrink to 0, bail back to home
  useEffect(() => {
    if (credentials.length === 0 && screen === "list") {
      setCursor(0); setScreen("home");
    }
  }, [credentials.length, screen]);

  // Typing countdown → return to list
  useEffect(() => {
    if (screen !== "typing") return;
    let count = 3;
    setCountdown(count);
    const id = setInterval(() => {
      count -= 1;
      if (count <= 0) { clearInterval(id); setScreen("list"); }
      else            { setCountdown(count); }
    }, 1000);
    return () => clearInterval(id);
  }, [screen]);

  const pressUp = useCallback(() => {
    if (screen === "home")         setCursor((c) => Math.max(0, c - 1));
    if (screen === "list")         setCursor((c) => Math.max(0, c - 1));
    if (screen === "deleteConfirm") setCursor((c) => (c === 0 ? 1 : 0));
  }, [screen]);

  const pressDown = useCallback(() => {
    if (screen === "home")          setCursor((c) => Math.min(HOME_MENU.length - 1, c + 1));
    if (screen === "list")          setCursor((c) => Math.min(credentials.length - 1, c + 1));
    if (screen === "deleteConfirm") setCursor((c) => (c === 0 ? 1 : 0));
  }, [screen, credentials.length]);

  const pressBack = useCallback(() => {
    if (screen === "list")          { setScreen("home");     setCursor(0); }
    if (screen === "detail")        { setScreen("list");     setCursor(0); }
    if (screen === "device")        { setScreen("home");     setCursor(1); }
    if (screen === "settings")      { setScreen("home");     setCursor(2); }
    if (screen === "deleteConfirm") { setScreen("home");     setCursor(3); }
  }, [screen]);

  const pressSelect = useCallback(() => {
    if (screen === "home") {
      if (cursor === 0) { setScreen("list");          setCursor(0); }
      if (cursor === 1)   setScreen("device");
      if (cursor === 2)   setScreen("settings");
      if (cursor === 3) { setScreen("deleteConfirm"); setCursor(1); } // default NO
    }
    if (screen === "list"   && credentials.length > 0) setScreen("detail");
    if (screen === "detail")                            setScreen("typing");
    if (screen === "deleteConfirm") {
      // YES = cursor 0, NO = cursor 1
      setScreen("home");
      setCursor(3);
    }
  }, [screen, cursor, credentials.length]);

  // Build LCD rows
  const listCred = credentials[cursor];
  const listNext = credentials[cursor + 1];

  let line1 = "";
  let line2 = "";

  switch (screen) {
    case "home":
      line1 = lcdPad("NorthStar Auth");
      line2 = lcdPad(`~${HOME_MENU[cursor]}`);
      break;
    case "list":
      if (credentials.length === 0) {
        line1 = lcdPad("  Empty vault");
        line2 = lcdPad("  Add accounts");
      } else {
        line1 = lcdPad(`~${listCred.serviceName}`);
        line2 = lcdPad(listNext ? `  ${listNext.serviceName}` : `  (${cursor + 1}/${credentials.length})`);
      }
      break;
    case "detail":
      line1 = lcdPad(`~${listCred?.serviceName ?? ""}`);
      line2 = lcdPad(`  ${listCred?.username ?? ""}`);
      break;
    case "typing":
      line1 = lcdPad(`~${listCred?.serviceName ?? ""}`);
      line2 = lcdPad(`  Typing in ${countdown}...`);
      break;
    case "device":
      line1 = lcdPad("~Device Info");
      line2 = lcdPad("  NSA HID v1.0");
      break;
    case "settings":
      line1 = lcdPad("~Settings");
      line2 = lcdPad(`  ${credentials.length}/${MAX_SLOTS} accounts`);
      break;
    case "deleteConfirm":
      line1 = lcdPad("Delete All?");
      line2 = lcdPad(cursor === 0 ? "~YES    no    " : "  yes   ~NO   ");
      break;
  }

  const canUp = (screen === "home" && cursor > 0)
    || (screen === "list" && cursor > 0)
    || screen === "deleteConfirm";

  const canDown = (screen === "home" && cursor < HOME_MENU.length - 1)
    || (screen === "list" && cursor < credentials.length - 1)
    || screen === "deleteConfirm";

  const canBack   = screen !== "home" && screen !== "typing";
  const canSelect = screen !== "typing"
    && !(screen === "home" && cursor === 0 && credentials.length === 0);
  const isTyping  = screen === "typing";

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

  const buttons = [
    { label: "↑", action: pressUp,     title: "UP",     enabled: canUp    },
    { label: "↓", action: pressDown,   title: "DOWN",   enabled: canDown  },
    { label: "←", action: pressBack,   title: "BACK",   enabled: canBack  },
    { label: "→", action: pressSelect, title: "SELECT", enabled: canSelect },
  ];

  const hint: Record<MenuScreen, string> = {
    home:          "↑↓ scroll menu · → select",
    list:          "↑↓ scroll · → select · ← back",
    detail:        "→ to simulate typing · ← back",
    typing:        "simulating HID keystroke...",
    device:        "← back to menu",
    settings:      "← back to menu",
    deleteConfirm: "↑↓ YES/NO · → confirm · ← back",
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">

      {/* Header */}
      <div>
        <p className="text-green-400 font-mono text-xs tracking-widest uppercase mb-0.5">// Device</p>
        <h2 className="text-zinc-100 font-mono text-lg font-bold">NorthStar HID</h2>
        <p className="text-zinc-500 font-mono text-xs">Arduino Leonardo · ATmega32U4</p>
      </div>

      {/* LCD Simulator */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-zinc-500 font-mono text-xs">// LCD Simulator</p>
          <p className="text-zinc-700 font-mono text-xs">mirrors device firmware</p>
        </div>

        <div className="rounded-lg overflow-hidden border-2 border-zinc-600 shadow-inner">
          {/* Bezel top */}
          <div className="bg-zinc-800 px-3 py-1.5 flex items-center justify-between border-b border-zinc-700">
            <span className="text-zinc-500 font-mono text-xs">LCD 16×2</span>
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
                className={`w-9 h-7 border rounded-sm flex items-center justify-center font-mono text-sm select-none transition-all ${
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

      {/* Context panel — content changes with LCD screen / cursor position */}
      {(() => {
        const isDeviceCtx   = screen === "device"        || (screen === "home" && cursor === 1);
        const isSettingsCtx = screen === "settings"      || (screen === "home" && cursor === 2);
        const isDeleteCtx   = screen === "deleteConfirm" || (screen === "home" && cursor === 3);

        if (isDeviceCtx) return (
          <div>
            <p className="text-zinc-500 font-mono text-xs mb-3">// Device Info</p>
            <p className="text-zinc-400 font-mono text-xs leading-relaxed mb-3">
              NorthStar HID stores credentials in EEPROM and types passwords via native USB HID — no drivers, no software required on the target machine.
            </p>
            <div className="flex flex-col gap-1.5">
              {[
                { label: "Protocol", value: "USB HID Keyboard" },
                { label: "Storage",  value: "1KB EEPROM · 20 slots" },
                { label: "Display",  value: "LCD 16×2 parallel" },
                { label: "MCU",      value: "ATmega32U4" },
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
            <p className="text-zinc-400 font-mono text-xs leading-relaxed mb-3">
              On the device, Settings shows your account count. Manage credentials in the web vault, then sync to update the device.
            </p>
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
              Erases <strong className="text-zinc-200">all accounts</strong> from device EEPROM. Your web vault is unaffected — the device will be empty until you sync again.
            </p>
          </div>
        );

        // Accounts context: home cursor=0, list, detail, typing
        const filtered = credentials.filter((c) =>
          c.serviceName.toLowerCase().includes(search.toLowerCase()) ||
          c.username.toLowerCase().includes(search.toLowerCase())
        );
        return (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-zinc-500 font-mono text-xs flex-shrink-0">// Staged Accounts</p>
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
                  const isCursorActive = screen === "list" && cursor === originalIdx;
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

      {/* Last sync + sync button */}
      {(() => {
        const needsSync = isPaired && lastSync !== null && lastSync.count !== staged;
        const neverSynced = lastSync === null;
        const syncDate = lastSync ? new Date(lastSync.at).toLocaleString("en-CA", {
          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
        }) : null;

        return (
          <div className={`rounded-lg px-4 py-3 border font-mono text-xs flex flex-col gap-2 ${
            needsSync ? "bg-yellow-500/5 border-yellow-500/20" : "bg-zinc-900 border-zinc-800"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">// Last Sync</span>
              {isPaired && (
                <button
                  onClick={onSync}
                  className="text-green-500 hover:text-green-400 border border-green-500/40 hover:border-green-500 px-2 py-0.5 rounded transition-colors text-xs"
                >
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
            {needsSync && (
              <p className="text-yellow-400 text-xs">⚠ Credentials changed since last sync — device may be out of date.</p>
            )}
          </div>
        );
      })()}

      {/* EEPROM usage */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-zinc-400 font-mono text-xs">// EEPROM Slots</span>
          <span className="text-zinc-300 font-mono text-xs">{staged} / {MAX_SLOTS}</span>
        </div>
        <div className="bg-zinc-800 rounded px-2 py-1 font-mono text-xs text-green-500 tracking-widest">
          {"█".repeat(fillBars)}{"░".repeat(12 - fillBars)}
          <span className="text-zinc-500 ml-2">{fillPct}%</span>
        </div>
        <p className="text-zinc-600 font-mono text-xs mt-1">
          {MAX_SLOTS - staged} slot{MAX_SLOTS - staged !== 1 ? "s" : ""} remaining · 1KB total
        </p>
      </div>

      {/* Spec grid */}
      <div>
        <p className="text-zinc-400 font-mono text-xs mb-3">// Hardware Specs</p>
        <div className="flex flex-col gap-2">
          {[
            { label: "Board",   value: "Arduino Leonardo" },
            { label: "MCU",     value: "ATmega32U4" },
            { label: "USB",     value: "HID + CDC Serial" },
            { label: "Storage", value: "1KB EEPROM" },
            { label: "Display", value: "LCD 16×2 parallel" },
            { label: "Buttons", value: "4 (UP/DN/BACK/SEL)" },
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

      {/* Standalone use */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <p className="text-green-400 font-mono text-xs tracking-widest mb-2">// Standalone Use</p>
        <ol className="text-zinc-500 font-mono text-xs space-y-1 list-none">
          <li>1. Add credentials + sync once</li>
          <li>2. Unplug — carry anywhere</li>
          <li>3. Plug into any computer</li>
          <li>4. Navigate → SELECT account</li>
          <li>5. Click target field → password types</li>
        </ol>
      </div>

    </div>
  );
}
