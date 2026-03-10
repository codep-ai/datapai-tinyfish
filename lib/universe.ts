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

/** ASX-listed Australian companies monitored for website change intelligence. */
export const ASX_UNIVERSE: TickerInfo[] = [
  { symbol: "BHP",  name: "BHP Group",               url: "https://www.asx.com.au/asx/1/company/BHP/announcements?count=20", exchange: "ASX" },
  { symbol: "CBA",  name: "Commonwealth Bank",        url: "https://www.asx.com.au/asx/1/company/CBA/announcements?count=20", exchange: "ASX" },
  { symbol: "CSL",  name: "CSL Limited",              url: "https://www.asx.com.au/asx/1/company/CSL/announcements?count=20", exchange: "ASX" },
  { symbol: "NAB",  name: "Natl Australia Bank",      url: "https://www.asx.com.au/asx/1/company/NAB/announcements?count=20", exchange: "ASX" },
  { symbol: "ANZ",  name: "ANZ Group",                url: "https://www.asx.com.au/asx/1/company/ANZ/announcements?count=20", exchange: "ASX" },
  { symbol: "WBC",  name: "Westpac Banking",          url: "https://www.asx.com.au/asx/1/company/WBC/announcements?count=20", exchange: "ASX" },
  { symbol: "WES",  name: "Wesfarmers",               url: "https://www.asx.com.au/asx/1/company/WES/announcements?count=20", exchange: "ASX" },
  { symbol: "MQG",  name: "Macquarie Group",          url: "https://www.asx.com.au/asx/1/company/MQG/announcements?count=20", exchange: "ASX" },
  { symbol: "TLS",  name: "Telstra",                  url: "https://www.asx.com.au/asx/1/company/TLS/announcements?count=20", exchange: "ASX" },
  { symbol: "WOW",  name: "Woolworths Group",         url: "https://www.asx.com.au/asx/1/company/WOW/announcements?count=20", exchange: "ASX" },
  { symbol: "RIO",  name: "Rio Tinto",                url: "https://www.asx.com.au/asx/1/company/RIO/announcements?count=20", exchange: "ASX" },
  { symbol: "FMG",  name: "Fortescue",                url: "https://www.asx.com.au/asx/1/company/FMG/announcements?count=20", exchange: "ASX" },
  { symbol: "TWE",  name: "Treasury Wine Estates",    url: "https://www.asx.com.au/asx/1/company/TWE/announcements?count=20", exchange: "ASX" },
  { symbol: "GMG",  name: "Goodman Group",            url: "https://www.asx.com.au/asx/1/company/GMG/announcements?count=20", exchange: "ASX" },
  { symbol: "STO",  name: "Santos",                   url: "https://www.asx.com.au/asx/1/company/STO/announcements?count=20", exchange: "ASX" },
  { symbol: "ORG",  name: "Origin Energy",            url: "https://www.asx.com.au/asx/1/company/ORG/announcements?count=20", exchange: "ASX" },
  { symbol: "WDS",  name: "Woodside Energy",          url: "https://www.asx.com.au/asx/1/company/WDS/announcements?count=20", exchange: "ASX" },
  { symbol: "NCM",  name: "Newmont (ASX)",            url: "https://www.asx.com.au/asx/1/company/NCM/announcements?count=20", exchange: "ASX" },
];

/** All monitored tickers across all markets. */
export const UNIVERSE_ALL: TickerInfo[] = [...UNIVERSE, ...ASX_UNIVERSE];
