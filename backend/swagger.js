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
                Geo:      { type: 'string', nullable: true },
                Platform: { type: 'string', nullable: true },
                LID:      { type: 'integer', nullable: true },
                SOV:      { type: 'integer', example: 100 },
              },
            },
            Header: {
              type: 'object',
              properties: {
                Main_Title:      { $ref: '#/components/schemas/TextColor' },
                Secondary_Title: { $ref: '#/components/schemas/TextColor' },
                ImageURL:        { type: 'string', nullable: true },
                ImageHeight:     { type: 'integer', example: 110 },
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
            Terms_Text:          { type: 'string', nullable: true },
            CTA_Text:            { type: 'string' },
            CTA_Text_Color:      { type: 'string' },
            Strip_Colors:        { type: 'array', items: { type: 'string' } },
            LogoImage:           { type: 'string', nullable: true },
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
            geo:      { type: 'string', example: 'Italy', default: 'All' },
            platform: { type: 'string', example: 'Android', default: 'All' },
            lid:      { type: 'integer', nullable: true },
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
            termsText:         { type: 'string', nullable: true },
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
