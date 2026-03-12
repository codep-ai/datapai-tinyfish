export interface TickerInfo {
  symbol: string;
  name: string;
  url: string;
  exchange?: "NASDAQ" | "NYSE" | "ASX";
}

export const UNIVERSE: TickerInfo[] = [
  { symbol: "ACMR",  name: "ACM Research",           url: "https://ir.acmrcsh.com/news-releases" },
  { symbol: "AEHR",  name: "Aehr Test Systems",       url: "https://ir.aehr.com/news-releases" },
  { symbol: "ATRC",  name: "AtriCure",                url: "https://ir.atricure.com/news-releases" },
  { symbol: "CRVL",  name: "CorVel Corp",             url: "https://ir.corvel.com/news-releases" },
  { symbol: "ERII",  name: "Energy Recovery",         url: "https://ir.energyrecovery.com/news-releases" },
  { symbol: "FLNC",  name: "Fluence Energy",          url: "https://ir.fluenceenergy.com/news-releases" },
  { symbol: "GATO",  name: "Gatos Silver",            url: "https://www.gatossilver.com/investors/news-releases" },
  { symbol: "HIMS",  name: "Hims & Hers Health",      url: "https://investors.forhims.com/news-releases" },
  { symbol: "IIIV",  name: "i3 Verticals",            url: "https://ir.i3verticals.com/news-releases" },
  { symbol: "KTOS",  name: "Kratos Defense",          url: "https://ir.kratosdefense.com/news-releases" },
  { symbol: "LBRT",  name: "Liberty Energy",          url: "https://ir.libertyenergy.com/news-releases" },
  { symbol: "MARA",  name: "MARA Holdings",           url: "https://ir.mara.com/news-releases" },
  { symbol: "MGNI",  name: "Magnite",                 url: "https://ir.magnite.com/news-releases" },
  { symbol: "MNDY",  name: "monday.com",              url: "https://ir.monday.com/news-releases" },
  { symbol: "NOVA",  name: "Sunnova Energy",          url: "https://investors.sunnova.com/news-releases" },
  { symbol: "NTST",  name: "NETSTREIT Corp",          url: "https://ir.netstreit.com/news-releases" },
  { symbol: "PHAT",  name: "Phathom Pharmaceuticals", url: "https://ir.phathompharma.com/news-releases" },
  { symbol: "PRTS",  name: "CarParts.com",            url: "https://ir.carparts.com/news-releases" },
  { symbol: "SHYF",  name: "The Shyft Group",         url: "https://ir.theshyftgroup.com/news-releases" },
  { symbol: "TMDX",  name: "TransMedics Group",       url: "https://ir.transmedics.com/news-releases" },
];

/** ASX-listed Australian companies monitored for website change intelligence.
 *  URLs point to each company's investor relations news/announcements page —
 *  same approach as US stocks (TinyFish browser fetch, real document text). */
export const ASX_UNIVERSE: TickerInfo[] = [
  { symbol: "BHP",  name: "BHP Group",               url: "https://www.bhp.com/investors/news-and-media/news-releases", exchange: "ASX" },
  { symbol: "CBA",  name: "Commonwealth Bank",        url: "https://www.commbank.com.au/about-us/shareholders/shareholder-centre/asx-announcements.html", exchange: "ASX" },
  { symbol: "CSL",  name: "CSL Limited",              url: "https://www.csl.com/investors/investor-news", exchange: "ASX" },
  { symbol: "NAB",  name: "Natl Australia Bank",      url: "https://investor.nab.com.au/news-releases", exchange: "ASX" },
  { symbol: "ANZ",  name: "ANZ Group",                url: "https://www.anz.com/about-us/media-centre/news-and-stories/shareholder-news", exchange: "ASX" },
  { symbol: "WBC",  name: "Westpac Banking",          url: "https://www.westpac.com.au/about-westpac/investors/asx-announcements", exchange: "ASX" },
  { symbol: "WES",  name: "Wesfarmers",               url: "https://www.wesfarmers.com.au/investors/asx-announcements", exchange: "ASX" },
  { symbol: "MQG",  name: "Macquarie Group",          url: "https://www.macquarie.com/au/en/about/investors/news.html", exchange: "ASX" },
  { symbol: "TLS",  name: "Telstra",                  url: "https://ir.telstra.com/news-releases", exchange: "ASX" },
  { symbol: "WOW",  name: "Woolworths Group",         url: "https://www.woolworthsgroup.com.au/investors/asx-announcements-and-reports", exchange: "ASX" },
  { symbol: "RIO",  name: "Rio Tinto",                url: "https://www.riotinto.com/en/investors/news-and-reports", exchange: "ASX" },
  { symbol: "FMG",  name: "Fortescue",                url: "https://investor.fmgl.com.au/news-releases", exchange: "ASX" },
  { symbol: "TWE",  name: "Treasury Wine Estates",    url: "https://ir.tweglobal.com/news-releases", exchange: "ASX" },
  { symbol: "GMG",  name: "Goodman Group",            url: "https://www.goodman.com/investors/asx-announcements", exchange: "ASX" },
  { symbol: "STO",  name: "Santos",                   url: "https://www.santosltd.com/investors/asx-announcements", exchange: "ASX" },
  { symbol: "ORG",  name: "Origin Energy",            url: "https://www.originenergy.com.au/about/investors-and-media/asx-announcements", exchange: "ASX" },
  { symbol: "WDS",  name: "Woodside Energy",          url: "https://www.woodside.com/investors/asx-announcements", exchange: "ASX" },
  { symbol: "QAN",  name: "Qantas Airways",           url: "https://investor.qantas.com/news-releases", exchange: "ASX" },
];

/** All monitored tickers across all markets. */
export const UNIVERSE_ALL: TickerInfo[] = [...UNIVERSE, ...ASX_UNIVERSE];
