-- DBA management schema. Idempotent: safe to re-run.
-- Apply with:
--   docker exec -i cms_mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" dba_cms < backend/db/schema.sql

CREATE TABLE IF NOT EXISTS dba_bookmakers (
  id                            VARCHAR(64)  PRIMARY KEY,
  name                          VARCHAR(128) NOT NULL,
  brand_color                   VARCHAR(16),
  secondary_color               VARCHAR(16),
  logo_bg                       VARCHAR(16),
  logo_fg                       VARCHAR(16),
  initials                      VARCHAR(8),
  default_logo_image_url        VARCHAR(512),
  default_logo_image_url_no_bg  VARCHAR(512),
  use_no_bg_logo                TINYINT(1)   NOT NULL DEFAULT 0,
  dedicated_logo                JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dba_bookmaker_variants (
  bookmaker_id  VARCHAR(64)  NOT NULL,
  country_code  VARCHAR(16)  NOT NULL,
  affiliate     VARCHAR(1024) NOT NULL,
  status        ENUM('live', 'draft') NOT NULL DEFAULT 'draft',
  modified      TIMESTAMP(3) NOT NULL,
  modified_by   VARCHAR(128) NOT NULL,
  PRIMARY KEY (bookmaker_id, country_code),
  FOREIGN KEY (bookmaker_id) REFERENCES dba_bookmakers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dba_templates (
  id            VARCHAR(64)  PRIMARY KEY,
  name          VARCHAR(256) NOT NULL,
  size_id       VARCHAR(32)  NOT NULL,
  size_label    VARCHAR(64),
  status        ENUM('live', 'draft') NOT NULL DEFAULT 'draft',
  bookmaker_id  VARCHAR(64),
  config        JSON         NOT NULL,
  modified      TIMESTAMP(3) NOT NULL,
  modified_by   VARCHAR(128) NOT NULL,
  FOREIGN KEY (bookmaker_id) REFERENCES dba_bookmakers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Country targeting for ad-format templates (many-to-many).
-- A template can be live in multiple countries; deleting the template cascades.
CREATE TABLE IF NOT EXISTS dba_template_countries (
  template_id   VARCHAR(64) NOT NULL,
  country_code  VARCHAR(16) NOT NULL,
  PRIMARY KEY (template_id, country_code),
  FOREIGN KEY (template_id) REFERENCES dba_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- Google Ad Manager sync state (Phase 1: dry-run only — these columns are
-- populated when actual GAM publishing is wired up).
-- =========================================================================

-- Two columns on dba_templates, added defensively in case the table exists.
SET @cnt := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dba_templates'
               AND COLUMN_NAME = 'gam_creative_template_id');
SET @sql := IF(@cnt = 0,
  'ALTER TABLE dba_templates
     ADD COLUMN gam_creative_template_id BIGINT NULL AFTER modified_by,
     ADD COLUMN gam_last_synced_at TIMESTAMP(3) NULL AFTER gam_creative_template_id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- One row per (template, bookmaker, country) Creative pushed to GAM.
CREATE TABLE IF NOT EXISTS dba_template_creatives (
  dba_template_id  VARCHAR(64)  NOT NULL,
  bookmaker_id     VARCHAR(64)  NOT NULL,
  country_code     VARCHAR(16)  NOT NULL,
  gam_creative_id  BIGINT       NOT NULL,
  synced_at        TIMESTAMP(3) NOT NULL,
  PRIMARY KEY (dba_template_id, bookmaker_id, country_code),
  FOREIGN KEY (dba_template_id) REFERENCES dba_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dba_audit_log (
  id          BIGINT       AUTO_INCREMENT PRIMARY KEY,
  kind        ENUM('restart', 'publish', 'edit', 'add') NOT NULL,
  who         VARCHAR(128) NOT NULL,
  occurred_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  text        VARCHAR(512) NOT NULL,
  INDEX idx_audit_occurred (occurred_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Single-row table for service-wide state. id is pinned to 1 so we have a stable PK.
CREATE TABLE IF NOT EXISTS dba_service_state (
  id              TINYINT      PRIMARY KEY DEFAULT 1,
  last_restart_at TIMESTAMP(3) NULL DEFAULT NULL,
  last_restart_by VARCHAR(128)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO dba_service_state (id) VALUES (1);


-- =========================================================================
-- Sheet mirror tables (one per Google Sheet tab BettingAdsService reads).
-- Populated by backend/scripts/importFromSheets.js.
-- Naming: dba_<workbook>_<tab>, lowercase snake_case.
-- =========================================================================

-- From workbook "DBA New Management File" / tab "DBA Service Activation"
-- Columns reflect actual sheet headers (see https://docs.google.com/spreadsheets/d/1sJSfPaTd273CHpmetmyAZyRZGOKTUib-E-YR30y5oqs/).
CREATE TABLE IF NOT EXISTS dba_service_activation (
  cid                  INT          NOT NULL,
  lang_id              INT          NOT NULL,
  bmid                 INT          NOT NULL,
  country              VARCHAR(64),
  language             VARCHAR(64),
  bookie               VARCHAR(128),
  sport_types          VARCHAR(256),
  max_days             INT,
  is_exist_ad          VARCHAR(256),
  which_format_exist   VARCHAR(256),
  PRIMARY KEY (cid, lang_id, bmid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- From workbook "DBA New Management File" / tab "Bookie Settings"
-- Columns reflect actual sheet headers — bonus / CTA / links fields live in
-- Ads Settings, not here.
CREATE TABLE IF NOT EXISTS dba_bookie_settings (
  bmid                     INT PRIMARY KEY,
  app                      VARCHAR(64),
  bookie                   VARCHAR(128),
  color1                   VARCHAR(32),
  color2                   VARCHAR(32),
  disclaimer_text          TEXT,
  disclaimer_link          VARCHAR(512),
  cta_bg_color             VARCHAR(32),
  cta_text_color           VARCHAR(32),
  text_bold_color          VARCHAR(32),
  competitors_logo_usage   VARCHAR(64),
  guid_support             VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- From workbook "DBA New Management File" / tab "Ads Settings"
-- Per (bmid, cid, lang_id, os, sport, offer, format) cohort. Real headers include
-- Sport/Offer/Theme/Opening Screen text/Odds Type/Links that the BettingAdsService
-- spec didn't describe.
CREATE TABLE IF NOT EXISTS dba_ads_settings (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  app                   VARCHAR(64),
  bookie                VARCHAR(128),
  bmid                  INT,
  country               VARCHAR(64),
  cid                   INT,
  language              VARCHAR(64),
  lang_id               INT,
  os                    VARCHAR(32),
  segmentation          VARCHAR(128),
  sport                 VARCHAR(64),
  offer                 VARCHAR(64),
  format                VARCHAR(64),
  theme                 VARCHAR(64),
  opening_screen_title  VARCHAR(512),
  opening_screen_text   TEXT,
  bonus_screen_title    VARCHAR(512),
  bonus_screen_text     TEXT,
  cta_button_text       VARCHAR(128),
  odds_type             VARCHAR(32),
  links                 JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- From workbook "DBA New Management File" / tab "Themes"
CREATE TABLE IF NOT EXISTS dba_themes (
  theme_name              VARCHAR(128) PRIMARY KEY,
  color1                  VARCHAR(32),
  color2                  VARCHAR(32),
  disclaimer_text         TEXT,
  disclaimer_link         VARCHAR(512),
  cta_button_bg_color     VARCHAR(32),
  cta_button_text_color   VARCHAR(32),
  text_bold_color         VARCHAR(32),
  show_texture            VARCHAR(32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adds text_bold_color when re-applying schema to an existing DB.
SET @cnt := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dba_themes' AND COLUMN_NAME = 'text_bold_color');
SET @sql := IF(@cnt = 0,
  'ALTER TABLE dba_themes ADD COLUMN text_bold_color VARCHAR(32) AFTER cta_button_text_color',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- From workbook "DBA Templates" / tab "Timing Templates"
CREATE TABLE IF NOT EXISTS dba_timing_templates (
  id                INT PRIMARY KEY,
  template_key      VARCHAR(128),
  name              VARCHAR(256),
  relevant_offers   VARCHAR(512)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- From workbook "DBA Templates" / tab "TT Params"
-- Dynamic TT1..TTn columns are stored as a JSON object so the schema doesn't
-- need updating when new parameter columns are added in the sheet.
CREATE TABLE IF NOT EXISTS dba_tt_params (
  id            INT PRIMARY KEY,
  name          VARCHAR(256),
  comment       TEXT,
  param_values  JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- From workbook "DBA Templates" / tab "Offer Templates"
CREATE TABLE IF NOT EXISTS dba_offer_templates (
  id             INT PRIMARY KEY,
  template_key   VARCHAR(128),
  name           VARCHAR(256),
  html_template  VARCHAR(512)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- From workbook "DBA Templates" / tab "OT Params"
CREATE TABLE IF NOT EXISTS dba_ot_params (
  id            INT PRIMARY KEY,
  name          VARCHAR(256),
  comment       TEXT,
  param_values  JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- From workbook "BetBoost" / tab "links"
CREATE TABLE IF NOT EXISTS dba_betboost_links (
  cid                  INT NOT NULL,
  lang_id              INT NOT NULL,
  bmid                 INT NOT NULL,
  fifth_button_bonus   VARCHAR(1024),
  fifth_button_boost   VARCHAR(1024),
  gc_bonus             VARCHAR(1024),
  gc_boost             VARCHAR(1024),
  my_scores_bonus      VARCHAR(1024),
  my_scores_boost      VARCHAR(1024),
  PRIMARY KEY (cid, lang_id, bmid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- From workbook "BetBoost" / tab "promotions"
-- `rank` is a reserved word; we store it as `rank_name`.
CREATE TABLE IF NOT EXISTS dba_betboost_promotions (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  cid        INT,
  lang_id    INT,
  bmid       INT,
  stars      INT,
  rank_name  VARCHAR(128),
  title1     VARCHAR(256),
  title2     VARCHAR(256),
  title3     VARCHAR(256),
  title4     VARCHAR(256),
  title5     VARCHAR(256),
  cta        VARCHAR(256),
  image_url  VARCHAR(1024),
  UNIQUE KEY uq_promo (cid, lang_id, bmid, rank_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- From workbook "BetBoost" / tab "data sources"
CREATE TABLE IF NOT EXISTS dba_betboost_data_sources (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  bmid               INT,
  bookie             VARCHAR(128),
  lang_id            INT,
  lang_name          VARCHAR(64),
  data_source_name   VARCHAR(256),
  UNIQUE KEY uq_ds (bmid, lang_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- From workbook "BetBoost" / tab "countries"
CREATE TABLE IF NOT EXISTS dba_betboost_countries (
  cid                          INT PRIMARY KEY,
  name                         VARCHAR(128),
  langs                        VARCHAR(256),
  def_lang                     INT,
  bookies                      VARCHAR(512),
  promoted_competitions        VARCHAR(1024),
  min_competitors_followers    INT,
  min_competitions_followers   INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- From workbook "Top Followers" / tab "Data"
CREATE TABLE IF NOT EXISTS dba_top_followers (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  country_id   INT,
  entity_type  INT,
  entity_id    INT,
  entity_name  VARCHAR(256),
  followers    INT,
  UNIQUE KEY uq_top (country_id, entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- From workbook "Games Loading Configuration" / tab "Sheet1"
CREATE TABLE IF NOT EXISTS dba_games_loading_config (
  country_id   INT NOT NULL,
  lang_id      INT NOT NULL,
  bookie_id    INT NOT NULL,
  sport_types  VARCHAR(256),
  max_days     INT,
  PRIMARY KEY (country_id, lang_id, bookie_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
