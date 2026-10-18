import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockFlow — складской учёт",
  description:
    "Учебный прототип системы автоматизации складского учёта для лабораторных работ Московского Политеха.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
