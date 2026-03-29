const dataLoader = require('../utils/dataLoader');

/**
 * Script to add MARKET_VALUE_CURRENCY field to all athletes
 * - Adds MARKET_VALUE_CURRENCY: null to all athletes that don't have it
 */

async function addMarketValueCurrency() {
  try {
    console.log('Loading athletes data...');
    
    // Load athletes data
    const athletes = await dataLoader.loadData('athletes.json');
    console.log(`Found ${athletes.length} athletes`);

    let updated = 0;
    let alreadyHasField = 0;

    // Add MARKET_VALUE_CURRENCY to each athlete
    for (let i = 0; i < athletes.length; i++) {
      const athlete = athletes[i];
      
      // Check if athlete already has the field
      if (athlete.MARKET_VALUE_CURRENCY !== undefined) {
        alreadyHasField++;
        continue;
      }

      // Add the field with null value
      athlete.MARKET_VALUE_CURRENCY = null;
      updated++;

      // Progress indicator
      if ((i + 1) % 1000 === 0) {
        console.log(`Processed ${i + 1}/${athletes.length} athletes...`);
      }
    }

    console.log(`\nUpdate complete!`);
    console.log(`Updated: ${updated} athletes`);
    console.log(`Already had field: ${alreadyHasField} athletes`);

    // Save updated athletes
    console.log('\nSaving updated athletes.json...');
    await dataLoader.saveData('athletes.json', athletes);
    console.log('✓ Successfully saved athletes.json');

    console.log('\n✓ Script completed successfully');
  } catch (error) {
    console.error('Error adding MARKET_VALUE_CURRENCY:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  addMarketValueCurrency()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addMarketValueCurrency };
