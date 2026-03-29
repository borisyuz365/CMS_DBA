const dataLoader = require('../utils/dataLoader');

/**
 * Script to update Cristiano Ronaldo's (ATHLETE_ID: 2) contracts with real career data
 */
async function updateRonaldoContracts() {
  try {
    console.log('🔄 Loading athlete contracts...');
    const contracts = await dataLoader.loadData('athlete_contracts.json');
    const competitors = await dataLoader.loadData('competitors.json');
    const terms = await dataLoader.loadData('terms.json');

    // Find competitor IDs by name
    const findCompetitorByName = (name) => {
      // Try exact match first
      let term = terms.find(t => 
        t.engValue && t.engValue.toLowerCase() === name.toLowerCase()
      );
      
      // Try partial match
      if (!term) {
        term = terms.find(t => 
          t.engValue && t.engValue.toLowerCase().includes(name.toLowerCase())
        );
      }
      
      if (!term) return null;
      
      // Find competitor with this NAME_ID and SPORT_TYPE_ID = 1 (football)
      const competitor = competitors.find(c => 
        c.NAME_ID === term.id && c.SPORT_TYPE_ID === 1
      );
      
      return competitor ? competitor.COMPETITOR_ID : null;
    };
    
    // Also search by alternative names
    const findCompetitorByNames = (names) => {
      for (const name of names) {
        const id = findCompetitorByName(name);
        if (id) return id;
      }
      return null;
    };

    // Find competitors
    const manchesterUnitedId = findCompetitorByName('Manchester United') || 1; // Fallback to known ID
    const realMadridId = findCompetitorByNames(['Real Madrid', 'Real Madrid CF', 'Real Madrid Club']);
    const juventusId = findCompetitorByNames(['Juventus', 'Juventus FC', 'Juventus Turin']);
    const sportingId = findCompetitorByNames(['Sporting CP', 'Sporting Lisbon', 'Sporting Clube de Portugal', 'Sporting']);
    const alNassrId = findCompetitorByNames(['Al-Nassr', 'Al Nassr', 'Al Nassr FC', 'Nassr']);

    console.log('📊 Found competitors:');
    console.log(`   Manchester United: ${manchesterUnitedId}`);
    console.log(`   Real Madrid: ${realMadridId || 'NOT FOUND'}`);
    console.log(`   Juventus: ${juventusId || 'NOT FOUND'}`);
    console.log(`   Sporting CP: ${sportingId || 'NOT FOUND'}`);
    console.log(`   Al-Nassr: ${alNassrId || 'NOT FOUND'}`);

    // Remove all existing contracts for athlete ID 2
    const filteredContracts = contracts.filter(c => c.ATHLETE_ID !== 2);
    console.log(`🗑️  Removed ${contracts.length - filteredContracts.length} existing contracts for athlete 2`);

    // Get max contract ID
    const maxContractId = contracts.length > 0 
      ? Math.max(...contracts.map(c => c.CONTRACT_ID || 0))
      : 0;

    // Cristiano Ronaldo's career contracts
    const ronaldoContracts = [
      // Sporting CP (2002-2003)
      {
        CONTRACT_ID: maxContractId + 1,
        ATHLETE_ID: 2,
        COMPETITOR_ID: sportingId || 890, // Using placeholder if not found
        START_DATE: "2002-08-14",
        END_DATE: "2003-08-12",
        CURRENT_CLUB: false,
        JERSEY_NUMBER: 28,
        TRANSFER_TYPE: null, // Youth academy
        TRANSFER_FEE: null,
        TRANSFER_FEE_CURRENCY: null,
        SALARY: null,
        SALARY_CURRENCY: null,
        POSITION: 4, // Attacker/Winger
        FORMATION_POSITION: 13, // Right Winger
        BLOCK_AUTOMATIC_UPDATES: false,
        MAIN_COMPETITION_ID: null, // Liga Portugal
      },
      // Manchester United (2003-2009) - First stint
      {
        CONTRACT_ID: maxContractId + 2,
        ATHLETE_ID: 2,
        COMPETITOR_ID: manchesterUnitedId,
        START_DATE: "2003-08-12",
        END_DATE: "2009-07-01",
        CURRENT_CLUB: false,
        JERSEY_NUMBER: 7,
        TRANSFER_TYPE: "FullOwnership",
        TRANSFER_FEE: 19000000, // €19M
        TRANSFER_FEE_CURRENCY: 1, // EUR
        SALARY: 5000000, // Estimated annual salary
        SALARY_CURRENCY: 1,
        POSITION: 4, // Attacker
        FORMATION_POSITION: 13, // Right Winger (early), then more central
        BLOCK_AUTOMATIC_UPDATES: false,
        MAIN_COMPETITION_ID: 10, // Premier League
      },
      // Real Madrid (2009-2018)
      {
        CONTRACT_ID: maxContractId + 3,
        ATHLETE_ID: 2,
        COMPETITOR_ID: realMadridId || 105, // Using placeholder if not found
        START_DATE: "2009-07-01",
        END_DATE: "2018-07-10",
        CURRENT_CLUB: false,
        JERSEY_NUMBER: 7, // Started with 9, switched to 7
        TRANSFER_TYPE: "FullOwnership",
        TRANSFER_FEE: 94000000, // €94M
        TRANSFER_FEE_CURRENCY: 1,
        SALARY: 21000000, // Estimated annual salary
        SALARY_CURRENCY: 1,
        POSITION: 4, // Attacker
        FORMATION_POSITION: 12, // Left Winger / Forward
        BLOCK_AUTOMATIC_UPDATES: false,
        MAIN_COMPETITION_ID: 11, // La Liga (placeholder)
      },
      // Juventus (2018-2021)
      {
        CONTRACT_ID: maxContractId + 4,
        ATHLETE_ID: 2,
        COMPETITOR_ID: juventusId || 226, // Using placeholder if not found
        START_DATE: "2018-07-10",
        END_DATE: "2021-08-31",
        CURRENT_CLUB: false,
        JERSEY_NUMBER: 7,
        TRANSFER_TYPE: "FullOwnership",
        TRANSFER_FEE: 117000000, // €117M
        TRANSFER_FEE_CURRENCY: 1,
        SALARY: 31000000, // Estimated annual salary
        SALARY_CURRENCY: 1,
        POSITION: 4, // Attacker
        FORMATION_POSITION: 17, // Centre Forward
        BLOCK_AUTOMATIC_UPDATES: false,
        MAIN_COMPETITION_ID: 12, // Serie A (placeholder)
      },
      // Manchester United (2021-2022) - Second stint
      {
        CONTRACT_ID: maxContractId + 5,
        ATHLETE_ID: 2,
        COMPETITOR_ID: manchesterUnitedId,
        START_DATE: "2021-08-31",
        END_DATE: "2022-11-22",
        CURRENT_CLUB: false,
        JERSEY_NUMBER: 7,
        TRANSFER_TYPE: "FullOwnership",
        TRANSFER_FEE: 17000000, // €17M
        TRANSFER_FEE_CURRENCY: 1,
        SALARY: 25000000, // Estimated annual salary
        SALARY_CURRENCY: 1,
        POSITION: 4, // Attacker
        FORMATION_POSITION: 17, // Centre Forward
        BLOCK_AUTOMATIC_UPDATES: false,
        MAIN_COMPETITION_ID: 10, // Premier League
      },
      // Al-Nassr (2023-Present)
      {
        CONTRACT_ID: maxContractId + 6,
        ATHLETE_ID: 2,
        COMPETITOR_ID: alNassrId || 5000, // Using placeholder if not found
        START_DATE: "2023-01-01",
        END_DATE: "2027-06-30",
        CURRENT_CLUB: true,
        JERSEY_NUMBER: 7,
        TRANSFER_TYPE: "FreeTransfer",
        TRANSFER_FEE: null,
        TRANSFER_FEE_CURRENCY: null,
        SALARY: 200000000, // €200M per year (reported)
        SALARY_CURRENCY: 1,
        POSITION: 4, // Attacker
        FORMATION_POSITION: 17, // Centre Forward
        BLOCK_AUTOMATIC_UPDATES: false,
        MAIN_COMPETITION_ID: null, // Saudi Pro League
      },
    ];

    // Add new contracts
    filteredContracts.push(...ronaldoContracts);

    console.log(`✅ Added ${ronaldoContracts.length} contracts for Cristiano Ronaldo`);

    // Save updated contracts
    console.log('💾 Saving updated contracts...');
    await dataLoader.saveData('athlete_contracts.json', filteredContracts);

    console.log('✅ Successfully updated Cristiano Ronaldo contracts');
    console.log('\n📋 Contract Summary:');
    ronaldoContracts.forEach((contract, index) => {
      console.log(`   ${index + 1}. ${contract.START_DATE} - ${contract.END_DATE || 'Present'}`);
      console.log(`      Club ID: ${contract.COMPETITOR_ID}, Jersey: ${contract.JERSEY_NUMBER}`);
      console.log(`      Transfer Fee: ${contract.TRANSFER_FEE ? `€${(contract.TRANSFER_FEE / 1000000).toFixed(1)}M` : 'Free'}`);
    });
  } catch (error) {
    console.error('❌ Error updating Ronaldo contracts:', error);
    process.exit(1);
  }
}

// Run the script
updateRonaldoContracts();
