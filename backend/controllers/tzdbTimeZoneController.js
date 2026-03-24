const dataLoader = require('../utils/dataLoader');

const DATA_FILE = 'tzdb_time_zones.json';

/**
 * TZDB Time Zone Controller - CRUD for tzdb_time_zones.json
 * (Time Zone Database mapping: TIME_ZONE_NAME -> CONNECTED_TIME_ZONE, CONNECTED_COUNTRY_ID, CREATE_TIME)
 */
class TzdbTimeZoneController {
  async getAll(req, res, next) {
    try {
      let list = await dataLoader.loadData(DATA_FILE);
      if (!Array.isArray(list)) list = [];

      const connectedTimeZoneId = req.query.connectedTimeZoneId;
      const unconnected = req.query.unconnected === 'true' || req.query.unconnected === true;

      if (connectedTimeZoneId != null && connectedTimeZoneId !== '') {
        const id = Number(connectedTimeZoneId);
        if (!Number.isNaN(id)) {
          list = list.filter((r) => r.CONNECTED_TIME_ZONE === id);
        }
      } else if (unconnected) {
        list = list.filter(
          (r) => r.CONNECTED_TIME_ZONE == null || r.CONNECTED_TIME_ZONE === 0
        );
      }

      res.json({
        success: true,
        data: list,
      });
    } catch (error) {
      next(error);
    }
  }

  async getByName(req, res, next) {
    try {
      const name = req.params.name ? decodeURIComponent(req.params.name) : '';
      if (!name) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid time zone name' },
        });
      }

      const list = await dataLoader.loadData(DATA_FILE);
      const item = Array.isArray(list)
        ? list.find((r) => r.TIME_ZONE_NAME === name)
        : null;

      if (!item) {
        return res.status(404).json({
          success: false,
          error: { message: 'TZDB time zone not found' },
        });
      }

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update CONNECTED_TIME_ZONE for a TZDB record identified by TIME_ZONE_NAME.
   * Body: { CONNECTED_TIME_ZONE: number | null }
   */
  async updateConnection(req, res, next) {
    try {
      const name = req.params.name ? decodeURIComponent(req.params.name) : '';
      if (!name) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid time zone name' },
        });
      }

      const { CONNECTED_TIME_ZONE } = req.body || {};
      const value =
        CONNECTED_TIME_ZONE == null || CONNECTED_TIME_ZONE === ''
          ? null
          : Number(CONNECTED_TIME_ZONE);
      if (value !== null && Number.isNaN(value)) {
        return res.status(400).json({
          success: false,
          error: { message: 'CONNECTED_TIME_ZONE must be a number or null' },
        });
      }

      const list = await dataLoader.loadData(DATA_FILE);
      if (!Array.isArray(list)) {
        return res.status(500).json({
          success: false,
          error: { message: 'Invalid data file' },
        });
      }

      const index = list.findIndex((r) => r.TIME_ZONE_NAME === name);
      if (index === -1) {
        return res.status(404).json({
          success: false,
          error: { message: 'TZDB time zone not found' },
        });
      }

      list[index] = { ...list[index], CONNECTED_TIME_ZONE: value };
      await dataLoader.saveData(DATA_FILE, list);

      res.json({
        success: true,
        data: list[index],
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TzdbTimeZoneController();
