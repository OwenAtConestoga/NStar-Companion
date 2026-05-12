import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NorthStar Companion",
  description: "Local Vault Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 font-mono antialiased">
        {children}
      </body>
    </html>
  );
}
