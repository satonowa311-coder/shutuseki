import type { Metadata } from "next";
import "./satonowa.css";

export const metadata: Metadata = {
  title: "さとのわ | 出席と日々の記録",
  description: "来所の記録と内部デイリー、日付入りの年間出席簿。",
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
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
