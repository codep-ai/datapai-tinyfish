import type { Metadata } from "next";
import { Poppins, Rajdhani } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import { getAuthUser } from "@/lib/auth";
import { getLang } from "@/lib/getLang";
import { getUserById } from "@/lib/db";
import { loadTranslations, loadLanguages } from "@/lib/i18n";
import { t, HTML_LANG } from "@/lib/translations";
import { getInvestorProfile } from "@/lib/investorProfile";
import LogoutButton from "./components/LogoutButton";
import LangToggle from "./components/LangToggle";
import ProfileBadge from "./components/ProfileBadge";
import EarlySupporterBadge from "./components/EarlySupporterBadge";
import OnboardingBanner from "./components/OnboardingBanner";
import MarketDropdown from "./components/MarketDropdown";
import GlobalCopilot from "./components/GlobalCopilot";

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
  const [labels, languages, investorProfile, dbUser] = await Promise.all([
    loadTranslations(lang),
    loadLanguages(),
    user ? getInvestorProfile(user.userId).catch(() => null) : Promise.resolve(null),
    user ? getUserById(user.userId).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <html lang={HTML_LANG[lang] ?? "en"} className={`${poppins.variable} ${rajdhani.variable}`}>
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
              <MarketDropdown
                buttonLabel={t(labels, "nav_markets")}
                markets={[
                  { href: "/", label: t(labels, "nav_usStocks"), flag: "🇺🇸" },
                  { href: "/asx", label: t(labels, "nav_asx"), flag: "🇦🇺" },
                  { href: "/china", label: t(labels, "nav_china"), flag: "🇨🇳" },
                  { href: "/hongkong", label: t(labels, "nav_hongkong"), flag: "🇭🇰" },
                  { href: "/vietnam", label: t(labels, "nav_vietnam"), flag: "🇻🇳" },
                  { href: "/thailand", label: t(labels, "nav_thailand"), flag: "🇹🇭" },
                  { href: "/malaysia", label: t(labels, "nav_malaysia"), flag: "🇲🇾" },
                  { href: "/indonesia", label: t(labels, "nav_indonesia"), flag: "🇮🇩" },
                ]}
              />
              <a href="/watchlist" className="text-gray-500 hover:text-[#2e8b57] transition-colors font-medium px-4 py-2 rounded-md hover:bg-gray-50"
                style={{ fontSize: "0.92rem" }}>{t(labels, "nav_watchlist")}</a>
              <a href="/intel" className="text-gray-500 hover:text-[#6366f1] transition-colors font-medium px-4 py-2 rounded-md hover:bg-gray-50"
                style={{ fontSize: "0.92rem" }}>{t(labels, "nav_aiAnalysis")}</a>
              <a href="/screener" className="text-gray-500 hover:text-[#2e8b57] transition-colors font-medium px-4 py-2 rounded-md hover:bg-gray-50"
                style={{ fontSize: "0.92rem" }}>{t(labels, "nav_screener")}</a>
              <a href="/studio" className="text-gray-500 hover:text-[#6366f1] transition-colors font-medium px-4 py-2 rounded-md hover:bg-gray-50"
                style={{ fontSize: "0.92rem" }}>{t(labels, "nav_studio")}</a>
              <a href="/performance" className="text-gray-500 hover:text-[#6366f1] transition-colors font-medium px-4 py-2 rounded-md hover:bg-gray-50"
                style={{ fontSize: "0.92rem" }}>{t(labels, "nav_performance")}</a>
              <a href="/indexes" className="text-gray-500 hover:text-[#2e8b57] transition-colors font-medium px-4 py-2 rounded-md hover:bg-gray-50"
                style={{ fontSize: "0.92rem" }}>{t(labels, "nav_indexes")}</a>
              <a href="/portfolio" className="text-gray-500 hover:text-[#6366f1] transition-colors font-medium px-4 py-2 rounded-md hover:bg-gray-50"
                style={{ fontSize: "0.92rem" }}>{t(labels, "nav_portfolio")}</a>
              <a href="/pricing" className="text-gray-500 hover:text-[#2e8b57] transition-colors font-medium px-4 py-2 rounded-md hover:bg-gray-50"
                style={{ fontSize: "0.92rem" }}>{t(labels, "nav_pricing")}</a>
            </nav>

            {/* Right: sponsor logos + lang toggle + auth */}
            <div className="flex-shrink-0 flex items-center gap-3">

              {/* Powered-by sponsor logos */}
              <div className="hidden md:flex items-center gap-2 border-r border-gray-100 pr-4 mr-1">
                <span className="text-gray-400 text-xs font-medium">{t(labels, "nav_poweredBy")}</span>
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
              <LangToggle current={lang} languages={languages} />

              {user ? (
                <>
                  {/* Early Supporter badge */}
                  {dbUser?.badge === "early_supporter" && dbUser.badge_number != null && (
                    <EarlySupporterBadge
                      badgeNumber={dbUser.badge_number}
                      label={(t(labels, "badge_early_supporter_hash") || "Early Supporter #{n}").replace("{n}", String(dbUser.badge_number))}
                      description={t(labels, "badge_early_supporter_desc") || undefined}
                    />
                  )}
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
                  {t(labels, "nav_login")}
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

        {/* Global AI Copilot — floating chat on every page */}
        <GlobalCopilot lang={lang} />

        {/* Footer */}
        <footer style={{ background: "#252525" }} className="mt-16">
          {/* ── ASIC-style General Advice Warning ── */}
          <div style={{ background: "linear-gradient(90deg, #1a1a2e, #16213e)" }} className="border-t border-amber-500/30">
            <div className="max-w-7xl mx-auto px-6 py-4 space-y-3">
              {/* General Advice Warning (ASIC RG 244 compliant, i18n) */}
              <div className="flex items-start gap-3 bg-red-950/40 border border-red-500/20 rounded-xl px-5 py-4">
                <span className="text-red-400 text-xl flex-shrink-0 mt-0.5">&#9888;</span>
                <div>
                  <p className="text-red-200 text-sm font-bold mb-1">{t(labels, "asic_warning_title")}</p>
                  <p className="text-red-100/80 text-xs leading-relaxed">
                    {t(labels, "asic_warning_body")}
                  </p>
                </div>
              </div>
              {/* AI Disclaimer */}
              <div className="flex items-start gap-3 bg-amber-950/40 border border-amber-500/20 rounded-xl px-5 py-4">
                <span className="text-amber-400 text-xl flex-shrink-0 mt-0.5">&#9888;</span>
                <div>
                  <p className="text-amber-200 text-sm font-bold mb-1">{t(labels, "disclaimer_title")}</p>
                  <p className="text-amber-100/80 text-xs leading-relaxed">
                    {t(labels, "disclaimer_body")}
                  </p>
                </div>
              </div>
            </div>
          </div>

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
              {t(labels, "footer_project")} ·{" "}
              {t(labels, "footer_poweredBy")}{" "}
              <a href="https://tinyfish.ai" target="_blank" rel="noopener noreferrer" className="text-[#8fbc8f] hover:text-[#a8d5a8] transition-colors">TinyFish</a>
              {" "}{t(labels, "footer_realBrowser")} &amp;{" "}
              <a href="https://www.ag2.ai" target="_blank" rel="noopener noreferrer" className="text-[#8fbc8f] hover:text-[#a8d5a8] transition-colors">ag2</a>
              {" "}{t(labels, "footer_aiFramework")}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>{t(labels, "footer_websiteIntel")}</span>
              <a href="/pricing" className="text-[#8fbc8f] hover:text-[#a8d5a8] transition-colors">{t(labels, "nav_pricing")}</a>
              <a href="https://platform.datap.ai/bi" target="_blank" rel="noopener noreferrer" className="text-[#8fbc8f] hover:text-[#a8d5a8] transition-colors">platform.datap.ai</a>
            </div>

            {/* Company info */}
            <div className="border-t border-gray-700 mt-6 pt-5 text-center space-y-1">
              <p className="text-gray-500 text-xs">
                &copy; 2020–2026 AWSME Pty Ltd &middot;{" "}
                <a href="/terms" className="text-[#8fbc8f] hover:text-[#a8d5a8] transition-colors">Terms</a> &middot;{" "}
                <a href="/privacy" className="text-[#8fbc8f] hover:text-[#a8d5a8] transition-colors">Privacy</a>
              </p>
              <p className="text-gray-600 text-xs">
                Suite 2/200 Mona Vale Rd, St Ives NSW 2075
              </p>
              <p className="text-gray-600 text-xs">
                <a href="tel:+61431525939" className="hover:text-gray-400 transition-colors">0431 525 939</a> &middot;{" "}
                <a href="mailto:info@datap.ai" className="text-[#8fbc8f] hover:text-[#a8d5a8] transition-colors">info@datap.ai</a>
              </p>
            </div>
          </div>
        </footer>

      </body>
    </html>
  );
}
