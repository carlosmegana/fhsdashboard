import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Flow Habit System",
  description:
    "Flow Habit System — daily, weekly, monthly and yearly dashboard for habits, values, goals and tasks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
