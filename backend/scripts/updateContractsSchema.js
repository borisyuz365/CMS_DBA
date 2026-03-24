const dataLoader = require('../utils/dataLoader');
const path = require('path');

/**
 * Script to update athlete_contracts.json with new fields
 * Adds: TRANSFER_TYPE, TRANSFER_FEE, TRANSFER_FEE_CURRENCY, SALARY, SALARY_CURRENCY,
 *       POSITION, FORMATION_POSITION, BLOCK_AUTOMATIC_UPDATES, MAIN_COMPETITION_ID
 */
async function updateContractsSchema() {
  try {
    console.log('🔄 Loading athlete contracts...');
    const contracts = await dataLoader.loadData('athlete_contracts.json');

    console.log(`📊 Found ${contracts.length} contracts to update`);

    let updatedCount = 0;
    contracts.forEach((contract, index) => {
      let updated = false;

      // Add TRANSFER_TYPE if missing (default: null)
      if (contract.TRANSFER_TYPE === undefined) {
        contract.TRANSFER_TYPE = null;
        updated = true;
      }

      // Add TRANSFER_FEE if missing (default: null)
      if (contract.TRANSFER_FEE === undefined) {
        contract.TRANSFER_FEE = null;
        updated = true;
      }

      // Add TRANSFER_FEE_CURRENCY if missing (default: null)
      if (contract.TRANSFER_FEE_CURRENCY === undefined) {
        contract.TRANSFER_FEE_CURRENCY = null;
        updated = true;
      }

      // Add SALARY if missing (default: null)
      if (contract.SALARY === undefined) {
        contract.SALARY = null;
        updated = true;
      }

      // Add SALARY_CURRENCY if missing (default: null)
      if (contract.SALARY_CURRENCY === undefined) {
        contract.SALARY_CURRENCY = null;
        updated = true;
      }

      // Add POSITION if missing (default: null)
      if (contract.POSITION === undefined) {
        contract.POSITION = null;
        updated = true;
      }

      // Add FORMATION_POSITION if missing (default: null)
      if (contract.FORMATION_POSITION === undefined) {
        contract.FORMATION_POSITION = null;
        updated = true;
      }

      // Add BLOCK_AUTOMATIC_UPDATES if missing (default: false)
      if (contract.BLOCK_AUTOMATIC_UPDATES === undefined) {
        contract.BLOCK_AUTOMATIC_UPDATES = false;
        updated = true;
      }

      // Add MAIN_COMPETITION_ID if missing (default: null)
      if (contract.MAIN_COMPETITION_ID === undefined) {
        contract.MAIN_COMPETITION_ID = null;
        updated = true;
      }

      // Add CONTRACT_ID if missing (generate unique ID)
      if (contract.CONTRACT_ID === undefined) {
        // Generate unique ID: ATHLETE_ID * 100000 + index (ensures uniqueness)
        contract.CONTRACT_ID = contract.ATHLETE_ID * 100000 + index;
        updated = true;
      }

      if (updated) {
        updatedCount++;
      }
    });

    console.log(`✅ Updated ${updatedCount} contracts with new fields`);

    // Save updated contracts
    console.log('💾 Saving updated contracts...');
    await dataLoader.saveData('athlete_contracts.json', contracts);

    console.log('✅ Successfully updated athlete_contracts.json schema');
    console.log('\n📋 New fields added:');
    console.log('   - TRANSFER_TYPE');
    console.log('   - TRANSFER_FEE');
    console.log('   - TRANSFER_FEE_CURRENCY');
    console.log('   - SALARY');
    console.log('   - SALARY_CURRENCY');
    console.log('   - POSITION');
    console.log('   - FORMATION_POSITION');
    console.log('   - BLOCK_AUTOMATIC_UPDATES');
    console.log('   - MAIN_COMPETITION_ID');
    console.log('   - CONTRACT_ID (unique identifier)');
  } catch (error) {
    console.error('❌ Error updating contracts schema:', error);
    process.exit(1);
  }
}

// Run the script
updateContractsSchema();
