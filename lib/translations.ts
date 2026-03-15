/**
 * lib/translations.ts
 * Bilingual UI strings — English (default) + Simplified Chinese.
 * Usage:  t(lang, "key")
 */

export type Lang = "en" | "zh";

export const tr = {
  // ── Language toggle ──────────────────────────────────────────────────────
  lang_toggle:         { en: "中文",    zh: "EN" },
  lang_label:          { en: "English", zh: "中文" },

  // ── Navigation ───────────────────────────────────────────────────────────
  nav_usStocks:   { en: "US Stocks",  zh: "美股" },
  nav_alerts:     { en: "Alerts",     zh: "预警" },
  nav_asx:        { en: "AU Stock",   zh: "澳股" },
  nav_watchlist:  { en: "Watchlist",  zh: "自选股" },
  nav_aiAnalysis: { en: "AI analysis",zh: "AI分析" },
  nav_pricing:    { en: "Pricing",    zh: "定价" },
  nav_poweredBy:  { en: "Powered by", zh: "技术支持" },
  nav_login:      { en: "Log in",     zh: "登录" },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer_project:     { en: "A DataP.ai project", zh: "DataP.ai 项目" },
  footer_poweredBy:   { en: "powered by",          zh: "由" },
  footer_and:         { en: "&",                   zh: "和" },
  footer_realBrowser: { en: "real-browser technology",  zh: "真实浏览器技术" },
  footer_aiFramework: { en: "AI agent framework",       zh: "AI代理框架" },
  footer_websiteIntel:{ en: "Website Change Intelligence", zh: "网站变动情报" },

  // ── AI analysis landing (/intel) ─────────────────────────────────────────
  intel_badge:          { en: "⚡ AI analysis",  zh: "⚡ AI分析" },
  intel_hero_title:     { en: "Real-time AI signals for any stock", zh: "任意股票的实时AI信号" },
  intel_hero_desc:      {
    en: "Multi-timeframe technical analysis · Gemini Vision chart patterns · ASX Trading Signal combining IR language shifts with live price data.",
    zh: "多时间框架技术分析 · Gemini Vision图表形态识别 · ASX交易信号——结合IR语言变化与实时价格数据。",
  },
  intel_search:         { en: "Search stock → AI analysis…", zh: "搜索股票 → AI分析…" },
  intel_withSignal:     { en: "⚡ Stocks with recent AI signal", zh: "⚡ 近期有AI信号的股票" },
  intel_period:         { en: "(last 24 hours)",              zh: "（最近24小时）" },
  intel_allStocks:      { en: "All monitored stocks",         zh: "所有监控股票" },
  intel_clickGenerate:  { en: "Monitored universe — click to generate AI signal", zh: "监控范围 — 点击生成AI信号" },
  intel_noSignal:       { en: "no signal yet",               zh: "暂无信号" },
  intel_whatIs:         { en: "What is AI analysis?",        zh: "什么是AI分析？" },
  intel_ta_heading:     { en: "📈 Technical Analysis (TA)",   zh: "📈 技术分析(TA)" },
  intel_ta_desc:        {
    en: "Multi-timeframe OHLCV data (5m / 30m / 1h / 1d) → RSI, MACD, Bollinger, EMA → Gemini primary analysis → GPT‑5.1 compliance review → structured BUY/HOLD/SELL signal.",
    zh: "多时间框架OHLCV数据（5分/30分/1小时/1天）→ RSI、MACD、布林带、EMA → Gemini主分析 → GPT‑5.1合规审核 → 结构化买入/持有/卖出信号。",
  },
  intel_chart_heading:  { en: "📊 Chart Analysis (CA)",       zh: "📊 图表分析(CA)" },
  intel_chart_desc:     {
    en: "Renders a 3-panel dark chart (Price+BBands / RSI / MACD) and sends it to Gemini Vision for real-time pattern recognition — head-and-shoulders, breakouts, divergences.",
    zh: "生成三栏图表（价格+布林带 / RSI / MACD），发送给Gemini Vision进行实时形态识别——头肩顶、突破、背离等。",
  },
  intel_asx_heading:    { en: "🎯 ASX Trading Signal",       zh: "🎯 ASX交易信号" },
  intel_asx_desc:       {
    en: "Unique to DataP.ai: combines TinyFish IR page language intelligence with live multi-timeframe ASX price data → STRONG BUY to STRONG SELL with entry, target and stop-loss per timeframe.",
    zh: "DataP.ai独家：结合TinyFish IR页面语言智能与实时多时间框架ASX价格数据 → 强烈买入至强烈卖出，附各时间框架入场价、目标价及止损位。",
  },

  // ── Per-stock intel page (/ticker/[sym]/intel) ────────────────────────────
  stock_breadcrumb:   { en: "AI analysis",       zh: "AI分析" },
  stock_pipeline_tf:  { en: "🌊 TinyFish IR scan", zh: "🌊 TinyFish IR扫描" },
  stock_pipeline_yf:  { en: "Yahoo Finance OHLCV", zh: "Yahoo财经OHLCV" },
  stock_pipeline_ai:  { en: "Gemini + GPT‑5.1",    zh: "Gemini + GPT‑5.1" },
  stock_pipeline_sig: { en: "Actionable Signal",   zh: "可操作信号" },
  stock_cta_ir:       { en: "← IR Signal page",   zh: "← IR信号页" },
  stock_cta_report:   { en: "📋 Full Report",      zh: "📋 完整报告" },
  stock_other:        { en: "Other stocks in the monitored universe", zh: "监控范围内的其他股票" },

  // ── TechAnalyticsPanel ────────────────────────────────────────────────────
  panel_heading:         { en: "⚡ AI analysis",          zh: "⚡ AI分析" },
  panel_tf:              { en: "🌊 TinyFish IR scan",     zh: "🌊 TinyFish IR扫描" },
  panel_yf:              { en: "Yahoo Finance OHLCV",     zh: "Yahoo财经OHLCV" },
  panel_ai:              { en: "Gemini + GPT‑5.1",        zh: "Gemini + GPT‑5.1" },
  panel_sig:             { en: "Actionable Signal",       zh: "可操作信号" },

  panel_btn_ta:          { en: "📈 Technical Analysis (TA)", zh: "📈 技术分析(TA)" },
  panel_btn_ta_done:     { en: "📈 TA ✓",                   zh: "📈 TA ✓" },
  panel_btn_ta_loading:  { en: "Generating…",               zh: "生成中…" },
  panel_btn_chart:       { en: "📊 Chart Analysis (CA)",    zh: "📊 图表分析(CA)" },
  panel_btn_chart_done:  { en: "📊 CA ✓",                   zh: "📊 CA ✓" },
  panel_btn_chart_loading:{ en: "Rendering…",               zh: "渲染中…" },
  panel_btn_asx:         { en: "🎯 ASX Trading Signal",   zh: "🎯 ASX交易信号" },
  panel_btn_asx_done:    { en: "🎯 ASX Signal ✓",         zh: "🎯 ASX信号 ✓" },
  panel_btn_asx_loading: { en: "Analysing…",              zh: "分析中…" },

  panel_ta_time:         { en: "Typically 20–45 seconds", zh: "通常需要20-45秒" },
  panel_chart_time:      { en: "Typically 15–30 seconds", zh: "通常需要15-30秒" },
  panel_asx_time:        { en: "Typically 30–60 seconds", zh: "通常需要30-60秒" },
  panel_tf_context:      { en: "chars from TinyFish IR scan", zh: "字符来自TinyFish IR扫描" },

  panel_ta_title:        { en: "📈 Technical Analysis (TA)", zh: "📈 技术分析(TA)" },
  panel_asx_title:       { en: "🎯 ASX Trading Signal",   zh: "🎯 ASX交易信号" },
  panel_asx_notice:      {
    en: "⚠ Signal based on latest IR page content + live ASX price data. Google Search grounding enabled.",
    zh: "⚠ 信号基于最新IR页面内容 + 实时ASX价格数据。已启用Google搜索增强。",
  },
  panel_collapse:        { en: "▲ collapse",              zh: "▲ 收起" },
  panel_expand:          { en: "▼ expand",                zh: "▼ 展开" },
  panel_not_advice:      { en: "NOT financial advice",    zh: "非投资建议" },

  panel_modal_title:     { en: "📊 Chart Analysis (CA)", zh: "📊 图表分析(CA)" },
  panel_modal_close:     { en: "Close",                   zh: "关闭" },
} as const;

export function t(lang: Lang, key: keyof typeof tr): string {
  return tr[key][lang];
}
