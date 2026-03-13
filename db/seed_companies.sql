-- =============================================================================
-- DataP.ai × TinyFish  —  Seed: Monitored Company Universe
-- =============================================================================
--
-- Populates datapai.companies with the tickers monitored by the scan pipeline.
-- Safe to re-run (ON CONFLICT DO NOTHING).
--
-- Usage:
--   docker exec -i lightdash_db_1 psql -U postgres -d postgres < seed_companies.sql
--
-- Note: The Next.js app also seeds this table automatically on first startup
-- via seedCompaniesOnce() in lib/db.ts.  This script is provided for manual
-- bootstrapping and disaster recovery.
-- =============================================================================

SET search_path = datapai, public;

INSERT INTO datapai.companies (ticker, name, website_root, page_urls_json) VALUES
-- ── US Stocks (NASDAQ / NYSE) ────────────────────────────────────────────────
('NVDA',  'NVIDIA Corporation',                     'https://investor.nvidia.com',       '["https://investor.nvidia.com/financial-info/quarterly-results/default.aspx"]'),
('AAPL',  'Apple Inc.',                             'https://investor.apple.com',        '["https://investor.apple.com/investor-relations/default.aspx"]'),
('MSFT',  'Microsoft Corporation',                  'https://www.microsoft.com',         '["https://www.microsoft.com/en-us/investor"]'),
('GOOGL', 'Alphabet Inc.',                          'https://abc.xyz',                   '["https://abc.xyz/investor/"]'),
('AMZN',  'Amazon.com Inc.',                        'https://ir.aboutamazon.com',        '["https://ir.aboutamazon.com/overview/default.aspx"]'),
('META',  'Meta Platforms Inc.',                    'https://investor.fb.com',           '["https://investor.fb.com/home/default.aspx"]'),
('TSLA',  'Tesla Inc.',                             'https://ir.tesla.com',              '["https://ir.tesla.com/"]'),
('AMD',   'Advanced Micro Devices',                 'https://ir.amd.com',               '["https://ir.amd.com/"]'),
('ACMR',  'ACM Research Inc.',                      'https://ir.acmrcsh.com',            '["https://ir.acmrcsh.com/"]'),
('SMCI',  'Super Micro Computer Inc.',              'https://ir.supermicro.com',         '["https://ir.supermicro.com/"]'),

-- ── ASX Stocks ───────────────────────────────────────────────────────────────
('BHP',   'BHP Group',                              'https://www.bhp.com',               '["https://www.bhp.com/en/investors"]'),
('CBA',   'Commonwealth Bank of Australia',         'https://www.commbank.com.au',        '["https://www.commbank.com.au/about-us/investors.html"]'),
('CSL',   'CSL Limited',                            'https://www.csl.com',               '["https://www.csl.com/investors"]'),
('WBC',   'Westpac Banking Corporation',            'https://www.westpac.com.au',         '["https://www.westpac.com.au/about-westpac/investor-centre/"]'),
('ANZ',   'ANZ Banking Group',                      'https://www.anz.com.au',             '["https://www.anz.com/shareholder/centre/"]'),
('MQG',   'Macquarie Group',                        'https://www.macquarie.com',          '["https://www.macquarie.com/us/en/investors.html"]'),
('WES',   'Wesfarmers Limited',                     'https://www.wesfarmers.com.au',      '["https://www.wesfarmers.com.au/investors"]'),
('RIO',   'Rio Tinto Limited',                      'https://www.riotinto.com',           '["https://www.riotinto.com/en/invest"]'),
('TLS',   'Telstra Corporation',                    'https://www.telstra.com.au',         '["https://www.telstra.com.au/aboutus/investors"]'),
('NAB',   'National Australia Bank',                'https://www.nab.com.au',             '["https://www.nab.com.au/about-us/investor-relations"]')
ON CONFLICT (ticker) DO NOTHING;
