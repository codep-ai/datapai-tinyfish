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
          <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">

            {/* Left: DataP.ai brand logo — links back to homepage */}
            <a href="https://www.datap.ai" target="_blank" rel="noopener noreferrer" title="DataP.ai"
              className="transition-transform duration-200 hover:scale-105 inline-flex">
              <Image
                src="/logos/datapai.png"
                width={180}
                height={60}
                alt="DataP.ai"
                style={{ height: "60px", width: "auto" }}
              />
            </a>

            {/* Centre: DataP.ai chip + Powered by TinyFish & ag2 */}
            <div className="flex items-center gap-5">
              <span className="bg-white rounded-lg px-3 py-2 flex items-center" style={{ boxShadow: "0 1px 4px rgba(0,0,0,.12)" }}>
                <Image src="/logos/datapai.png" width={120} height={44} alt="DataP.ai" style={{ height: "44px", width: "auto" }} />
              </span>
              <span className="text-gray-400 text-sm font-semibold uppercase tracking-widest">Powered by</span>
              <a href="https://tinyfish.ai" target="_blank" rel="noopener noreferrer" title="TinyFish">
                <Image
                  src="/logos/tinyfish.svg"
                  width={150}
                  height={44}
                  alt="TinyFish"
                  style={{ height: "44px", width: "auto" }}
                />
              </a>
              <span className="text-gray-300 text-2xl font-extralight select-none">&amp;</span>
              <a href="https://www.ag2.ai" target="_blank" rel="noopener noreferrer" title="ag2">
                <Image
                  src="/logos/ag2.png"
                  width={100}
                  height={44}
                  alt="ag2"
                  style={{ height: "44px", width: "auto" }}
                />
              </a>
            </div>

            {/* Right: nav links — datap.ai style */}
            <nav className="flex items-center">
              <a href="/" className="text-gray-600 hover:text-brand transition-colors font-medium"
                style={{ fontSize: "1rem", padding: "0.5rem 1.2rem" }}>Home</a>
              <a href="/alerts" className="text-gray-600 hover:text-brand transition-colors font-medium"
                style={{ fontSize: "1rem", padding: "0.5rem 1.2rem" }}>Alerts</a>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        {/* Footer */}
        <footer style={{ background: "#252525" }} className="mt-16">
          <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col items-center gap-4">
            {/* Logo row: DataP.ai × TinyFish & ag2 */}
            <div className="flex items-center gap-6">
              <span className="bg-white rounded px-2 py-0.5 flex items-center">
                <Image src="/logos/datapai.png" width={80} height={22} alt="DataP.ai" style={{ height: "22px", width: "auto" }} />
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
            <p className="text-gray-600 text-xs">Website Change Intelligence — demo only. Not investment advice.</p>
          </div>
        </footer>

      </body>
    </html>
  );
}
