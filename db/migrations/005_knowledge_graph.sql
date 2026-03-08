-- ============================================================
-- PrediMarket — Phase 5: Knowledge Graph
-- Migration 005: entity registry, relationship graph,
--                event graph, market-entity links
-- ============================================================

-- ─── Entity registry ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS graph_entities (
  id              TEXT        PRIMARY KEY,            -- e.g. BITCOIN, IBEX_35
  entity_type     TEXT        NOT NULL
    CHECK (entity_type IN ('person','company','asset','country','institution','team','index','commodity','rate','energy','data','competition')),
  name            TEXT        NOT NULL,
  aliases         TEXT[]      NOT NULL DEFAULT '{}',  -- alternative names / tickers
  importance      FLOAT       NOT NULL DEFAULT 0.50,  -- 0-1, recomputed by entityImportance
  description     TEXT,
  metadata        JSONB       NOT NULL DEFAULT '{}',  -- oracle info, colors, etc.
  news_frequency  INTEGER     NOT NULL DEFAULT 0,     -- articles referencing this entity
  market_count    INTEGER     NOT NULL DEFAULT 0,     -- markets linked
  signal_count    INTEGER     NOT NULL DEFAULT 0,     -- signals linked
  last_seen_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_graph_entities_type       ON graph_entities (entity_type);
CREATE INDEX IF NOT EXISTS idx_graph_entities_importance ON graph_entities (importance DESC);
CREATE INDEX IF NOT EXISTS idx_graph_entities_aliases    ON graph_entities USING GIN (aliases);

-- ─── Relationship graph ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS graph_relationships (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entity_id      TEXT        NOT NULL REFERENCES graph_entities(id) ON DELETE CASCADE,
  to_entity_id        TEXT        NOT NULL REFERENCES graph_entities(id) ON DELETE CASCADE,
  relationship_type   TEXT        NOT NULL
    CHECK (relationship_type IN (
      'REGULATES','INFLUENCES','CORRELATES_WITH','COMPETES_WITH',
      'PART_OF','SETS_RATE','CONTROLS_SUPPLY','PUBLISHES',
      'OWNS','DEPENDS_ON','ISSUED_BY','COMPETES_IN'
    )),
  strength            FLOAT       NOT NULL DEFAULT 0.50,  -- 0-1 relationship strength
  direction           TEXT        CHECK (direction IN ('SAME','INVERSE','NEUTRAL')),
  description         TEXT,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_graph_rel_unique
  ON graph_relationships (from_entity_id, to_entity_id, relationship_type);
CREATE INDEX IF NOT EXISTS idx_graph_rel_from   ON graph_relationships (from_entity_id);
CREATE INDEX IF NOT EXISTS idx_graph_rel_to     ON graph_relationships (to_entity_id);
CREATE INDEX IF NOT EXISTS idx_graph_rel_type   ON graph_relationships (relationship_type);

-- ─── Event graph ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS graph_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT        NOT NULL,
  event_type      TEXT        NOT NULL,               -- from eventClassifier EVENT_TYPES
  primary_entity  TEXT        REFERENCES graph_entities(id) ON DELETE SET NULL,
  entity_ids      TEXT[]      NOT NULL DEFAULT '{}',  -- all affected entities
  article_ids     UUID[]      NOT NULL DEFAULT '{}',  -- source articles
  impact          JSONB       NOT NULL DEFAULT '{}',  -- { direction, magnitude, confidence }
  processed       BOOLEAN     NOT NULL DEFAULT FALSE,
  reasoning_done  BOOLEAN     NOT NULL DEFAULT FALSE,
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_graph_events_entity   ON graph_events (primary_entity, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_graph_events_type     ON graph_events (event_type, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_graph_events_pending  ON graph_events (reasoning_done) WHERE reasoning_done = FALSE;
CREATE INDEX IF NOT EXISTS idx_graph_events_entities ON graph_events USING GIN (entity_ids);

-- ─── Market–entity links ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_entity_links (
  market_id       UUID        NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  entity_id       TEXT        NOT NULL REFERENCES graph_entities(id) ON DELETE CASCADE,
  link_type       TEXT        NOT NULL DEFAULT 'SUBJECT'
    CHECK (link_type IN ('SUBJECT','INFLUENCED_BY','CORRELATED')),
  strength        FLOAT       NOT NULL DEFAULT 1.0,
  auto_detected   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (market_id, entity_id, link_type)
);

CREATE INDEX IF NOT EXISTS idx_market_entity_entity ON market_entity_links (entity_id);
CREATE INDEX IF NOT EXISTS idx_market_entity_market ON market_entity_links (market_id);

-- ─── Cross-market signal log ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cross_market_signals (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_signal_id    UUID        REFERENCES signals(id) ON DELETE SET NULL,
  source_market_id    UUID        REFERENCES markets(id) ON DELETE SET NULL,
  target_market_id    UUID        NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  propagation_path    TEXT[]      NOT NULL DEFAULT '{}',  -- [entity_id, ...] traversal path
  relationship_type   TEXT,
  original_strength   FLOAT,
  propagated_strength FLOAT,
  damping_factor      FLOAT,
  direction           TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cross_signals_target ON cross_market_signals (target_market_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cross_signals_source ON cross_market_signals (source_market_id);

-- ─── Entity importance history ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entity_importance_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       TEXT        NOT NULL REFERENCES graph_entities(id) ON DELETE CASCADE,
  importance      FLOAT       NOT NULL,
  news_frequency  INTEGER,
  market_count    INTEGER,
  signal_count    INTEGER,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_importance_log_entity ON entity_importance_log (entity_id, computed_at DESC);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE graph_entities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_relationships     ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_entity_links     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_market_signals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_importance_log   ENABLE ROW LEVEL SECURITY;

-- Public read for graph transparency
CREATE POLICY "public_read_entities"       ON graph_entities       FOR SELECT USING (TRUE);
CREATE POLICY "public_read_relationships"  ON graph_relationships  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "public_read_events"         ON graph_events         FOR SELECT USING (TRUE);
CREATE POLICY "public_read_market_links"   ON market_entity_links  FOR SELECT USING (TRUE);
CREATE POLICY "public_read_cross_signals"  ON cross_market_signals FOR SELECT USING (TRUE);

-- ─── Seed: core entities ──────────────────────────────────────────────────────
INSERT INTO graph_entities (id, entity_type, name, aliases, importance, description, metadata) VALUES
  -- Indices
  ('IBEX_35',      'index',       'IBEX 35',           ARRAY['ibex','ibex35'],                          0.90, 'Spanish stock market index',               '{"oracle":"yahoo","symbol":"%5EIBEX","category":"ECONOMIA"}'),
  ('SP500',        'index',       'S&P 500',            ARRAY['s&p 500','s&p500','sp500'],               0.95, 'US large-cap equity index',                '{"oracle":"yahoo","symbol":"%5EGSPC","category":"ECONOMIA"}'),
  ('NASDAQ',       'index',       'NASDAQ',             ARRAY['nasdaq 100','qqq'],                       0.90, 'US technology equity index',               '{"oracle":"yahoo","symbol":"%5EIXIC","category":"ECONOMIA"}'),
  -- Crypto
  ('BITCOIN',      'asset',       'Bitcoin',            ARRAY['btc','bitcoin','xbt'],                    0.92, 'Leading cryptocurrency by market cap',     '{"oracle":"coingecko","coin_id":"bitcoin","category":"CRIPTO"}'),
  ('ETHEREUM',     'asset',       'Ethereum',           ARRAY['eth','ether'],                            0.85, 'Smart contract blockchain',                '{"oracle":"coingecko","coin_id":"ethereum","category":"CRIPTO"}'),
  -- Commodities
  ('BRENT',        'commodity',   'Petróleo Brent',     ARRAY['brent crude','crude oil','petroleo'],     0.88, 'North Sea crude oil benchmark',            '{"oracle":"yahoo","symbol":"BZ%3DF","category":"ECONOMIA"}'),
  ('ORO',          'commodity',   'Oro',                ARRAY['gold','xau'],                             0.82, 'Gold spot price',                          '{"oracle":"yahoo","symbol":"GC%3DF","category":"ECONOMIA"}'),
  ('LUZ_PVPC',     'energy',      'Precio de la Luz',   ARRAY['pvpc','luz','electricidad','mwh'],        0.78, 'Spanish retail electricity price (PVPC)',  '{"oracle":"ree","category":"ENERGIA"}'),
  -- Rates & data
  ('EURIBOR',      'rate',        'Euribor',            ARRAY['euríbor','euribor 12m'],                  0.80, 'Euro interbank offered rate',              '{"category":"ECONOMIA"}'),
  ('IPC_ES',       'data',        'IPC España',         ARRAY['ipc','inflación','cpi españa'],           0.75, 'Spanish consumer price index',             '{"oracle":"ine","category":"ECONOMIA"}'),
  -- Sports teams
  ('REAL_MADRID',  'team',        'Real Madrid',        ARRAY['real madrid','madrid','rmcf'],            0.88, 'Spanish football club',                    '{"oracle":"football_data","team_id":86,"league":"laliga","category":"DEPORTES"}'),
  ('FC_BARCELONA', 'team',        'FC Barcelona',       ARRAY['barcelona','barça','fcb','barca'],        0.88, 'Spanish football club',                    '{"oracle":"football_data","team_id":81,"league":"laliga","category":"DEPORTES"}'),
  ('ATLETICO',     'team',        'Atlético de Madrid', ARRAY['atletico','atlético','atm'],              0.82, 'Spanish football club',                    '{"oracle":"football_data","team_id":78,"league":"laliga","category":"DEPORTES"}'),
  ('SEVILLA_FC',   'team',        'Sevilla FC',         ARRAY['sevilla','sfc'],                         0.72, 'Spanish football club',                    '{"oracle":"football_data","team_id":559,"league":"laliga","category":"DEPORTES"}'),
  -- Institutions
  ('BCE',          'institution', 'Banco Central Europeo', ARRAY['bce','ecb','banco central europeo'],  0.95, 'European Central Bank',                    '{"category":"ECONOMIA"}'),
  ('FED',          'institution', 'Reserva Federal',    ARRAY['fed','federal reserve','fomc'],          0.95, 'US Federal Reserve',                       '{"category":"ECONOMIA"}'),
  ('CONGRESO',     'institution', 'Congreso de los Diputados', ARRAY['congreso','parlamento','diputados'], 0.85, 'Spanish parliament',                  '{"oracle":"boe","category":"POLITICA"}'),
  ('INE',          'institution', 'INE',                ARRAY['instituto nacional de estadística'],     0.75, 'Spanish national statistics institute',    '{"category":"ECONOMIA"}'),
  ('OPEC',         'institution', 'OPEP',               ARRAY['opec','opep','opec+'],                   0.90, 'Oil Producing and Exporting Countries',    '{"category":"ECONOMIA"}'),
  ('SEC',          'institution', 'SEC',                ARRAY['securities and exchange commission'],    0.85, 'US Securities and Exchange Commission',    '{"category":"ECONOMIA"}'),
  -- Competitions
  ('LALIGA',       'competition', 'LaLiga',             ARRAY['la liga','primera división','liga española'], 0.80, 'Spanish top football division',       '{"category":"DEPORTES"}'),
  -- Persons
  ('SANCHEZ',      'person',      'Pedro Sánchez',      ARRAY['pedro sanchez','sánchez'],               0.80, 'Spanish Prime Minister',                   '{"category":"POLITICA"}'),
  -- Countries / regions
  ('SPAIN',        'country',     'España',             ARRAY['spain','españa'],                        0.85, 'Kingdom of Spain',                         '{"category":"POLITICA"}'),
  ('USA',          'country',     'Estados Unidos',     ARRAY['usa','us','eeuu','estados unidos'],      0.95, 'United States of America',                 '{"category":"POLITICA"}')
ON CONFLICT (id) DO NOTHING;

-- ─── Seed: core relationships ─────────────────────────────────────────────────
INSERT INTO graph_relationships (from_entity_id, to_entity_id, relationship_type, strength, direction, description) VALUES
  -- Monetary policy → markets
  ('BCE',       'EURIBOR',    'SETS_RATE',       0.99, 'SAME',    'BCE sets Euribor benchmark rate'),
  ('BCE',       'IBEX_35',    'INFLUENCES',      0.75, 'INVERSE', 'Rate hikes pressure equities'),
  ('FED',       'SP500',      'INFLUENCES',      0.85, 'INVERSE', 'Fed rate decisions drive US equities'),
  ('FED',       'NASDAQ',     'INFLUENCES',      0.80, 'INVERSE', 'Tech stocks sensitive to Fed rates'),
  ('FED',       'BITCOIN',    'INFLUENCES',      0.60, 'INVERSE', 'Risk-off from rate hikes pressures crypto'),
  -- Oil supply
  ('OPEC',      'BRENT',      'CONTROLS_SUPPLY', 0.90, 'SAME',    'OPEC production quotas drive Brent price'),
  ('BRENT',     'LUZ_PVPC',   'INFLUENCES',      0.70, 'SAME',    'Oil price flows into electricity generation costs'),
  -- Cross-asset correlations
  ('BITCOIN',   'ETHEREUM',   'CORRELATES_WITH', 0.85, 'SAME',    'BTC/ETH strong positive correlation'),
  ('SP500',     'IBEX_35',    'CORRELATES_WITH', 0.75, 'SAME',    'Global equity correlation'),
  ('SP500',     'NASDAQ',     'CORRELATES_WITH', 0.90, 'SAME',    'Large US index correlation'),
  ('BITCOIN',   'SP500',      'CORRELATES_WITH', 0.45, 'SAME',    'Risk-asset mild correlation'),
  -- Statistics
  ('INE',       'IPC_ES',     'PUBLISHES',       0.99, 'NEUTRAL', 'INE publishes official CPI data'),
  ('IPC_ES',    'EURIBOR',    'INFLUENCES',      0.65, 'SAME',    'High inflation pushes rates up'),
  -- Regulation
  ('SEC',       'BITCOIN',    'REGULATES',       0.70, 'INVERSE', 'SEC ETF decisions impact BTC price'),
  ('SEC',       'ETHEREUM',   'REGULATES',       0.65, 'INVERSE', 'SEC classification affects ETH'),
  -- Sports
  ('REAL_MADRID',  'LALIGA', 'COMPETES_IN', 0.99, 'NEUTRAL', 'Real Madrid competes in LaLiga'),
  ('FC_BARCELONA', 'LALIGA', 'COMPETES_IN', 0.99, 'NEUTRAL', 'FC Barcelona competes in LaLiga'),
  ('ATLETICO',     'LALIGA', 'COMPETES_IN', 0.99, 'NEUTRAL', 'Atlético de Madrid competes in LaLiga'),
  ('SEVILLA_FC',   'LALIGA', 'COMPETES_IN', 0.99, 'NEUTRAL', 'Sevilla FC competes in LaLiga'),
  ('REAL_MADRID',  'FC_BARCELONA', 'COMPETES_WITH', 0.95, 'NEUTRAL', 'El Clásico rivalry'),
  -- Political
  ('SANCHEZ',   'SPAIN',      'PART_OF',         0.80, 'NEUTRAL', 'Head of Spanish government'),
  ('CONGRESO',  'SPAIN',      'PART_OF',         0.90, 'NEUTRAL', 'Spanish legislative body')
ON CONFLICT (from_entity_id, to_entity_id, relationship_type) DO NOTHING;

-- ─── Add graph job to scheduler ───────────────────────────────────────────────
INSERT INTO scheduler_jobs (job_name, status, next_run) VALUES
  ('graph', 'idle', NOW())
ON CONFLICT (job_name) DO NOTHING;
