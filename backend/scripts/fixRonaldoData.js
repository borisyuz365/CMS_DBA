const dataLoader = require('../utils/dataLoader');

/**
 * Script to fix and properly create clubs and competitions for Ronaldo
 * First removes duplicates, then creates proper entries
 */
async function fixRonaldoData() {
  try {
    console.log('🔄 Loading data...');
    const [terms, competitors, competitions, countries, contracts] = await Promise.all([
      dataLoader.loadData('terms.json'),
      dataLoader.loadData('competitors.json'),
      dataLoader.loadData('competitions.json'),
      dataLoader.loadData('countries.json'),
      dataLoader.loadData('athlete_contracts.json'),
    ]);

    // Find max IDs
    const maxTermId = Math.max(...terms.map(t => t.id || 0));
    const maxCompetitorId = Math.max(...competitors.map(c => c.COMPETITOR_ID || 0));
    const maxCompetitionId = Math.max(...competitions.map(c => c.COMPETITION_ID || 0));

    console.log(`📊 Current max IDs:`);
    console.log(`   Terms: ${maxTermId}`);
    console.log(`   Competitors: ${maxCompetitorId}`);
    console.log(`   Competitions: ${maxCompetitionId}`);

    // Remove duplicate competitors with ID 161 (keep only the first one, remove others)
    const duplicate161 = competitors.filter(c => c.COMPETITOR_ID === 161);
    if (duplicate161.length > 1) {
      console.log(`\n🗑️  Found ${duplicate161.length} competitors with ID 161, removing duplicates...`);
      // Keep first, remove rest
      const first161 = duplicate161[0];
      const filteredCompetitors = competitors.filter(c => c.COMPETITOR_ID !== 161);
      filteredCompetitors.push(first161);
      competitors.length = 0;
      competitors.push(...filteredCompetitors);
      console.log(`✅ Removed ${duplicate161.length - 1} duplicate competitors`);
    }

    // Remove duplicate terms with ID 77566160 (keep unique ones)
    const duplicateTerms = terms.filter(t => t.id === 77566160);
    if (duplicateTerms.length > 1) {
      console.log(`\n🗑️  Found ${duplicateTerms.length} terms with ID 77566160, removing duplicates...`);
      // Keep unique ones by categoryId and engValue
      const uniqueTerms = [];
      const seen = new Set();
      duplicateTerms.forEach(term => {
        const key = `${term.categoryId}-${term.engValue}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueTerms.push(term);
        }
      });
      // Remove all duplicates and add back unique ones
      const filteredTerms = terms.filter(t => t.id !== 77566160);
      filteredTerms.push(...uniqueTerms);
      terms.length = 0;
      terms.push(...filteredTerms);
      console.log(`✅ Kept ${uniqueTerms.length} unique terms, removed ${duplicateTerms.length - uniqueTerms.length} duplicates`);
    }

    // Find country IDs
    const spain = countries.find(c => c.name === 'Spain') || { COUNTRY_ID: 2 };
    const italy = countries.find(c => c.name === 'Italy') || { COUNTRY_ID: 4 };
    const portugal = countries.find(c => c.name === 'Portugal');
    const saudiArabia = countries.find(c => c.name === 'Saudi Arabia');

    const portugalId = portugal ? portugal.COUNTRY_ID : 8;
    const saudiId = saudiArabia ? saudiArabia.COUNTRY_ID : 9;

    console.log(`\n🌍 Country IDs:`);
    console.log(`   Spain: ${spain.COUNTRY_ID}`);
    console.log(`   Italy: ${italy.COUNTRY_ID}`);
    console.log(`   Portugal: ${portugalId}`);
    console.log(`   Saudi Arabia: ${saudiId}`);

    // Track IDs
    let nextTermId = maxTermId + 1;
    let nextCompetitorId = maxCompetitorId + 1;
    let nextCompetitionId = maxCompetitionId + 1;

    const newTerms = [];
    const newCompetitors = [];
    const newCompetitions = [];
    const competitorIds = {};

    // Helper functions
    const createTerm = (name, categoryId = 1) => {
      const term = {
        id: nextTermId++,
        categoryId: categoryId,
        aliasName: null,
        fatherTerm: null,
        createTime: null,
        description: null,
        category: categoryId === 1 ? "Competitors Names" : "Competitions Names",
        values: [{
          languageId: 1,
          value: name,
          isDefault: true,
          status: "Approved",
          context: "",
          block: false,
          sequence: 1
        }],
        valsCount: 1,
        engValue: name,
        langValue: name
      };
      newTerms.push(term);
      terms.push(term);
      return term;
    };

    const createCompetitor = (nameId, countryId, sportTypeId = 1, mainCompetition = null) => {
      const competitor = {
        COMPETITOR_ID: nextCompetitorId++,
        NAME_ID: nameId,
        SPORT_TYPE_ID: sportTypeId,
        COMPETITOR_TYPE: 1,
        COUNTRY_ID: countryId,
        HOME_MAIN_COLOR: 16711680,
        HOME_SECONDARY_COLOR: 16777215,
        AWAY_MAIN_COLOR: 16777215,
        AWAY_SECONDARY_COLOR: 16711680,
        CONNECT_BY_TEXT: false,
        SELECTIONS_RANK: 1,
        SYMBOLIC_NAME: null,
        GENDER: 1,
        ENABLE_DASHBOARD_BUZZ: false,
        MAIN_COMPETITION: mainCompetition,
        HIDE_ON_SEARCH: false,
        HIDE_ON_CATALOG: false,
        IMG_VER: 1,
        MINIMUM_ATHLETES_IN_SQUAD: null,
        FATHER_COMPETITOR: null,
        CITY_ID: null,
        TITLE_NAME: null,
        SHOT_CHART_COLOR: null,
        FOUNDED: null,
        VENUE_ID: null,
        HIDE_PLAYER_GAME_CARD: false,
        SUPPORT_DASHBOARD: true,
        FEDERATION_TERM_ID: null,
        STATISTICS_RESET_TYPE: null,
        STATISTICS_RESET_DATE: null,
        CAPTAIN: null,
        SHOW_ATHLETES_SALARY: false,
        SHOULD_SHOW_TROPHIES: true,
        THIRD_COLOR: null,
        LINEUP_INSIGHTS_ENABLED: true
      };
      newCompetitors.push(competitor);
      competitors.push(competitor);
      return competitor;
    };

    const createCompetition = (nameId, countryId, sportTypeId = 1) => {
      const competition = {
        COMPETITION_ID: nextCompetitionId++,
        NAME_ID: nameId,
        COUNTRY_ID: countryId,
        SPORT_TYPE_ID: sportTypeId,
        GENDER: 1,
        COMPETITION_TYPE: 1,
        CURRENT_SEASON: 1,
        CURRENT_STAGE: 1,
        IMG_VER: 1,
        MAIN_COLOR: 0,
        SECONDARY_COLOR: null,
        AUTO_START_GAMES: false,
        SCORES_UPDATE_POLICY: 1,
        ALWAYS_UPDATE_ABOVE_PRIORITY: 5,
        CONNECT_BY_TEXT: false,
        TABLE_WINNER_POINTS: 3,
        TABLE_DRAW_POINTS: 1,
        TABLE_LOSER_POINTS: 0,
        TABLE_IS_EVEN_EXISTS: true,
        TABLE_COUNT_ET_SCORE: false,
        TABLE_COUNT_PEN_SCORE: false,
        SUPPORT_COMPETITION_DASHBOARD: false,
        SUPPORT_PAST_FINALS_STANDINGS: true,
        ENABLE_DASHBOARD_BUZZ: false,
        HIDE_ON_CATALOG: false,
        HIDE_ON_SEARCH: false,
        DONT_DISPLAY_FATHERS_H2H: true,
        HIDE_FROM_POPULAR_WHEN_NO_ACTIVE: false,
        PROMOTE_DURING_ACTIVE_SEASON: false,
        HIDE_LMT_IN_COMPETITION_GAMES: false,
        SUPPORT_FANS_RATE: true,
        RECENTLY_WON_TROPHY_CARD: false,
        PROMOTE_NEW_TROPHY: false,
        AUTOMATIC_STATUS_PROGRESS: false,
        AUTO_TRANSFER_WAIT_APPROVAL: true,
        TRANSFERS_WINDOW_START_DATE: null,
        TRANSFERS_WINDOW_END_DATE: null,
        UPDATE_RESULT_SECOND_SCANNER: true,
        AUTO_PROCESS_ADDED_TIME: false,
        SUPPORT_TIE_ON_90: false,
        GAME_SUMMARY_POPUP: false,
        GAME_SUMMARY_NOTIFICATIONS: true,
        ALLOW_NOTIFICATIONS: false,
        HIDE_PLAYER_GAME_CARD: false,
        LINEUPS_NOTIFICATION_DELAY: false,
        DISPLAY_TOP_PREFERS: false,
        HIDE_COMPETITION_STATS: false,
        PREDICTABLE_LINEUPS_RESTRICTION: true,
      };
      newCompetitions.push(competition);
      competitions.push(competition);
      return competition;
    };

    // 1. Sporting CP
    let sportingTerm = terms.find(t => 
      t.categoryId === 1 && 
      t.engValue === 'Sporting CP'
    );
    if (!sportingTerm) {
      sportingTerm = createTerm('Sporting CP', 1);
      console.log(`✅ Created term for Sporting CP (ID: ${sportingTerm.id})`);
    }
    let sportingCompetitor = competitors.find(c => 
      c.NAME_ID === sportingTerm.id && c.SPORT_TYPE_ID === 1 && c.COUNTRY_ID === portugalId
    );
    if (!sportingCompetitor) {
      let ligaPortugal = competitions.find(c => {
        const compTerm = terms.find(t => t.id === c.NAME_ID);
        return compTerm && compTerm.engValue === 'Liga Portugal' && c.COUNTRY_ID === portugalId && c.SPORT_TYPE_ID === 1;
      });
      if (!ligaPortugal) {
        const term = createTerm('Liga Portugal', 4);
        ligaPortugal = createCompetition(term.id, portugalId, 1);
        console.log(`✅ Created Liga Portugal competition (ID: ${ligaPortugal.COMPETITION_ID})`);
      }
      sportingCompetitor = createCompetitor(sportingTerm.id, portugalId, 1, ligaPortugal.COMPETITION_ID);
      console.log(`✅ Created Sporting CP competitor (ID: ${sportingCompetitor.COMPETITOR_ID})`);
    }
    competitorIds.sporting = sportingCompetitor.COMPETITOR_ID;

    // 2. Real Madrid (Football) - use existing term 2011 but create competitor if missing
    let realMadridTerm = terms.find(t => t.id === 2011 && t.categoryId === 1);
    if (!realMadridTerm) {
      realMadridTerm = createTerm('Real Madrid', 1);
      console.log(`✅ Created term for Real Madrid (ID: ${realMadridTerm.id})`);
    }
    let realMadridCompetitor = competitors.find(c => 
      c.NAME_ID === realMadridTerm.id && c.SPORT_TYPE_ID === 1 && c.COUNTRY_ID === spain.COUNTRY_ID
    );
    if (!realMadridCompetitor) {
      let laLiga = competitions.find(c => {
        const compTerm = terms.find(t => t.id === c.NAME_ID);
        return compTerm && compTerm.engValue === 'La Liga' && c.COUNTRY_ID === spain.COUNTRY_ID && c.SPORT_TYPE_ID === 1;
      });
      if (!laLiga) {
        const term = createTerm('La Liga', 4);
        laLiga = createCompetition(term.id, spain.COUNTRY_ID, 1);
        console.log(`✅ Created La Liga competition (ID: ${laLiga.COMPETITION_ID})`);
      }
      realMadridCompetitor = createCompetitor(realMadridTerm.id, spain.COUNTRY_ID, 1, laLiga.COMPETITION_ID);
      console.log(`✅ Created Real Madrid competitor (ID: ${realMadridCompetitor.COMPETITOR_ID})`);
    }
    competitorIds.realMadrid = realMadridCompetitor.COMPETITOR_ID;

    // 3. Juventus
    let juventusTerm = terms.find(t => 
      t.categoryId === 1 && t.engValue === 'Juventus'
    );
    if (!juventusTerm) {
      juventusTerm = createTerm('Juventus', 1);
      console.log(`✅ Created term for Juventus (ID: ${juventusTerm.id})`);
    }
    let juventusCompetitor = competitors.find(c => 
      c.NAME_ID === juventusTerm.id && c.SPORT_TYPE_ID === 1 && c.COUNTRY_ID === italy.COUNTRY_ID
    );
    if (!juventusCompetitor) {
      let serieA = competitions.find(c => {
        const compTerm = terms.find(t => t.id === c.NAME_ID);
        return compTerm && compTerm.engValue === 'Serie A' && c.COUNTRY_ID === italy.COUNTRY_ID && c.SPORT_TYPE_ID === 1;
      });
      if (!serieA) {
        const term = createTerm('Serie A', 4);
        serieA = createCompetition(term.id, italy.COUNTRY_ID, 1);
        console.log(`✅ Created Serie A competition (ID: ${serieA.COMPETITION_ID})`);
      }
      juventusCompetitor = createCompetitor(juventusTerm.id, italy.COUNTRY_ID, 1, serieA.COMPETITION_ID);
      console.log(`✅ Created Juventus competitor (ID: ${juventusCompetitor.COMPETITOR_ID})`);
    }
    competitorIds.juventus = juventusCompetitor.COMPETITOR_ID;

    // 4. Al-Nassr
    let alNassrTerm = terms.find(t => 
      t.categoryId === 1 && t.engValue === 'Al-Nassr'
    );
    if (!alNassrTerm) {
      alNassrTerm = createTerm('Al-Nassr', 1);
      console.log(`✅ Created term for Al-Nassr (ID: ${alNassrTerm.id})`);
    }
    let alNassrCompetitor = competitors.find(c => 
      c.NAME_ID === alNassrTerm.id && c.SPORT_TYPE_ID === 1 && c.COUNTRY_ID === saudiId
    );
    if (!alNassrCompetitor) {
      let saudiProLeague = competitions.find(c => {
        const compTerm = terms.find(t => t.id === c.NAME_ID);
        return compTerm && compTerm.engValue === 'Saudi Pro League' && c.COUNTRY_ID === saudiId && c.SPORT_TYPE_ID === 1;
      });
      if (!saudiProLeague) {
        const term = createTerm('Saudi Pro League', 4);
        saudiProLeague = createCompetition(term.id, saudiId, 1);
        console.log(`✅ Created Saudi Pro League competition (ID: ${saudiProLeague.COMPETITION_ID})`);
      }
      alNassrCompetitor = createCompetitor(alNassrTerm.id, saudiId, 1, saudiProLeague.COMPETITION_ID);
      console.log(`✅ Created Al-Nassr competitor (ID: ${alNassrCompetitor.COMPETITOR_ID})`);
    }
    competitorIds.alNassr = alNassrCompetitor.COMPETITOR_ID;

    // Save all data
    if (newTerms.length > 0 || duplicateTerms.length > 1) {
      await dataLoader.saveData('terms.json', terms);
      console.log(`\n💾 Saved terms.json (${newTerms.length} new terms)`);
    }

    if (newCompetitions.length > 0) {
      await dataLoader.saveData('competitions.json', competitions);
      console.log(`💾 Saved competitions.json (${newCompetitions.length} new competitions)`);
    }

    if (newCompetitors.length > 0 || duplicate161.length > 1) {
      await dataLoader.saveData('competitors.json', competitors);
      console.log(`💾 Saved competitors.json (${newCompetitors.length} new competitors)`);
    }

    console.log('\n✅ Summary:');
    console.log(`   Sporting CP: COMPETITOR_ID ${competitorIds.sporting}`);
    console.log(`   Real Madrid: COMPETITOR_ID ${competitorIds.realMadrid}`);
    console.log(`   Juventus: COMPETITOR_ID ${competitorIds.juventus}`);
    console.log(`   Al-Nassr: COMPETITOR_ID ${competitorIds.alNassr}`);

    // Now update Ronaldo's contracts with correct IDs
    console.log('\n🔄 Updating Ronaldo contracts...');
    const ronaldoContracts = contracts.filter(c => c.ATHLETE_ID === 2);
    
    // Update contract COMPETITOR_IDs
    ronaldoContracts.forEach(contract => {
      if (contract.COMPETITOR_ID === 890 || contract.COMPETITOR_ID === 161) {
        // Check if it's Sporting CP by country
        const competitor = competitors.find(c => c.COMPETITOR_ID === contract.COMPETITOR_ID);
        if (competitor && competitor.COUNTRY_ID === portugalId) {
          contract.COMPETITOR_ID = competitorIds.sporting;
        }
      }
      if (contract.COMPETITOR_ID === 105 || contract.COMPETITOR_ID === 161) {
        // Check if it's Real Madrid by country
        const competitor = competitors.find(c => c.COMPETITOR_ID === contract.COMPETITOR_ID);
        if (competitor && competitor.COUNTRY_ID === spain.COUNTRY_ID) {
          contract.COMPETITOR_ID = competitorIds.realMadrid;
        }
      }
      if (contract.COMPETITOR_ID === 226 || contract.COMPETITOR_ID === 161) {
        // Check if it's Juventus by country
        const competitor = competitors.find(c => c.COMPETITOR_ID === contract.COMPETITOR_ID);
        if (competitor && competitor.COUNTRY_ID === italy.COUNTRY_ID) {
          contract.COMPETITOR_ID = competitorIds.juventus;
        }
      }
      if (contract.COMPETITOR_ID === 5000 || contract.COMPETITOR_ID === 161) {
        // Check if it's Al-Nassr by country
        const competitor = competitors.find(c => c.COMPETITOR_ID === contract.COMPETITOR_ID);
        if (competitor && competitor.COUNTRY_ID === saudiId) {
          contract.COMPETITOR_ID = competitorIds.alNassr;
        }
      }
    });

    // Better approach: update by exact date ranges
    ronaldoContracts.sort((a, b) => new Date(a.START_DATE) - new Date(b.START_DATE));
    
    ronaldoContracts.forEach((contract, index) => {
      const startDate = contract.START_DATE;
      
      // Update based on exact dates from Ronaldo's career
      if (startDate === '2002-08-14') {
        // Sporting CP
        contract.COMPETITOR_ID = competitorIds.sporting;
        contract.MAIN_COMPETITION_ID = competitors.find(c => c.COMPETITOR_ID === competitorIds.sporting)?.MAIN_COMPETITION || null;
      } else if (startDate === '2003-08-12') {
        // Manchester United (first stint)
        contract.COMPETITOR_ID = 1; // Manchester United
        contract.MAIN_COMPETITION_ID = 10; // Premier League
      } else if (startDate === '2009-07-01') {
        // Real Madrid
        contract.COMPETITOR_ID = competitorIds.realMadrid;
        contract.MAIN_COMPETITION_ID = competitors.find(c => c.COMPETITOR_ID === competitorIds.realMadrid)?.MAIN_COMPETITION || null;
      } else if (startDate === '2018-07-10') {
        // Juventus
        contract.COMPETITOR_ID = competitorIds.juventus;
        contract.MAIN_COMPETITION_ID = competitors.find(c => c.COMPETITOR_ID === competitorIds.juventus)?.MAIN_COMPETITION || null;
      } else if (startDate === '2021-08-31') {
        // Manchester United (second stint)
        contract.COMPETITOR_ID = 1; // Manchester United
        contract.MAIN_COMPETITION_ID = 10; // Premier League
        contract.CURRENT_CLUB = false; // Not current anymore
      } else if (startDate === '2023-01-01') {
        // Al-Nassr
        contract.COMPETITOR_ID = competitorIds.alNassr;
        contract.MAIN_COMPETITION_ID = competitors.find(c => c.COMPETITOR_ID === competitorIds.alNassr)?.MAIN_COMPETITION || null;
        contract.CURRENT_CLUB = true; // This is his current club
      }
      
      // Ensure only one CURRENT_CLUB is true
      if (contract.CURRENT_CLUB && startDate !== '2023-01-01') {
        contract.CURRENT_CLUB = false;
      }
    });

    await dataLoader.saveData('athlete_contracts.json', contracts);
    console.log(`💾 Updated athlete_contracts.json with correct COMPETITOR_IDs`);

    console.log('\n✅ All done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
fixRonaldoData();
