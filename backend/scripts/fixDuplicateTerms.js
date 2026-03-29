const dataLoader = require('../utils/dataLoader');

/**
 * Script to fix duplicate term IDs and assign correct NAME_IDs to competitors
 */
async function fixDuplicateTerms() {
  try {
    console.log('🔄 Loading data...');
    const [terms, competitors] = await Promise.all([
      dataLoader.loadData('terms.json'),
      dataLoader.loadData('competitors.json'),
    ]);

    // Find all terms with ID 77566160
    const duplicateTerms = terms.filter(t => t.id === 77566160);
    console.log(`📊 Found ${duplicateTerms.length} terms with ID 77566160`);

    // Find max term ID
    const maxTermId = Math.max(...terms.map(t => t.id || 0));
    let nextTermId = maxTermId + 1;

    // Create unique IDs for duplicates
    const termMapping = {};
    duplicateTerms.forEach((term, index) => {
      if (index === 0) {
        // Keep first one as is (Sporting CP)
        termMapping[77566160] = 77566160;
      } else {
        // Assign new IDs to others
        const newId = nextTermId++;
        term.id = newId;
        termMapping[newId] = newId;
        console.log(`✅ Assigned new ID ${newId} to term: ${term.engValue} (categoryId: ${term.categoryId})`);
      }
    });

    // Update competitors that reference duplicate terms
    competitors.forEach(competitor => {
      if (competitor.NAME_ID === 77566160) {
        // Find the correct term by country and name
        const term = terms.find(t => {
          if (t.id === 77566160 && t.categoryId === 1) {
            // Check if this is the right competitor
            if (competitor.COUNTRY_ID === 8 && t.engValue === 'Sporting CP') {
              return true;
            }
            if (competitor.COUNTRY_ID === 4 && t.engValue === 'Juventus') {
              return true;
            }
            if (competitor.COUNTRY_ID === 9 && t.engValue === 'Al-Nassr') {
              return true;
            }
          }
          return false;
        });
        
        // If we need a new term, create it
        if (!term || (term.id === 77566160 && competitor.COUNTRY_ID !== 8)) {
          let termName = '';
          if (competitor.COUNTRY_ID === 4) termName = 'Juventus';
          else if (competitor.COUNTRY_ID === 9) termName = 'Al-Nassr';
          
          if (termName) {
            const existingTerm = terms.find(t => 
              t.categoryId === 1 && 
              t.engValue === termName && 
              t.id !== 77566160
            );
            
            if (existingTerm) {
              competitor.NAME_ID = existingTerm.id;
              console.log(`✅ Updated competitor ${competitor.COMPETITOR_ID} to use term ID ${existingTerm.id} (${termName})`);
            } else {
              // Create new term
              const newTerm = {
                id: nextTermId++,
                categoryId: 1,
                aliasName: null,
                fatherTerm: null,
                createTime: null,
                description: null,
                category: "Competitors Names",
                values: [{
                  languageId: 1,
                  value: termName,
                  isDefault: true,
                  status: "Approved",
                  context: "",
                  block: false,
                  sequence: 1
                }],
                valsCount: 1,
                engValue: termName,
                langValue: termName
              };
              terms.push(newTerm);
              competitor.NAME_ID = newTerm.id;
              console.log(`✅ Created new term ID ${newTerm.id} for ${termName} and updated competitor ${competitor.COMPETITOR_ID}`);
            }
          }
        }
      }
    });

    // Save updated data
    await dataLoader.saveData('terms.json', terms);
    await dataLoader.saveData('competitors.json', competitors);

    console.log('\n✅ Fixed duplicate terms and updated competitors');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
fixDuplicateTerms();
