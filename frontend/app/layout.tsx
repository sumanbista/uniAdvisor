import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "uniAdvisor Knowledge Base",
  description: "Computer Science advising knowledge-base workspace.",
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
