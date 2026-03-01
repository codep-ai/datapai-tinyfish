import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stock Website Change Radar | DataP.ai",
  description: "Monitor US stock company websites for wording changes using TinyFish",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-200 antialiased">
        <header className="border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-blue-400 font-bold text-lg">DataP.ai</span>
            <span className="text-slate-500">×</span>
            <span className="text-green-400 font-bold text-lg">TinyFish</span>
          </div>
          <nav className="flex gap-6 text-sm">
            <a href="/" className="text-slate-400 hover:text-white transition-colors">
              Home
            </a>
            <a href="/alerts" className="text-slate-400 hover:text-white transition-colors">
              Alerts
            </a>
          </nav>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
        <footer className="border-t border-slate-700 px-6 py-4 text-center text-slate-600 text-xs mt-16">
          Stock Website Change Radar — demo only. Not investment advice.
        </footer>
      </body>
    </html>
  );
}
