import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Second Brain",
  description: "RAG workspace for developer project memory, documents, and semantic code search.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
