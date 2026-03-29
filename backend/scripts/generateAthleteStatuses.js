const fs = require('fs');
const path = require('path');
const dataLoader = require('../utils/dataLoader');

/**
 * Script to generate athlete_statuses.json based on athletes.json
 * - Creates status records for each athlete
 * - Status types: active, retired, dead
 * - active: no date
 * - retired: uses DATE_OF_RETIREMENT
 * - dead: uses DATE_OF_DEATH
 */

async function generateAthleteStatuses() {
  try {
    console.log('Loading athletes data...');
    
    // Load athletes data
    const athletes = await dataLoader.loadData('athletes.json');
    console.log(`Found ${athletes.length} athletes`);

    // Generate status records
    const athleteStatuses = [];
    let statusId = 1;

    athletes.forEach(athlete => {
      let statusType = 'active';
      let date = null;

      // Check for death date first (highest priority)
      if (athlete.DATE_OF_DEATH) {
        statusType = 'dead';
        date = athlete.DATE_OF_DEATH;
      }
      // Check for retirement date
      else if (athlete.DATE_OF_RETIREMENT) {
        statusType = 'retired';
        date = athlete.DATE_OF_RETIREMENT;
      }
      // Otherwise, active (no date)

      athleteStatuses.push({
        ATHLETE_STATUS_ID: statusId++,
        ATHLETE_ID: athlete.ATHLETE_ID,
        STATUS_TYPE: statusType,
        DATE: date
      });
    });

    // Count status types
    const activeCount = athleteStatuses.filter(s => s.STATUS_TYPE === 'active').length;
    const retiredCount = athleteStatuses.filter(s => s.STATUS_TYPE === 'retired').length;
    const deadCount = athleteStatuses.filter(s => s.STATUS_TYPE === 'dead').length;

    console.log(`Generated ${athleteStatuses.length} status records:`);
    console.log(`  - Active: ${activeCount}`);
    console.log(`  - Retired: ${retiredCount}`);
    console.log(`  - Dead: ${deadCount}`);

    // Save to file
    const outputPath = path.join(__dirname, '../data/athlete_statuses.json');
    await dataLoader.saveData('athlete_statuses.json', athleteStatuses);
    console.log(`\nSaved athlete_statuses.json to ${outputPath}`);

    console.log('\nDone!');
  } catch (error) {
    console.error('Error generating athlete statuses:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateAthleteStatuses();
}

module.exports = { generateAthleteStatuses };
