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
  title: "Stock Website Change Radar | DataP.ai × TinyFish",
  description: "Monitor US stock company websites for wording changes using TinyFish real-browser technology, powered by DataP.ai",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${rajdhani.variable}`}>
      <body className="min-h-screen bg-[#fcfcfd] text-[#252525] antialiased">

        {/* White navbar — matching datap.ai's actual navbar style */}
        <header className="bg-white border-b border-gray-100" style={{ boxShadow: "0 2px 10px rgba(0,0,0,.06)" }}>
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">

            {/* Co-brand logos */}
            <div className="flex items-center gap-4">
              <a href="https://www.datap.ai" target="_blank" rel="noopener noreferrer" title="DataP.ai">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/datapai-logo.png"
                  alt="DataP.ai"
                  style={{ height: "36px", width: "auto" }}
                />
              </a>
              <span className="text-gray-300 text-2xl font-extralight select-none">×</span>
              <a href="https://tinyfish.ai" target="_blank" rel="noopener noreferrer" title="TinyFish">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/tinyfish-logo.svg"
                  alt="TinyFish"
                  style={{ height: "26px", width: "auto" }}
                />
              </a>
            </div>

            <nav className="flex gap-6 text-sm font-medium">
              <a href="/" className="text-gray-500 hover:text-brand transition-colors">
                Home
              </a>
              <a href="/alerts" className="text-gray-500 hover:text-brand transition-colors">
                Alerts
              </a>
            </nav>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>

        {/* Dark footer — datap.ai style (#252525) with logo attribution */}
        <footer style={{ background: "#252525" }} className="mt-16">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="flex flex-col items-center gap-4">
              {/* Logos in footer */}
              <div className="flex items-center gap-4">
                {/* DataP.ai — inverted to white for dark background */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/datapai-logo.png"
                  alt="DataP.ai"
                  style={{ height: "28px", width: "auto", filter: "brightness(0) invert(1)", opacity: 0.7 }}
                />
                <span className="text-gray-600 text-xl font-extralight select-none">×</span>
                {/* TinyFish — shown in original colours on a white chip */}
                <span className="bg-white rounded px-2 py-0.5 flex items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/tinyfish-logo.svg"
                    alt="TinyFish"
                    style={{ height: "20px", width: "auto" }}
                  />
                </span>
              </div>
              <p className="text-gray-500 text-xs text-center">
                A DataP.ai project · powered by{" "}
                <a href="https://tinyfish.ai" target="_blank" rel="noopener noreferrer" className="text-[#8fbc8f] hover:text-[#a8d5a8] transition-colors">
                  TinyFish
                </a>{" "}
                real-browser technology
              </p>
              <p className="text-gray-600 text-xs">
                Stock Website Change Radar — demo only. Not investment advice.
              </p>
            </div>
          </div>
        </footer>

      </body>
    </html>
  );
}
