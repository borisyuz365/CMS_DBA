const fs = require('fs').promises;
const path = require('path');

/**
 * DataLoader - Utility class for loading and saving JSON data files
 */
class DataLoader {
  constructor(dataDir = path.join(__dirname, '../data')) {
    this.dataDir = dataDir;
  }

  /**
   * Load data from a JSON file
   * @param {string} fileName - Name of the file (e.g., 'athletes.json')
   * @returns {Promise<Array|Object>} Parsed JSON data
   */
  async loadData(fileName) {
    const filePath = path.join(this.dataDir, fileName);
    let raw;
    try {
      raw = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw new Error(`Error loading ${fileName}: ${error.message}`);
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      // Empty or truncated JSON (e.g. after failed write) -> treat as empty array
      if (error.name === 'SyntaxError' && error.message.includes('Unexpected end of JSON input')) {
        const trimmed = (raw || '').trim();
        if (trimmed === '' || trimmed === '[') return [];
      }
      throw new Error(`Error loading ${fileName}: ${error.message}`);
    }
  }

  /**
   * Save data to a JSON file
   * @param {string} fileName - Name of the file (e.g., 'athletes.json')
   * @param {Array|Object} data - Data to save
   * @returns {Promise<void>}
   */
  async saveData(fileName, data) {
    try {
      const filePath = path.join(this.dataDir, fileName);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Error saving ${fileName}: ${error.message}`);
    }
  }
}

module.exports = new DataLoader();
