import type { Metadata } from "next";
import { Poppins, Rajdhani } from "next/font/google";
import Image from "next/image";
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
  title: "DataP.ai × TinyFish × ag2 | Website Change Intelligence",
  description: "A DataP.ai project · powered by TinyFish real-browser technology & ag2 AI agent framework",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${rajdhani.variable}`}>
      <body className="min-h-screen bg-[#fcfcfd] text-[#252525] antialiased">

        {/* Navbar */}
        <header className="bg-white border-b border-gray-100" style={{ boxShadow: "0 2px 10px rgba(0,0,0,.1)" }}>
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

            {/* Left: DataP.ai brand logo (SVG text version) — links to datap.ai */}
            <a href="https://www.datap.ai" target="_blank" rel="noopener noreferrer" title="DataP.ai"
              className="transition-transform duration-200 hover:scale-105 inline-flex">
              <Image
                src="/logos/datapai.svg"
                width={160}
                height={41}
                alt="DataP.ai"
                style={{ height: "41px", width: "auto" }}
              />
            </a>

            {/* Centre: Powered by TinyFish & ag2 */}
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-widest">Powered by</span>
              <a href="https://tinyfish.ai" target="_blank" rel="noopener noreferrer" title="TinyFish">
                <Image
                  src="/logos/tinyfish.svg"
                  width={140}
                  height={40}
                  alt="TinyFish"
                  style={{ height: "40px", width: "auto" }}
                />
              </a>
              <span className="text-gray-300 text-xl font-extralight select-none">&amp;</span>
              <a href="https://www.ag2.ai" target="_blank" rel="noopener noreferrer" title="ag2">
                <Image
                  src="/logos/ag2.png"
                  width={90}
                  height={40}
                  alt="ag2"
                  style={{ height: "40px", width: "auto" }}
                />
              </a>
            </div>

            {/* Right: nav links + Login */}
            <nav className="flex items-center gap-1">
              <a href="/" className="text-gray-600 hover:text-brand transition-colors font-medium"
                style={{ fontSize: "0.95rem", padding: "0.5rem 1rem" }}>Home</a>
              <a href="/alerts" className="text-gray-600 hover:text-brand transition-colors font-medium"
                style={{ fontSize: "0.95rem", padding: "0.5rem 1rem" }}>Alerts</a>
              <a href="/asx" className="text-gray-600 hover:text-brand transition-colors font-medium"
                style={{ fontSize: "0.95rem", padding: "0.5rem 1rem" }}>
                <Image src="/logos/asx.svg" width={28} height={18} alt="ASX" style={{ height: "18px", width: "auto", display: "inline" }} />
                {" "}Australia
              </a>
              <a
                href="https://platform.datap.ai/bi"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 inline-flex items-center gap-1.5 font-semibold text-white rounded-lg px-4 py-2 transition-all hover:brightness-110 hover:-translate-y-0.5"
                style={{ fontSize: "0.9rem", background: "#2e8b57" }}
              >
                🔐 Login
              </a>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        {/* Footer */}
        <footer style={{ background: "#252525" }} className="mt-16">
          <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col items-center gap-4">
            {/* Logo row: DataP.ai × TinyFish & ag2 */}
            <div className="flex items-center gap-6">
              <span className="bg-white rounded px-2 py-1 flex items-center">
                <Image src="/logos/datapai.svg" width={80} height={20} alt="DataP.ai" style={{ height: "20px", width: "auto" }} />
              </span>
              <span className="text-gray-600 text-xl font-extralight select-none">×</span>
              <span className="bg-white rounded px-2 py-0.5 flex items-center">
                <Image src="/logos/tinyfish.svg" width={80} height={18} alt="TinyFish" style={{ height: "18px", width: "auto" }} />
              </span>
              <span className="text-gray-600 text-xl font-extralight select-none">&amp;</span>
              <span className="bg-white rounded px-2 py-0.5 flex items-center">
                <Image src="/logos/ag2.png" width={48} height={18} alt="ag2" style={{ height: "18px", width: "auto" }} />
              </span>
            </div>
            <p className="text-gray-500 text-xs text-center">
              A{" "}
              <a href="https://www.datap.ai" target="_blank" rel="noopener noreferrer" className="text-[#8fbc8f] hover:text-[#a8d5a8] transition-colors">DataP.ai</a>
              {" "}project · powered by{" "}
              <a href="https://tinyfish.ai" target="_blank" rel="noopener noreferrer" className="text-[#8fbc8f] hover:text-[#a8d5a8] transition-colors">TinyFish</a>
              {" "}real-browser technology &amp;{" "}
              <a href="https://www.ag2.ai" target="_blank" rel="noopener noreferrer" className="text-[#8fbc8f] hover:text-[#a8d5a8] transition-colors">ag2</a>
              {" "}AI agent framework
            </p>
            <p className="text-gray-600 text-xs">Website Change Intelligence · <a href="https://platform.datap.ai/bi" target="_blank" rel="noopener noreferrer" className="text-[#8fbc8f] hover:text-[#a8d5a8]">platform.datap.ai</a></p>
          </div>
        </footer>

      </body>
    </html>
  );
}
