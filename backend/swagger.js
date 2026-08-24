const swaggerJsdoc = require('swagger-jsdoc');
const bpRuntimeExample = require('./data/bp_mock_response.json');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'BP Service API',
      version: '1.1.0',
      description:
        'Betting Promotion (BP) API — split across two services.\n\n' +
        '**Public runtime (mobile clients)** — `bp-service` microservice:\n' +
        '`GET /api/bp` returns a **flat JSON promotion object** (no `BPMB` wrapper).\n' +
        'Deploy separately behind CloudFront; see `docs/DEVOPS-BP-RUNTIME.md`.\n\n' +
        '**CMS (internal)** — this server (`cms-dba`):\n' +
        '`/api/bp/promotions` CRUD plus `/api/bp/countries` and `/api/bp/languages` for the BP Editor.\n\n' +
        '**Targeting.uc** echoes the request `uc` (null when omitted). ' +
        '**Legal.Regulatory_Logos** only when request `uc=3` (Italy).\n\n' +
        'CMS writes notify the runtime service to reload its cache and purge CloudFront `/api/bp*`.\n\n' +
        '**Colours:** every colour field in the runtime response is uppercase `#RRGGBB` hex ' +
        '(never `rgb()` / `rgba()`). Semi-transparent stored values are composited onto black.',
    },
    servers: [
      { url: 'http://localhost:3003', description: 'BP runtime (mobile) — bp-service' },
      { url: 'http://localhost:3001', description: 'CMS backend (internal CRUD)' },
    ],
    tags: [
      { name: 'Runtime',    description: 'Ad-server endpoints consumed by client apps' },
      { name: 'Promotions', description: 'CMS CRUD for BP promotion versions' },
    ],
    components: {
      parameters: {
        BpQueryUc: {
          in: 'query',
          name: 'uc',
          required: false,
          schema: { type: 'integer' },
          description: 'User country ID (T_COUNTRIES.COUNTRY_ID). Same as mobile API `uc`. Omit to match promotions targeted at any country. See GET /api/bp/countries.',
          example: 3,
        },
        BpQueryAppType: {
          in: 'query',
          name: 'appType',
          required: false,
          schema: { type: 'integer', enum: [1, 2] },
          description: 'Client platform sent by the app. `1` = iOS, `2` = Android. Omit to match any platform.',
          example: 2,
        },
        BpQueryLid: {
          in: 'query',
          name: 'lid',
          required: false,
          schema: { type: 'integer' },
          description: 'League ID. Omit to match promotions targeted at any league.',
          example: 102,
        },
        BpQueryLang: {
          in: 'query',
          name: 'lang',
          required: false,
          schema: { type: 'integer' },
          description: 'Language ID (same IDs as the mobile API `lang` param). Omit to match any language.',
          example: 10,
        },
        BpQueryPublisher: {
          in: 'query',
          name: 'publisher',
          required: false,
          schema: { type: 'integer' },
          description: 'Publisher ID (same IDs as the mobile API `publisher` param). Omit to match any publisher.',
          example: 147,
        },
        BpQueryCampaign: {
          in: 'query',
          name: 'campaign',
          required: false,
          schema: { type: 'string' },
          description: 'Campaign name (same value as the mobile API `campaign` param). Omit to match any campaign.',
          example: 'summer_promo',
        },
      },
      examples: {
        BPRuntimeMatchedPromotion: {
          summary: 'Matched promotion (flat response body)',
          value: bpRuntimeExample,
        },
      },
      schemas: {
        // ── Runtime response (flat top-level object) ─────────────────
        BPRuntimePromotion: {
          type: 'object',
          description:
            'Matched promotion returned directly as the response body (no wrapper keys). ' +
            'One version is selected per request via targeting match + SOV lottery.',
          required: [
            'BP_Version_Name',
            'Num_Of_Bookies',
            'Targeting',
            'Header',
            'Page_Background_Color',
            'Page_Background',
            'Bookies',
          ],
          properties: {
            BP_Version_Name: { type: 'string', example: 'Summer Promo IT' },
            Num_Of_Bookies:  { type: 'integer', minimum: 1, maximum: 3, example: 3 },
            Targeting: {
              type: 'object',
              description:
                'Targeting metadata for the matched promotion. `uc` echoes the request; ' +
                'other fields come from the promotion config (null = wildcard when matching).',
              properties: {
                uc: {
                  type: 'integer',
                  nullable: true,
                  description: 'Echoes the request `uc` query param (T_COUNTRIES.COUNTRY_ID). null when `uc` was omitted.',
                  example: 3,
                },
                LID: { type: 'integer', nullable: true, description: 'League ID from promotion config.' },
                SOV: { type: 'integer', example: 60, description: 'Share of voice (0–100) for SOV lottery.' },
                Lang: { type: 'integer', nullable: true, description: 'Language ID — null matches any language.' },
                Publisher: { type: 'integer', nullable: true, description: 'Publisher ID — null matches any publisher.' },
                Campaign: { type: 'string', nullable: true, description: 'Campaign name — null matches any campaign.' },
              },
            },
            Header: {
              type: 'object',
              properties: {
                Main_Title:      { $ref: '#/components/schemas/TextColor' },
                Secondary_Title: { $ref: '#/components/schemas/TextColor' },
                ImageURL:        {
                  type: 'string',
                  nullable: true,
                  description: 'null means no header image — clients should not reserve space above the titles.',
                },
              },
            },
            Page_Background_Color: {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
              example: '#12193A',
              description: 'Always uppercase #RRGGBB hex (never rgb/rgba).',
            },
            Page_Background: {
              type: 'object',
              properties: {
                Type:           { type: 'string', enum: ['solid', 'gradient', 'image'] },
                Color:          { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', example: '#12193A' },
                GradientColor1: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', nullable: true, example: '#12193A' },
                GradientColor2: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', nullable: true, example: '#0D3B6E' },
                GradientAngle:  { type: 'integer', nullable: true },
                ImageUrl:       { type: 'string', nullable: true },
              },
            },
            Legal: {
              nullable: true,
              type: 'object',
              description: 'null when legal text is disabled on the promotion.',
              properties: {
                Text:  { type: 'string' },
                Color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', example: '#90A4AE' },
                Link:  { type: 'string' },
                Regulatory_Logos: {
                  type: 'array',
                  description: 'Present only when the **request** `uc` is `3` (Italy). Omitted otherwise.',
                  items: {
                    type: 'object',
                    properties: {
                      Src:  { type: 'string' },
                      Link: { type: 'string' },
                    },
                  },
                },
              },
            },
            Bookies: {
              type: 'array',
              minItems: 1,
              maxItems: 3,
              items: { $ref: '#/components/schemas/BPRuntimeBookie' },
            },
          },
          example: bpRuntimeExample,
        },
        BPRuntimeBookie: {
          type: 'object',
          properties: {
            BMID:                { type: 'integer' },
            Section_BG_Color:    { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', example: '#1A2340' },
            Title_Text:          { type: 'string' },
            Title_Text_Color:    { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', example: '#FFFFFF' },
            Subtitle_Text:       { type: 'string', nullable: true },
            Subtitle_Text_Color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', nullable: true, example: '#999999' },
            CTA_Text:            { type: 'string' },
            CTA_Text_Color:      { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', example: '#FFFFFF' },
            Strip_Color:         {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
              nullable: true,
              example: '#027B5B',
              description:
                'Single strip colour. Defaults to the bookmaker primary colour from T_BET_BOOKMAKERS.COLOR when not overridden in the CMS.',
            },
            Click_URL:           { type: 'string' },
            Logo_Image_URL:      {
              type: 'string',
              nullable: true,
              description:
                'Bookmaker logo URL. Defaults to the CDN logo for the BMID when not overridden in the CMS.',
            },
          },
        },
        TextColor: {
          type: 'object',
          properties: {
            Text:  { type: 'string' },
            Color: {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
              example: '#FFFFFF',
              description: 'Always uppercase #RRGGBB hex.',
            },
          },
        },

        // ── CMS Promotion ─────────────────────────────────────────────
        Promotion: {
          type: 'object',
          properties: {
            id:       { type: 'integer', readOnly: true },
            name:     { type: 'string', example: 'Summer Promo IT' },
            cid:      { type: 'integer', nullable: true, example: 3, description: 'Country ID (T_COUNTRIES.COUNTRY_ID) — null matches any country' },
            platform: { type: 'string', example: 'Android', default: 'All' },
            lid:      { type: 'integer', nullable: true },
            lang:     { type: 'integer', nullable: true, description: 'Language ID — null matches any language' },
            publisher:{ type: 'integer', nullable: true, description: 'Publisher ID — null matches any publisher' },
            campaign: { type: 'string', nullable: true, description: 'Campaign name — null matches any campaign' },
            sov:      { type: 'integer', example: 100, description: 'Share of voice (0-100)' },
            active:   { type: 'boolean', default: true },
            pageBgColor:      { type: 'string', example: '#12193A' },
            bgType:           { type: 'string', enum: ['solid', 'gradient', 'image'], default: 'solid' },
            bgGradientColor1: { type: 'string', nullable: true },
            bgGradientColor2: { type: 'string', nullable: true },
            bgGradientAngle:  { type: 'integer', nullable: true, default: 135 },
            bgImageUrl:       { type: 'string', nullable: true },
            header: {
              type: 'object',
              properties: {
                mainTitle:      { $ref: '#/components/schemas/CMSTextColor' },
                secondaryTitle: { $ref: '#/components/schemas/CMSTextColor' },
                imageUrl:       { type: 'string', nullable: true },
                imageHeight:    { type: 'integer', default: 110 },
              },
            },
            legal: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean', default: false },
                text:    { type: 'string' },
                color:   { type: 'string', example: '#ffffff' },
                link:    { type: 'string' },
                regulatoryLogos: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      src:  { type: 'string' },
                      link: { type: 'string' },
                    },
                  },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time', readOnly: true },
            updatedAt: { type: 'string', format: 'date-time', readOnly: true },
            bookies: {
              type: 'array',
              items: { $ref: '#/components/schemas/CMSBookie' },
            },
          },
        },
        CMSTextColor: {
          type: 'object',
          properties: {
            text:  { type: 'string' },
            color: { type: 'string', example: '#ffffff' },
          },
        },
        CMSBookie: {
          type: 'object',
          required: ['bmid', 'ctaText', 'clickUrl'],
          properties: {
            position:       { type: 'integer' },
            bmid:           { type: 'integer' },
            sectionBgColor: { type: 'string', default: '#12193A' },
            titleText:      { type: 'string' },
            titleTextColor: { type: 'string', default: '#ffffff' },
            subtitleText:      { type: 'string', nullable: true },
            subtitleTextColor: { type: 'string', nullable: true, default: '#999999', pattern: '^#[0-9A-Fa-f]{6}$' },
            ctaText:        { type: 'string' },
            ctaTextColor:   { type: 'string', default: '#FFFFFF', pattern: '^#[0-9A-Fa-f]{6}$' },
            stripColors:    { type: 'array', items: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' }, maxItems: 2 },
            logoImageUrl:   { type: 'string', nullable: true },
            clickUrl:       { type: 'string' },
          },
        },

        // ── Shared error ──────────────────────────────────────────────
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./routes/bpPromotions.js', '../bp-service/routes/runtime.js'],
};

module.exports = swaggerJsdoc(options);
