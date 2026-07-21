require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

// Import routes
const athletesRoutes = require('./routes/athletes');
const competitorsRoutes = require('./routes/competitors');
const venuesRoutes = require('./routes/venues');
const tvNetworksRoutes = require('./routes/tvNetworks');
const countriesRoutes = require('./routes/countries');
const sportsRoutes = require('./routes/sports');
const dataSourcesRoutes = require('./routes/data_sources');
const languagesRoutes = require('./routes/languages');
const timeZonesRoutes = require('./routes/time_zones');
const tzdbTimeZonesRoutes = require('./routes/tzdb_time_zones');
const termsRoutes = require('./routes/terms');
const dataRoutes = require('./routes/data');
const dictionaryRoutes = require('./routes/dictionary');
const gamesRoutes = require('./routes/games');
const prioritiesRoutes = require('./routes/priorities');
const filtersRoutes = require('./routes/filters');
const citiesRoutes = require('./routes/cities');
const tempRoutes = require('./routes/temp');
const scannersRoutes = require('./routes/scanners');
const dbaBookmakerPoolRoutes = require('./routes/dbaBookmakerPool');
const dbaBookmakersRoutes = require('./routes/dbaBookmakers');
const dbaTemplatesRoutes = require('./routes/dbaTemplates');
const dbaServiceRoutes = require('./routes/dbaService');
const dbaGamRoutes = require('./routes/dbaGam');
const dbaLinksRoutes = require('./routes/dbaLinks');
const bpServiceRoutes = require('./routes/bpService');
const bpCache = require('./services/bpCache');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  console.log(`${timestamp} - ${req.method} ${req.path} from ${ip}`);
  next();
});

// Swagger UI — BP Service docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// API Routes
app.use('/api/athletes', athletesRoutes);
app.use('/api/competitors', competitorsRoutes);
app.use('/api/venues', venuesRoutes);
app.use('/api/tv-networks', tvNetworksRoutes);
app.use('/api/countries', countriesRoutes);
app.use('/api/sports', sportsRoutes);
app.use('/api/data-sources', dataSourcesRoutes);
app.use('/api/languages', languagesRoutes);
app.use('/api/time-zones', timeZonesRoutes);
app.use('/api/tzdb-time-zones', tzdbTimeZonesRoutes);
app.use('/api/terms', termsRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/dictionary', dictionaryRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/priorities', prioritiesRoutes);
app.use('/api/filters', filtersRoutes);
app.use('/api/cities', citiesRoutes);
app.use('/api/temp', tempRoutes);
app.use('/api/scanners', scannersRoutes);
app.use('/api/dba/bookmaker-pool', dbaBookmakerPoolRoutes);
app.use('/api/dba/bookmakers', dbaBookmakersRoutes);
app.use('/api/dba/templates', dbaTemplatesRoutes);
app.use('/api/dba/service', dbaServiceRoutes);
app.use('/api/dba/gam', dbaGamRoutes);
app.use('/api/dba/links', dbaLinksRoutes);
app.use('/api/bp', bpServiceRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// GAM creatives load this via `<script src="/dba-runtime.js">` to render
// match cards inside the ad iframe. Permissive CORS so any publisher domain
// can pull it; short cache so a redeploy reaches in-flight ads without a
// GAM re-publish. Mirrors the same route in DBAManagementService.
const dbaRuntimePath = path.join(__dirname, 'gam', 'templates', 'dba-runtime.js');
app.get('/dba-runtime.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.sendFile(dbaRuntimePath);
});

// Serve the built frontend when present (Docker/production). After all API
// routes so /api/* keeps priority. Skipped in local dev, where Vite serves
// the frontend separately on :3000 and frontend/dist doesn't exist.
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found'
    }
  });
});

// Start server
bpCache.start();
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`BP Service docs: http://localhost:${PORT}/api-docs`);
});

module.exports = app;
