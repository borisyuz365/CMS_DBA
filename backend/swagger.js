const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'BP Service API',
      version: '1.0.0',
      description:
        'Betting Promotion (BPMB) runtime delivery and CMS management API. The GET /api/bp runtime endpoint is served from an in-memory cache (no per-request DB I/O); every CMS write invalidates the cache and triggers a CloudFront edge purge of /api/bp*.',
    },
    servers: [{ url: 'http://localhost:3001' }],
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
      schemas: {
        // ── Runtime response ──────────────────────────────────────────
        BPMBResponse: {
          type: 'object',
          properties: {
            BPMB: {
              type: 'object',
              properties: {
                BPMB_Versions: {
                  type: 'array',
                  maxItems: 1,
                  items: { $ref: '#/components/schemas/BPMBVersion' },
                },
              },
            },
          },
        },
        BPMBVersion: {
          type: 'object',
          properties: {
            BP_Version_Name:       { type: 'string' },
            Num_Of_Bookies:        { type: 'integer' },
            Targeting: {
              type: 'object',
              properties: {
                uc: { type: 'integer', nullable: true, description: 'Echoes the request `uc` query param (T_COUNTRIES.COUNTRY_ID). null when `uc` was omitted.' },
                LID: { type: 'integer', nullable: true },
                SOV: { type: 'integer', example: 100 },
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
                ImageURL:        { type: 'string', nullable: true, description: 'null means no header image/badge — clients should render no reserved space above the titles.' },
              },
            },
            Page_Background_Color: { type: 'string', example: '#12193A' },
            Page_Background: {
              type: 'object',
              properties: {
                Type:           { type: 'string', enum: ['solid', 'gradient', 'image'] },
                Color:          { type: 'string' },
                GradientColor1: { type: 'string', nullable: true },
                GradientColor2: { type: 'string', nullable: true },
                GradientAngle:  { type: 'integer', nullable: true },
                ImageUrl:       { type: 'string', nullable: true },
              },
            },
            Legal: {
              nullable: true,
              type: 'object',
              properties: {
                Text:  { type: 'string' },
                Color: { type: 'string' },
                Link:  { type: 'string' },
                Regulatory_Logos: {
                  type: 'array',
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
              items: { $ref: '#/components/schemas/BPMBBookie' },
            },
          },
        },
        BPMBBookie: {
          type: 'object',
          properties: {
            BMID:                { type: 'integer' },
            Section_BG_Color:    { type: 'string' },
            Title_Text:          { type: 'string' },
            Title_Text_Color:    { type: 'string' },
            Subtitle_Text:       { type: 'string', nullable: true },
            Subtitle_Text_Color: { type: 'string', nullable: true },
            CTA_Text:            { type: 'string' },
            CTA_Text_Color:      { type: 'string' },
            Strip_Colors:        { type: 'array', items: { type: 'string' } },
            Click_URL:           { type: 'string' },
          },
        },
        TextColor: {
          type: 'object',
          properties: {
            Text:  { type: 'string' },
            Color: { type: 'string', example: '#ffffff' },
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
            subtitleTextColor: { type: 'string', nullable: true, default: 'rgba(255,255,255,0.6)' },
            ctaText:        { type: 'string' },
            ctaTextColor:   { type: 'string', default: '#ffffff' },
            stripColors:    { type: 'array', items: { type: 'string' }, maxItems: 2 },
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
  apis: ['./routes/bpService.js'],
};

module.exports = swaggerJsdoc(options);
