export interface Credential {
  id: string;
  serviceName: string;
  username: string;
  password: string;  // encrypted at rest in vault; never leaves app in plaintext
  icon: string;
  createdAt: string; // ISO date string — set once at creation, never overwritten
}


export const ICON_OPTIONS = [
  { char: "@",  label: "Email" },
  { char: "✉",  label: "Mail" },
  { char: "$",  label: "Finance" },
  { char: "⚙",  label: "Work / Config" },
  { char: "☁",  label: "Cloud" },
  { char: "☎",  label: "Phone" },
  { char: "◉",  label: "Social" },
  { char: "♟",  label: "Gaming" },
  { char: "◆",  label: "Shopping" },
  { char: "≡",  label: "Dev / Code" },
  { char: "◈",  label: "Security" },
  { char: "✦",  label: "Misc" },
];
