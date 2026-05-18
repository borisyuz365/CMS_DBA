require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

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
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Athletes API: http://localhost:${PORT}/api/athletes`);
  console.log(`Competitors API: http://localhost:${PORT}/api/competitors`);
  console.log(`Venues API: http://localhost:${PORT}/api/venues`);
  console.log(`Countries API: http://localhost:${PORT}/api/countries`);
});

module.exports = app;
