const dataLoader = require('../utils/dataLoader');

/**
 * City Controller - CRUD for cities (read from/write to cities.json)
 */
class CityController {
  async getAll(req, res, next) {
    try {
      const { cityId, name, countryId } = req.query;
      let cities = await dataLoader.loadData('cities.json');

      if (cityId) {
        const id = parseInt(cityId);
        if (!isNaN(id)) {
          cities = cities.filter(c => c.CITY_ID === id);
        }
      }
      if (name && name.trim()) {
        const searchName = name.trim().toLowerCase();
        cities = cities.filter(c => (c.CITY_NAME || '').toLowerCase().includes(searchName));
      }
      if (countryId) {
        const id = parseInt(countryId);
        if (!isNaN(id)) {
          cities = cities.filter(c => c.COUNTRY_ID === id);
        }
      }

      res.json({
        success: true,
        data: cities
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const cityId = parseInt(req.params.id);
      if (isNaN(cityId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid city ID' }
        });
      }

      const cities = await dataLoader.loadData('cities.json');
      const city = cities.find(c => c.CITY_ID === cityId);

      if (!city) {
        return res.status(404).json({
          success: false,
          error: { message: `City with ID ${cityId} not found` }
        });
      }

      res.json({
        success: true,
        data: city
      });
    } catch (error) {
      next(error);
    }
  }

  async updateBulk(req, res, next) {
    try {
      const { updates } = req.body;

      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid updates array' }
        });
      }

      const cities = await dataLoader.loadData('cities.json');
      let updatedCount = 0;
      const errors = [];

      const allowedFields = ['COUNTRY_ID', 'NAME_ID', 'CITY_NAME', 'IS_DELETED'];

      for (const update of updates) {
        const { cityId, changes } = update;

        if (!cityId || !changes || typeof changes !== 'object') {
          errors.push({ cityId, error: 'Invalid update format' });
          continue;
        }

        const id = parseInt(cityId);
        const idx = cities.findIndex(c => c.CITY_ID === id);
        if (idx === -1) {
          errors.push({ cityId: id, error: 'City not found' });
          continue;
        }

        const city = cities[idx];
        for (const [key, value] of Object.entries(changes)) {
          if (!allowedFields.includes(key)) continue;
          if (key === 'CITY_ID') continue;
          if (['COUNTRY_ID', 'NAME_ID'].includes(key)) {
            city[key] = value === '' || value === null || value === undefined ? null : (isNaN(Number(value)) ? value : Number(value));
          } else if (key === 'IS_DELETED') {
            city[key] = value === true || value === 'true' || value === 1;
          } else {
            city[key] = value === '' ? null : value;
          }
        }
        updatedCount++;
      }

      await dataLoader.saveData('cities.json', cities);

      res.json({
        success: true,
        data: {
          updated: updatedCount,
          errors: errors.length > 0 ? errors : undefined
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const body = req.body;

      if (!body.CITY_NAME || (typeof body.CITY_NAME === 'string' && !body.CITY_NAME.trim())) {
        return res.status(400).json({
          success: false,
          error: { message: 'CITY_NAME is required' }
        });
      }

      const cities = await dataLoader.loadData('cities.json');
      const maxId = cities.length > 0 ? Math.max(...cities.map(c => c.CITY_ID || 0)) : 0;
      const newCityId = maxId + 1;

      const NAME_ID = body.NAME_ID != null && body.NAME_ID !== '' ? parseInt(body.NAME_ID) : null;

      const newCity = {
        CITY_ID: newCityId,
        NAME_ID,
        CITY_NAME: (body.CITY_NAME || '').trim(),
        COUNTRY_ID: body.COUNTRY_ID === '' || body.COUNTRY_ID === null || body.COUNTRY_ID === undefined ? null : (isNaN(Number(body.COUNTRY_ID)) ? null : Number(body.COUNTRY_ID)),
      };

      cities.push(newCity);
      await dataLoader.saveData('cities.json', cities);

      res.status(201).json({
        success: true,
        data: newCity
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CityController();
