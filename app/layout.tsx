import type { Metadata } from "next";
import { Poppins, Rajdhani } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-rajdhani",
});

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
    <html lang="en" className={`${poppins.variable} ${rajdhani.variable}`}>
      <body className="min-h-screen bg-[#fcfcfd] text-[#252525] antialiased">

        {/* datap.ai-style green gradient header */}
        <header style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)" }}>
          <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">

            {/* Co-branding */}
            <div>
              <div className="flex items-center gap-3">
                <span className="text-white font-bold text-2xl tracking-wide">DataP.ai</span>
                <span className="text-white/50 font-light text-xl">×</span>
                <span className="text-white/90 font-bold text-2xl tracking-wide">TinyFish</span>
              </div>
              <p className="text-white/70 text-xs mt-0.5 font-light">
                Stock Change Radar · powered by TinyFish real-browser technology
              </p>
            </div>

            <nav className="flex gap-6 text-sm">
              <a href="/" className="text-white/80 hover:text-white transition-colors font-medium">
                Home
              </a>
              <a href="/alerts" className="text-white/80 hover:text-white transition-colors font-medium">
                Alerts
              </a>
            </nav>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>

        {/* datap.ai-style dark footer with co-branding attribution */}
        <footer className="mt-16" style={{ background: "#252525" }}>
          <div className="max-w-6xl mx-auto px-6 py-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-[#8fbc8f] font-semibold text-sm">DataP.ai</span>
              <span className="text-gray-500 text-sm">in collaboration with</span>
              <span className="text-[#a8d5a8] font-semibold text-sm">TinyFish</span>
            </div>
            <p className="text-gray-600 text-xs">
              Stock Website Change Radar — demo only. Not investment advice.
            </p>
          </div>
        </footer>

      </body>
    </html>
  );
}
