import type { Metadata } from "next";
import { Poppins, Rajdhani } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import { getAuthUser } from "@/lib/auth";
import { getLang } from "@/lib/getLang";
import { t } from "@/lib/translations";
import { getInvestorProfile } from "@/lib/investorProfile";
import LogoutButton from "./components/LogoutButton";
import LangToggle from "./components/LangToggle";
import ProfileBadge from "./components/ProfileBadge";
import OnboardingBanner from "./components/OnboardingBanner";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, lang] = await Promise.all([getAuthUser(), getLang()]);
  const investorProfile = user ? await getInvestorProfile(user.userId).catch(() => null) : null;

  return (
    <html lang={lang === "zh" ? "zh-CN" : "en"} className={`${poppins.variable} ${rajdhani.variable}`}>
      <body className="min-h-screen bg-[#fcfcfd] text-[#252525] antialiased">

        {/* Navbar — clean white, datap.ai style */}
        <header className="bg-white" style={{ borderBottom: "1px solid #f0f0f0" }}>
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6">

            {/* Left: DataP.ai logo */}
            <a href="https://www.datap.ai" target="_blank" rel="noopener noreferrer" title="DataP.ai"
              className="flex-shrink-0 transition-opacity hover:opacity-80">
              <Image
                src="/logos/datapai.png"
                width={130}
                height={34}
                alt="DataP.ai"
                style={{ height: "34px", width: "auto" }}
              />
            </a>

            {/* Centre: page nav */}
            <nav className="flex items-center gap-0.5 flex-1 justify-center">
              <a href="/" className="text-gray-500 hover:text-[#2e8b57] transition-colors font-medium px-4 py-2 rounded-md hover:bg-gray-50"
                style={{ fontSize: "0.92rem" }}>{t(lang, "nav_usStocks")}</a>
              <a href="/asx" className="text-gray-500 hover:text-[#2e8b57] transition-colors font-medium px-4 py-2 rounded-md hover:bg-gray-50"
                style={{ fontSize: "0.92rem" }}>{t(lang, "nav_asx")}</a>
              <a href="/alerts" className="text-gray-500 hover:text-[#2e8b57] transition-colors font-medium px-4 py-2 rounded-md hover:bg-gray-50"
                style={{ fontSize: "0.92rem" }}>{t(lang, "nav_alerts")}</a>
              <a href="/watchlist" className="text-gray-500 hover:text-[#2e8b57] transition-colors font-medium px-4 py-2 rounded-md hover:bg-gray-50"
                style={{ fontSize: "0.92rem" }}>{t(lang, "nav_watchlist")}</a>
              <a href="/intel" className="text-gray-500 hover:text-[#6366f1] transition-colors font-medium px-4 py-2 rounded-md hover:bg-gray-50"
                style={{ fontSize: "0.92rem" }}>{t(lang, "nav_aiAnalysis")}</a>
              <a href="/screener" className="text-gray-500 hover:text-[#2e8b57] transition-colors font-medium px-4 py-2 rounded-md hover:bg-gray-50"
                style={{ fontSize: "0.92rem" }}>Screener</a>
              <a href="/pricing" className="text-gray-500 hover:text-[#2e8b57] transition-colors font-medium px-4 py-2 rounded-md hover:bg-gray-50"
                style={{ fontSize: "0.92rem" }}>{t(lang, "nav_pricing")}</a>
            </nav>

            {/* Right: sponsor logos + lang toggle + auth */}
            <div className="flex-shrink-0 flex items-center gap-3">

              {/* Powered-by sponsor logos */}
              <div className="hidden md:flex items-center gap-2 border-r border-gray-100 pr-4 mr-1">
                <span className="text-gray-400 text-xs font-medium">{t(lang, "nav_poweredBy")}</span>
                <a href="https://tinyfish.ai" target="_blank" rel="noopener noreferrer" title="TinyFish"
                  className="flex items-center transition-opacity hover:opacity-70">
                  <Image src="/logos/tinyfish.svg" width={60} height={14} alt="TinyFish" style={{ height: "14px", width: "auto" }} />
                </a>
                <span className="text-gray-300 text-sm">&amp;</span>
                <a href="https://www.ag2.ai" target="_blank" rel="noopener noreferrer" title="ag2"
                  className="flex items-center transition-opacity hover:opacity-70">
                  <Image src="/logos/ag2.png" width={28} height={14} alt="ag2" style={{ height: "14px", width: "auto" }} />
                </a>
              </div>

              {/* Language toggle */}
              <LangToggle current={lang} />

              {user ? (
                <>
                  {/* Profile badge — shows risk level, links to /profile */}
                  <ProfileBadge
                    riskTolerance={investorProfile?.risk_tolerance ?? null}
                    onboardingDone={investorProfile?.onboarding_completed ?? false}
                  />
                  <span className="text-sm text-gray-400 max-w-[140px] truncate hidden sm:block" title={user.email}>
                    {user.email}
                  </span>
                  <LogoutButton />
                </>
              ) : (
                <a
                  href="/login"
                  className="inline-flex items-center font-semibold rounded-lg px-5 py-2 transition-all hover:bg-[#2e8b57] hover:text-white"
                  style={{ fontSize: "0.9rem", color: "#2e8b57", border: "1.5px solid #2e8b57" }}
                >
                  {t(lang, "nav_login")}
                </a>
              )}
            </div>
          </div>
        </header>

        {/* Onboarding nudge — only visible to logged-in users who haven't done setup */}
        {user && (
          <OnboardingBanner
            onboardingDone={investorProfile?.onboarding_completed ?? false}
          />
        )}

        <main>{children}</main>

        {/* Footer */}
        <footer style={{ background: "#252525" }} className="mt-16">
          <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-6">
              <span className="bg-white rounded px-2 py-1 flex items-center">
                <Image src="/logos/datapai.png" width={80} height={20} alt="DataP.ai" style={{ height: "20px", width: "auto" }} />
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
              {t(lang, "footer_project")} ·{" "}
              {t(lang, "footer_poweredBy")}{" "}
              <a href="https://tinyfish.ai" target="_blank" rel="noopener noreferrer" className="text-[#8fbc8f] hover:text-[#a8d5a8] transition-colors">TinyFish</a>
              {" "}{t(lang, "footer_realBrowser")} &amp;{" "}
              <a href="https://www.ag2.ai" target="_blank" rel="noopener noreferrer" className="text-[#8fbc8f] hover:text-[#a8d5a8] transition-colors">ag2</a>
              {" "}{t(lang, "footer_aiFramework")}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>{t(lang, "footer_websiteIntel")}</span>
              <a href="/pricing" className="text-[#8fbc8f] hover:text-[#a8d5a8] transition-colors">{t(lang, "nav_pricing")}</a>
              <a href="https://platform.datap.ai/bi" target="_blank" rel="noopener noreferrer" className="text-[#8fbc8f] hover:text-[#a8d5a8] transition-colors">platform.datap.ai</a>
            </div>
          </div>
        </footer>

      </body>
    </html>
  );
}
