export interface Credential {
  id: string;
  serviceName: string;
  username: string;
  password: string;  // encrypted at rest in vault; never leaves app in plaintext
  icon: string;
  createdAt: string; // ISO date string — set once at creation, never overwritten
}


export const ICON_OPTIONS = [
  { char: "⌥", label: "Key" },
  { char: "@", label: "Email" },
  { char: "▲", label: "Cloud" },
  { char: "◈", label: "Shield" },
  { char: "✦", label: "Star" },
  { char: "◉", label: "Target" },
  { char: "⬡", label: "Hex" },
  { char: "$", label: "Finance" },
  { char: "✉", label: "Mail" },
  { char: "⚙", label: "Config" },
  { char: "◆", label: "Diamond" },
  { char: "⬤", label: "Circle" },
];
