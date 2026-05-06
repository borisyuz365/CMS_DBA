const dataLoader = require('../utils/dataLoader');

class ScannerController {
  async getAll(req, res, next) {
    try {
      const list = await dataLoader.loadData('scanners.json');
      res.json({ success: true, data: Array.isArray(list) ? list : [] });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid scanner ID' } });
      }
      const list = await dataLoader.loadData('scanners.json');
      const item = Array.isArray(list) ? list.find((s) => s.SCANNER_ID === id) : null;
      if (!item) {
        return res.status(404).json({ success: false, error: { message: 'Scanner not found' } });
      }
      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  }

  async updateBulk(req, res, next) {
    try {
      const { updates } = req.body;
      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'Invalid updates array' } });
      }
      const list = await dataLoader.loadData('scanners.json');
      if (!Array.isArray(list)) {
        return res.status(500).json({ success: false, error: { message: 'Scanners data is invalid' } });
      }
      const allowedFields = [
        'SCANNER_NAME', 'DESCRIPTION', 'IS_ACTIVE', 'SCAN_INTERVAL_SECONDS',
        'FULL_SCAN_DAYS', 'FULL_SCAN_INTERVAL_SECONDS', 'SCANNER_LOCATION',
        'ASPNETCORE_ENV', 'SCANNER_IMAGE_URL', 'IS_DELETED',
      ];
      let updatedCount = 0;
      const errors = [];
      for (const update of updates) {
        const { scannerId, changes } = update;
        if (!scannerId || !changes || typeof changes !== 'object') {
          errors.push({ scannerId, error: 'Invalid update format' });
          continue;
        }
        const id = parseInt(scannerId, 10);
        const idx = list.findIndex((s) => s.SCANNER_ID === id);
        if (idx === -1) {
          errors.push({ scannerId: id, error: 'Scanner not found' });
          continue;
        }
        for (const [key, value] of Object.entries(changes)) {
          if (!allowedFields.includes(key)) continue;
          list[idx][key] = value === '' || value === undefined ? null : value;
        }
        updatedCount++;
      }
      await dataLoader.saveData('scanners.json', list);
      res.json({ success: true, data: { updated: updatedCount, errors: errors.length > 0 ? errors : undefined } });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const list = await dataLoader.loadData('scanners.json');
      const arr = Array.isArray(list) ? list : [];
      const maxId = arr.reduce((m, s) => Math.max(m, s.SCANNER_ID || 0), 0);
      const body = req.body;
      const newScanner = {
        SCANNER_ID: maxId + 1,
        SCANNER_NAME: body.SCANNER_NAME || '',
        HOST_NAME: body.HOST_NAME || '',
        DESCRIPTION: body.DESCRIPTION || '',
        DATA_SOURCE_NAME: body.DATA_SOURCE_NAME || '',
        DATA_SOURCE_ID: body.DATA_SOURCE_ID || null,
        ENVIRONMENT: body.ENVIRONMENT || 'prod',
        SPORT: body.SPORT || '',
        IS_ACTIVE: body.IS_ACTIVE !== undefined ? !!body.IS_ACTIVE : true,
        SOURCE: body.SOURCE || 'Redis',
        LAST_MESSAGE_SENT: null,
        START_TIME: new Date().toISOString(),
        TOTAL_MESSAGES_SENT: 0,
        REDIS_CONNECTION_STRING: body.REDIS_CONNECTION_STRING || null,
        SCANNER_LOCATION: body.SCANNER_LOCATION || null,
        ASPNETCORE_ENV: body.ASPNETCORE_ENV || null,
        SCAN_INTERVAL_SECONDS: body.SCAN_INTERVAL_SECONDS ? Number(body.SCAN_INTERVAL_SECONDS) : 30,
        FULL_SCAN_DAYS: body.FULL_SCAN_DAYS ? Number(body.FULL_SCAN_DAYS) : 7,
        FULL_SCAN_INTERVAL_SECONDS: body.FULL_SCAN_INTERVAL_SECONDS ? Number(body.FULL_SCAN_INTERVAL_SECONDS) : 7200,
        AVAILABLE_ACTIONS: body.AVAILABLE_ACTIONS || ['Restart', 'ClearQueue'],
        SCANNER_IMAGE_URL: null,
        IS_DELETED: false,
      };
      arr.push(newScanner);
      await dataLoader.saveData('scanners.json', arr);
      res.status(201).json({ success: true, data: newScanner });
    } catch (error) {
      next(error);
    }
  }

  async performAction(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const { action, params } = req.body;

      if (isNaN(id) || !action) {
        return res.status(400).json({ success: false, error: { message: 'Invalid scanner ID or action' } });
      }

      const list = await dataLoader.loadData('scanners.json');
      const item = Array.isArray(list) ? list.find((s) => s.SCANNER_ID === id) : null;
      if (!item) {
        return res.status(404).json({ success: false, error: { message: 'Scanner not found' } });
      }

      if (!item.AVAILABLE_ACTIONS.includes(action)) {
        return res.status(400).json({ success: false, error: { message: `Action '${action}' is not available for this scanner` } });
      }

      res.json({
        success: true,
        data: {
          scannerId: id,
          action,
          params: params || {},
          executedAt: new Date().toISOString(),
          result: `Action '${action}' submitted successfully`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ScannerController();
