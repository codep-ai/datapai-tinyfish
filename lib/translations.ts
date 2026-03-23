/**
 * lib/translations.ts
 * Bilingual UI strings — English (default) + Simplified Chinese.
 * Usage:  t(lang, "key")
 */

export type Lang = "en" | "zh" | "zh-TW" | "ja" | "ko" | "vi" | "th" | "ms";

export const tr = {
  // ── Language toggle ──────────────────────────────────────────────────────
  lang_toggle:         { en: "中文",    zh: "EN", "zh-TW": "EN", "ja": "EN", "ko": "EN", "vi": "EN", "th": "EN", "ms": "EN" },
  lang_label:          { en: "English", zh: "中文", "zh-TW": "繁體中文", "ja": "日本語", "ko": "한국어", "vi": "Tiếng Việt", "th": "ภาษาไทย", "ms": "Bahasa Melayu" },

  // ── Navigation ───────────────────────────────────────────────────────────
  nav_usStocks:   { en: "US Stocks",  zh: "美股", "zh-TW": "美股", "ja": "米国株", "ko": "미국주식", "vi": "Cổ phiếu Mỹ", "th": "หุ้นสหรัฐ", "ms": "Saham AS" },
  nav_alerts:     { en: "Alerts",     zh: "预警", "zh-TW": "預警", "ja": "アラート", "ko": "알림", "vi": "Cảnh báo", "th": "แจ้งเตือน", "ms": "Amaran" },
  nav_asx:        { en: "AU Stocks",  zh: "澳股", "zh-TW": "澳股", "ja": "豪州株", "ko": "호주주식", "vi": "Cổ phiếu Úc", "th": "หุ้นออสเตรเลีย", "ms": "Saham Australia" },
  nav_watchlist:  { en: "Watchlist",  zh: "自选股", "zh-TW": "自選股", "ja": "ウォッチリスト", "ko": "관심종목", "vi": "Danh mục", "th": "รายการจับตา", "ms": "Senarai Pantau" },
  nav_aiAnalysis: { en: "AI analysis",zh: "AI分析", "zh-TW": "AI分析", "ja": "AI分析", "ko": "AI분석", "vi": "Phân tích AI", "th": "AI วิเคราะห์", "ms": "Analisis AI" },
  nav_pricing:    { en: "Pricing",    zh: "定价", "zh-TW": "定價", "ja": "料金", "ko": "가격", "vi": "Bảng giá", "th": "ราคา", "ms": "Harga" },
  nav_poweredBy:  { en: "Powered by", zh: "技术支持", "zh-TW": "技術支持", "ja": "提供", "ko": "제공", "vi": "Cung cấp bởi", "th": "ขับเคลื่อนโดย", "ms": "Dikuasakan oleh" },
  nav_login:      { en: "Log in",     zh: "登录", "zh-TW": "登入", "ja": "ログイン", "ko": "로그인", "vi": "Đăng nhập", "th": "เข้าสู่ระบบ", "ms": "Log Masuk" },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer_project:     { en: "A DataP.ai project", zh: "DataP.ai 项目", "zh-TW": "DataP.ai 專案", "ja": "DataP.aiプロジェクト", "ko": "DataP.ai 프로젝트", "vi": "Dự án DataP.ai", "th": "โปรเจค DataP.ai", "ms": "Projek DataP.ai" },
  footer_poweredBy:   { en: "powered by",          zh: "由", "zh-TW": "由", "ja": "提供", "ko": "제공", "vi": "được cung cấp bởi", "th": "ขับเคลื่อนโดย", "ms": "dikuasakan oleh" },
  footer_and:         { en: "&",                   zh: "和", "zh-TW": "和", "ja": "&", "ko": "&", "vi": "&", "th": "&", "ms": "&" },
  footer_realBrowser: { en: "real-browser technology",  zh: "真实浏览器技术", "zh-TW": "真实浏览器技术", "ja": "real-browser technology", "ko": "real-browser technology", "vi": "real-browser technology", "th": "real-browser technology", "ms": "real-browser technology" },
  footer_aiFramework: { en: "AI agent framework",       zh: "AI代理框架", "zh-TW": "AI代理框架", "ja": "AI agent framework", "ko": "AI agent framework", "vi": "AI agent framework", "th": "AI agent framework", "ms": "AI agent framework" },
  footer_websiteIntel:{ en: "Website Change Intelligence", zh: "网站变动情报", "zh-TW": "網站變動情報", "ja": "ウェブサイト変更インテリジェンス", "ko": "웹사이트 변경 인텔리전스", "vi": "Phân tích thay đổi website", "th": "ข้อมูลการเปลี่ยนแปลงเว็บไซต์", "ms": "Perisikan Perubahan Laman Web" },

  // ── AI analysis landing (/intel) ─────────────────────────────────────────
  intel_badge:          { en: "⚡ AI analysis",  zh: "⚡ AI分析", "zh-TW": "⚡ AI分析", "ja": "⚡ AI分析", "ko": "⚡ AI분석", "vi": "⚡ Phân tích AI", "th": "⚡ AI วิเคราะห์", "ms": "⚡ Analisis AI" },
  intel_hero_title:     { en: "Real-time AI signals for any stock", zh: "任意股票的实时AI信号", "zh-TW": "任意股票的即時AI訊號", "ja": "あらゆる銘柄のリアルタイムAIシグナル", "ko": "모든 종목의 실시간 AI 신호", "vi": "Tín hiệu AI thời gian thực cho mọi cổ phiếu", "th": "สัญญาณ AI แบบเรียลไทม์สำหรับทุกหุ้น", "ms": "Isyarat AI masa nyata untuk mana-mana saham" },
  intel_hero_desc:      {
    en: "Multi-timeframe technical analysis · Gemini Vision chart patterns · ASX Trading Signal combining IR language shifts with live price data.",
    zh: "多时间框架技术分析 · Gemini Vision图表形态识别 · ASX交易信号——结合IR语言变化与实时价格数据。",
  },
  intel_search:         { en: "Search stock → AI analysis…", zh: "搜索股票 → AI分析…", "zh-TW": "搜索股票 → AI分析…", "ja": "Search stock → AI analysis…", "ko": "Search stock → AI analysis…", "vi": "Search stock → AI analysis…", "th": "Search stock → AI analysis…", "ms": "Search stock → AI analysis…" },
  intel_withSignal:     { en: "⚡ Stocks with recent AI signal", zh: "⚡ 近期有AI信号的股票", "zh-TW": "⚡ 近期有AI信号的股票", "ja": "⚡ Stocks with recent AI signal", "ko": "⚡ Stocks with recent AI signal", "vi": "⚡ Stocks with recent AI signal", "th": "⚡ Stocks with recent AI signal", "ms": "⚡ Stocks with recent AI signal" },
  intel_period:         { en: "(last 24 hours)",              zh: "（最近24小时）", "zh-TW": "（最近24小时）", "ja": "(last 24 hours)", "ko": "(last 24 hours)", "vi": "(last 24 hours)", "th": "(last 24 hours)", "ms": "(last 24 hours)" },
  intel_allStocks:      { en: "All monitored stocks",         zh: "所有监控股票", "zh-TW": "所有监控股票", "ja": "All monitored stocks", "ko": "All monitored stocks", "vi": "All monitored stocks", "th": "All monitored stocks", "ms": "All monitored stocks" },
  intel_clickGenerate:  { en: "Monitored universe — click to generate AI signal", zh: "监控范围 — 点击生成AI信号", "zh-TW": "监控范围 — 点击生成AI信号", "ja": "Monitored universe — click to generate AI signal", "ko": "Monitored universe — click to generate AI signal", "vi": "Monitored universe — click to generate AI signal", "th": "Monitored universe — click to generate AI signal", "ms": "Monitored universe — click to generate AI signal" },
  intel_noSignal:       { en: "no signal yet",               zh: "暂无信号", "zh-TW": "暂无信号", "ja": "no signal yet", "ko": "no signal yet", "vi": "no signal yet", "th": "no signal yet", "ms": "no signal yet" },
  intel_whatIs:         { en: "What is AI analysis?",        zh: "什么是AI分析？", "zh-TW": "什么是AI分析？", "ja": "What is AI analysis?", "ko": "What is AI analysis?", "vi": "What is AI analysis?", "th": "What is AI analysis?", "ms": "What is AI analysis?" },
  intel_ta_heading:     { en: "📈 Technical Analysis (TA)",   zh: "📈 技术分析(TA)", "zh-TW": "📈 技术分析(TA)", "ja": "📈 Technical Analysis (TA)", "ko": "📈 Technical Analysis (TA)", "vi": "📈 Technical Analysis (TA)", "th": "📈 Technical Analysis (TA)", "ms": "📈 Technical Analysis (TA)" },
  intel_ta_desc:        {
    en: "Multi-timeframe OHLCV data (5m / 30m / 1h / 1d) → RSI, MACD, Bollinger, EMA → Gemini primary analysis → GPT‑5.1 compliance review → structured BUY/HOLD/SELL signal.",
    zh: "多时间框架OHLCV数据（5分/30分/1小时/1天）→ RSI、MACD、布林带、EMA → Gemini主分析 → GPT‑5.1合规审核 → 结构化买入/持有/卖出信号。",
  },
  intel_chart_heading:  { en: "📊 Chart Analysis (CA)",       zh: "📊 图表分析(CA)", "zh-TW": "📊 图表分析(CA)", "ja": "📊 Chart Analysis (CA)", "ko": "📊 Chart Analysis (CA)", "vi": "📊 Chart Analysis (CA)", "th": "📊 Chart Analysis (CA)", "ms": "📊 Chart Analysis (CA)" },
  intel_chart_desc:     {
    en: "Renders a 3-panel dark chart (Price+BBands / RSI / MACD) and sends it to Gemini Vision for real-time pattern recognition — head-and-shoulders, breakouts, divergences.",
    zh: "生成三栏图表（价格+布林带 / RSI / MACD），发送给Gemini Vision进行实时形态识别——头肩顶、突破、背离等。",
  },
  intel_asx_heading:    { en: "🎯 ASX Trading Signal",       zh: "🎯 ASX交易信号", "zh-TW": "🎯 ASX交易信号", "ja": "🎯 ASX Trading Signal", "ko": "🎯 ASX Trading Signal", "vi": "🎯 ASX Trading Signal", "th": "🎯 ASX Trading Signal", "ms": "🎯 ASX Trading Signal" },
  intel_asx_desc:       {
    en: "Unique to DataP.ai: combines TinyFish IR page language intelligence with live multi-timeframe ASX price data → STRONG BUY to STRONG SELL with entry, target and stop-loss per timeframe.",
    zh: "DataP.ai独家：结合TinyFish IR页面语言智能与实时多时间框架ASX价格数据 → 强烈买入至强烈卖出，附各时间框架入场价、目标价及止损位。",
  },

  // ── Per-stock intel page (/ticker/[sym]/intel) ────────────────────────────
  stock_breadcrumb:   { en: "AI analysis",       zh: "AI分析", "zh-TW": "AI分析", "ja": "AI分析", "ko": "AI분석", "vi": "Phân tích AI", "th": "AI วิเคราะห์", "ms": "Analisis AI" },
  stock_pipeline_tf:  { en: "🌊 TinyFish IR scan", zh: "🌊 TinyFish IR扫描", "zh-TW": "🌊 TinyFish IR扫描", "ja": "🌊 TinyFish IR scan", "ko": "🌊 TinyFish IR scan", "vi": "🌊 TinyFish IR scan", "th": "🌊 TinyFish IR scan", "ms": "🌊 TinyFish IR scan" },
  stock_pipeline_yf:  { en: "Yahoo Finance OHLCV", zh: "Yahoo财经OHLCV", "zh-TW": "Yahoo财经OHLCV", "ja": "Yahoo Finance OHLCV", "ko": "Yahoo Finance OHLCV", "vi": "Yahoo Finance OHLCV", "th": "Yahoo Finance OHLCV", "ms": "Yahoo Finance OHLCV" },
  stock_pipeline_ai:  { en: "Gemini + GPT‑5.1",    zh: "Gemini + GPT‑5.1", "zh-TW": "Gemini + GPT‑5.1", "ja": "Gemini + GPT‑5.1", "ko": "Gemini + GPT‑5.1", "vi": "Gemini + GPT‑5.1", "th": "Gemini + GPT‑5.1", "ms": "Gemini + GPT‑5.1" },
  stock_pipeline_sig: { en: "Actionable Signal",   zh: "可操作信号", "zh-TW": "可操作信号", "ja": "Actionable Signal", "ko": "Actionable Signal", "vi": "Actionable Signal", "th": "Actionable Signal", "ms": "Actionable Signal" },
  stock_cta_ir:       { en: "← IR Signal page",   zh: "← IR信号页", "zh-TW": "← IR信号页", "ja": "← IR Signal page", "ko": "← IR Signal page", "vi": "← IR Signal page", "th": "← IR Signal page", "ms": "← IR Signal page" },
  stock_cta_report:   { en: "📋 Full Report",      zh: "📋 完整报告", "zh-TW": "📋 完整报告", "ja": "📋 Full Report", "ko": "📋 Full Report", "vi": "📋 Full Report", "th": "📋 Full Report", "ms": "📋 Full Report" },
  stock_other:        { en: "Other stocks in the monitored universe", zh: "监控范围内的其他股票", "zh-TW": "监控范围内的其他股票", "ja": "Other stocks in the monitored universe", "ko": "Other stocks in the monitored universe", "vi": "Other stocks in the monitored universe", "th": "Other stocks in the monitored universe", "ms": "Other stocks in the monitored universe" },

  // ── TechAnalyticsPanel ────────────────────────────────────────────────────
  panel_heading:         { en: "⚡ AI analysis",          zh: "⚡ AI分析", "zh-TW": "⚡ AI分析", "ja": "⚡ AI分析", "ko": "⚡ AI분석", "vi": "⚡ Phân tích AI", "th": "⚡ AI วิเคราะห์", "ms": "⚡ Analisis AI" },
  panel_tf:              { en: "🌊 TinyFish IR scan",     zh: "🌊 TinyFish IR扫描", "zh-TW": "🌊 TinyFish IR扫描", "ja": "🌊 TinyFish IR scan", "ko": "🌊 TinyFish IR scan", "vi": "🌊 TinyFish IR scan", "th": "🌊 TinyFish IR scan", "ms": "🌊 TinyFish IR scan" },
  panel_yf:              { en: "Yahoo Finance OHLCV",     zh: "Yahoo财经OHLCV", "zh-TW": "Yahoo财经OHLCV", "ja": "Yahoo Finance OHLCV", "ko": "Yahoo Finance OHLCV", "vi": "Yahoo Finance OHLCV", "th": "Yahoo Finance OHLCV", "ms": "Yahoo Finance OHLCV" },
  panel_ai:              { en: "Gemini + GPT‑5.1",        zh: "Gemini + GPT‑5.1", "zh-TW": "Gemini + GPT‑5.1", "ja": "Gemini + GPT‑5.1", "ko": "Gemini + GPT‑5.1", "vi": "Gemini + GPT‑5.1", "th": "Gemini + GPT‑5.1", "ms": "Gemini + GPT‑5.1" },
  panel_sig:             { en: "Actionable Signal",       zh: "可操作信号", "zh-TW": "可操作信号", "ja": "Actionable Signal", "ko": "Actionable Signal", "vi": "Actionable Signal", "th": "Actionable Signal", "ms": "Actionable Signal" },

  panel_btn_ta:          { en: "📈 Technical Analysis (TA)", zh: "📈 技术分析(TA)", "zh-TW": "📈 技术分析(TA)", "ja": "📈 Technical Analysis (TA)", "ko": "📈 Technical Analysis (TA)", "vi": "📈 Technical Analysis (TA)", "th": "📈 Technical Analysis (TA)", "ms": "📈 Technical Analysis (TA)" },
  panel_btn_ta_done:     { en: "📈 TA ✓",                   zh: "📈 TA ✓", "zh-TW": "📈 TA ✓", "ja": "📈 TA ✓", "ko": "📈 TA ✓", "vi": "📈 TA ✓", "th": "📈 TA ✓", "ms": "📈 TA ✓" },
  panel_btn_ta_loading:  { en: "Generating…",               zh: "生成中…", "zh-TW": "生成中…", "ja": "Generating…", "ko": "Generating…", "vi": "Generating…", "th": "Generating…", "ms": "Generating…" },
  panel_btn_chart:       { en: "📊 Chart Analysis (CA)",    zh: "📊 图表分析(CA)", "zh-TW": "📊 图表分析(CA)", "ja": "📊 Chart Analysis (CA)", "ko": "📊 Chart Analysis (CA)", "vi": "📊 Chart Analysis (CA)", "th": "📊 Chart Analysis (CA)", "ms": "📊 Chart Analysis (CA)" },
  panel_btn_chart_done:  { en: "📊 CA ✓",                   zh: "📊 CA ✓", "zh-TW": "📊 CA ✓", "ja": "📊 CA ✓", "ko": "📊 CA ✓", "vi": "📊 CA ✓", "th": "📊 CA ✓", "ms": "📊 CA ✓" },
  panel_btn_chart_loading:{ en: "Rendering…",               zh: "渲染中…", "zh-TW": "渲染中…", "ja": "Rendering…", "ko": "Rendering…", "vi": "Rendering…", "th": "Rendering…", "ms": "Rendering…" },
  panel_btn_asx:         { en: "🎯 ASX Trading Signal",   zh: "🎯 ASX交易信号", "zh-TW": "🎯 ASX交易信号", "ja": "🎯 ASX Trading Signal", "ko": "🎯 ASX Trading Signal", "vi": "🎯 ASX Trading Signal", "th": "🎯 ASX Trading Signal", "ms": "🎯 ASX Trading Signal" },
  panel_btn_asx_done:    { en: "🎯 ASX Signal ✓",         zh: "🎯 ASX信号 ✓", "zh-TW": "🎯 ASX信号 ✓", "ja": "🎯 ASX Signal ✓", "ko": "🎯 ASX Signal ✓", "vi": "🎯 ASX Signal ✓", "th": "🎯 ASX Signal ✓", "ms": "🎯 ASX Signal ✓" },
  panel_btn_asx_loading: { en: "Analysing…",              zh: "分析中…", "zh-TW": "分析中…", "ja": "Analysing…", "ko": "Analysing…", "vi": "Analysing…", "th": "Analysing…", "ms": "Analysing…" },

  panel_ta_time:         { en: "Typically 20–45 seconds", zh: "通常需要20-45秒", "zh-TW": "通常需要20-45秒", "ja": "Typically 20–45 seconds", "ko": "Typically 20–45 seconds", "vi": "Typically 20–45 seconds", "th": "Typically 20–45 seconds", "ms": "Typically 20–45 seconds" },
  panel_chart_time:      { en: "Typically 15–30 seconds", zh: "通常需要15-30秒", "zh-TW": "通常需要15-30秒", "ja": "Typically 15–30 seconds", "ko": "Typically 15–30 seconds", "vi": "Typically 15–30 seconds", "th": "Typically 15–30 seconds", "ms": "Typically 15–30 seconds" },
  panel_asx_time:        { en: "Typically 30–60 seconds", zh: "通常需要30-60秒", "zh-TW": "通常需要30-60秒", "ja": "Typically 30–60 seconds", "ko": "Typically 30–60 seconds", "vi": "Typically 30–60 seconds", "th": "Typically 30–60 seconds", "ms": "Typically 30–60 seconds" },
  panel_tf_context:      { en: "chars from TinyFish IR scan", zh: "字符来自TinyFish IR扫描", "zh-TW": "字符来自TinyFish IR扫描", "ja": "chars from TinyFish IR scan", "ko": "chars from TinyFish IR scan", "vi": "chars from TinyFish IR scan", "th": "chars from TinyFish IR scan", "ms": "chars from TinyFish IR scan" },

  panel_ta_title:        { en: "📈 Technical Analysis (TA)", zh: "📈 技术分析(TA)", "zh-TW": "📈 技术分析(TA)", "ja": "📈 Technical Analysis (TA)", "ko": "📈 Technical Analysis (TA)", "vi": "📈 Technical Analysis (TA)", "th": "📈 Technical Analysis (TA)", "ms": "📈 Technical Analysis (TA)" },
  panel_asx_title:       { en: "🎯 ASX Trading Signal",   zh: "🎯 ASX交易信号", "zh-TW": "🎯 ASX交易信号", "ja": "🎯 ASX Trading Signal", "ko": "🎯 ASX Trading Signal", "vi": "🎯 ASX Trading Signal", "th": "🎯 ASX Trading Signal", "ms": "🎯 ASX Trading Signal" },
  panel_asx_notice:      {
    en: "⚠ Signal based on latest IR page content + live ASX price data. Google Search grounding enabled.",
    zh: "⚠ 信号基于最新IR页面内容 + 实时ASX价格数据。已启用Google搜索增强。",
  },
  panel_collapse:        { en: "▲ collapse",              zh: "▲ 收起", "zh-TW": "▲ 收起", "ja": "▲ 折りたたむ", "ko": "▲ 접기", "vi": "▲ thu gọn", "th": "▲ ย่อ", "ms": "▲ tutup" },
  panel_expand:          { en: "▼ expand",                zh: "▼ 展开", "zh-TW": "▼ 展開", "ja": "▼ 展開", "ko": "▼ 펼치기", "vi": "▼ mở rộng", "th": "▼ ขยาย", "ms": "▼ buka" },
  panel_not_advice:      { en: "NOT financial advice",    zh: "非投资建议", "zh-TW": "非投資建議", "ja": "投資助言ではありません", "ko": "투자 조언이 아닙니다", "vi": "Không phải tư vấn đầu tư", "th": "ไม่ใช่คำแนะนำการลงทุน", "ms": "BUKAN nasihat kewangan" },

  panel_modal_title:     { en: "📊 Chart Analysis (CA)", zh: "📊 图表分析(CA)", "zh-TW": "📊 图表分析(CA)", "ja": "📊 Chart Analysis (CA)", "ko": "📊 Chart Analysis (CA)", "vi": "📊 Chart Analysis (CA)", "th": "📊 Chart Analysis (CA)", "ms": "📊 Chart Analysis (CA)" },
  panel_modal_close:     { en: "Close",                   zh: "关闭", "zh-TW": "關閉", "ja": "閉じる", "ko": "닫기", "vi": "Đóng", "th": "ปิด", "ms": "Tutup" },
} as const;

export function t(lang: Lang, key: keyof typeof tr): string {
  return tr[key][lang];
}
