import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "原状回復費用計算ツール",
  description: "賃貸物件の原状回復費用を自動計算し、借主と貸主の負担を振り分けるツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {children}
        <footer className="fixed bottom-0 left-0 right-0 bg-yellow-50 border-t border-yellow-200 p-2 text-center text-xs text-yellow-800">
          ⚠️ 本ツールは参考情報を提供するものであり、法律助言ではありません。最終判断は当事者または専門家にご相談ください。
        </footer>
      </body>
    </html>
  );
}
