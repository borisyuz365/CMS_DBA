require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bpCache = require('../backend/services/bpCache');
const runtimeRoutes = require('./routes/runtime');

const app = express();
const PORT = parseInt(process.env.PORT || '3002', 10);

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Italy regulatory SVG assets — paths in API responses are prefixed with BP_PUBLIC_BASE_URL.
const legalLogosPath = path.join(__dirname, '../public/legal-logos');
app.use('/legal-logos', express.static(legalLogosPath, {
  maxAge: '7d',
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  },
}));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'bp-runtime',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/bp', runtimeRoutes);

// Called by CMS after promotion CRUD — not exposed via CloudFront.
app.post('/internal/invalidate', async (req, res) => {
  const secret = process.env.BP_INVALIDATE_SECRET;
  if (secret && req.get('X-BP-Invalidate-Secret') !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    await bpCache.invalidate();
    res.json({ success: true, rebuiltAt: new Date().toISOString() });
  } catch (err) {
    console.error('[bp-service] cache reload failed:', err.message);
    res.status(500).json({ error: 'Cache reload failed' });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: { message: 'Route not found' } });
});

bpCache.start();
app.listen(PORT, () => {
  console.log(`BP runtime service listening on port ${PORT}`);
  console.log(`Health:  http://localhost:${PORT}/api/health`);
  console.log(`Runtime: http://localhost:${PORT}/api/bp`);
  if (process.env.BP_PUBLIC_BASE_URL) {
    console.log(`Public base URL: ${process.env.BP_PUBLIC_BASE_URL}`);
  }
});

module.exports = app;
