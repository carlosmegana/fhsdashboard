import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Mi Dashboard",
  description:
    "Personal Growth Canvas — panel personal de habitos, valores, metas y tareas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={nunito.variable}>
      <body className="bg-orange-50 text-stone-800 antialiased">
        {children}
      </body>
    </html>
  );
}
