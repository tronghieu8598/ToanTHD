import type { Metadata } from "next";
import "./globals.css";
import "./polish.css";
import "./projection.css";
import "./staff.css";
import "./digital-library.css";
import "./academic.css";
import "./studio.css";
import "./studio-library-bank.css";

export const metadata: Metadata = {
  title: "Toán THĐ Studio — Học liệu & Kiểm tra",
  description: "Ngân hàng đề cương Toán 10–11–12, kiểm tra trên lớp và trình chiếu chữa bài của Nguyễn Trọng Hiếu, THPT Trịnh Hoài Đức.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
