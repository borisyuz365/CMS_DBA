/**
 * Script to add position and formation position terms from athletes_positions.json
 * to terms.json under the appropriate categories
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

async function addPositionTerms() {
  try {
    console.log('🔄 Loading data...');
    
    // Load all data files
    const [athletesPositions, terms, categories] = await Promise.all([
      JSON.parse(fs.readFileSync(path.join(dataDir, 'athletes_positions.json'), 'utf8')),
      JSON.parse(fs.readFileSync(path.join(dataDir, 'terms.json'), 'utf8')),
      JSON.parse(fs.readFileSync(path.join(dataDir, 'categories.json'), 'utf8'))
    ]);

    // Find max term ID
    const maxTermId = Math.max(...terms.map(t => t.id || 0));
    let nextTermId = maxTermId + 1;

    console.log(`📊 Current max term ID: ${maxTermId}`);
    console.log(`📊 Starting new term IDs from: ${nextTermId}`);

    // Get existing terms by category and name
    const existingPositionTerms = new Set();
    const existingFormationPositionTerms = new Set();

    terms.forEach(term => {
      if (term.categoryId === 8) { // Athlete Position Types
        const defaultValue = term.values?.find(v => v.isDefault)?.value || term.engValue || '';
        if (defaultValue) {
          existingPositionTerms.add(defaultValue);
        }
      } else if (term.categoryId === 9) { // Athlete Formation Position Types
        const defaultValue = term.values?.find(v => v.isDefault)?.value || term.engValue || '';
        if (defaultValue) {
          existingFormationPositionTerms.add(defaultValue);
        }
      }
    });

    console.log(`\n📋 Existing Position Types (${existingPositionTerms.size}):`, Array.from(existingPositionTerms).sort());
    console.log(`📋 Existing Formation Position Types (${existingFormationPositionTerms.size}):`, Array.from(existingFormationPositionTerms).sort());

    // Collect all positions and formation positions from athletes_positions.json
    const positionsToAdd = new Set();
    const formationPositionsToAdd = new Set();

    athletesPositions.forEach(position => {
      // Add POSITION_NAME
      if (position.POSITION_NAME && !existingPositionTerms.has(position.POSITION_NAME)) {
        positionsToAdd.add(position.POSITION_NAME);
      }

      // Add all FORMATION_POSITION_NAME values
      if (position.FORMATION_POSITIONS && Array.isArray(position.FORMATION_POSITIONS)) {
        position.FORMATION_POSITIONS.forEach(fp => {
          if (fp.FORMATION_POSITION_NAME && !existingFormationPositionTerms.has(fp.FORMATION_POSITION_NAME)) {
            formationPositionsToAdd.add(fp.FORMATION_POSITION_NAME);
          }
        });
      }
    });

    console.log(`\n➕ Positions to add (${positionsToAdd.size}):`, Array.from(positionsToAdd).sort());
    console.log(`➕ Formation Positions to add (${formationPositionsToAdd.size}):`, Array.from(formationPositionsToAdd).sort());

    // Create new terms for positions (categoryId: 8)
    const newPositionTerms = Array.from(positionsToAdd).map(positionName => {
      const term = {
        id: nextTermId++,
        categoryId: 8,
        aliasName: null,
        fatherTerm: null,
        createTime: null,
        description: null,
        category: "Athlete Position Types",
        values: [
          {
            languageId: 1, // English
            value: positionName,
            isDefault: true,
            status: "Approved"
          }
        ],
        valsCount: 1,
        engValue: positionName,
        langValue: positionName
      };
      return term;
    });

    // Create new terms for formation positions (categoryId: 9)
    const newFormationPositionTerms = Array.from(formationPositionsToAdd).map(formationPositionName => {
      const term = {
        id: nextTermId++,
        categoryId: 9,
        aliasName: null,
        fatherTerm: null,
        createTime: null,
        description: null,
        category: "Athlete Formation Position Types",
        values: [
          {
            languageId: 1, // English
            value: formationPositionName,
            isDefault: true,
            status: "Approved"
          }
        ],
        valsCount: 1,
        engValue: formationPositionName,
        langValue: formationPositionName
      };
      return term;
    });

    // Add new terms to the terms array
    const allNewTerms = [...newPositionTerms, ...newFormationPositionTerms];
    
    if (allNewTerms.length === 0) {
      console.log('\n✅ All positions already exist in terms.json. No new terms to add.');
      return;
    }

    terms.push(...allNewTerms);

    console.log(`\n✅ Created ${newPositionTerms.length} new position terms`);
    console.log(`✅ Created ${newFormationPositionTerms.length} new formation position terms`);
    console.log(`✅ Total new terms: ${allNewTerms.length}`);

    // Save updated terms.json
    fs.writeFileSync(
      path.join(dataDir, 'terms.json'),
      JSON.stringify(terms, null, 2),
      'utf8'
    );

    console.log('\n💾 Saved updated terms.json');

    // Print summary
    console.log('\n📊 Summary:');
    console.log(`   New Position Terms:`);
    newPositionTerms.forEach(t => {
      console.log(`     - ID ${t.id}: ${t.engValue}`);
    });
    console.log(`\n   New Formation Position Terms:`);
    newFormationPositionTerms.forEach(t => {
      console.log(`     - ID ${t.id}: ${t.engValue}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run the script
addPositionTerms()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
