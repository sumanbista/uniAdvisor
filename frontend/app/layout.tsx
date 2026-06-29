import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "uniAdvisor Phase 1 Console",
  description: "Frontend foundation for Computer Science advising RAG workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
