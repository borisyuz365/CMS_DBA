const dataLoader = require('../utils/dataLoader');

/**
 * Script to create missing clubs and competitions for Cristiano Ronaldo's career
 * Creates: Sporting CP, Real Madrid (football), Juventus, Al-Nassr
 * Creates: La Liga, Serie A, Liga Portugal, Saudi Pro League
 */
async function createRonaldoClubsAndCompetitions() {
  try {
    console.log('🔄 Loading data...');
    const [terms, competitors, competitions, countries] = await Promise.all([
      dataLoader.loadData('terms.json'),
      dataLoader.loadData('competitors.json'),
      dataLoader.loadData('competitions.json'),
      dataLoader.loadData('countries.json'),
    ]);

    // Find max IDs
    const maxTermId = Math.max(...terms.map(t => t.id || 0));
    const maxCompetitorId = Math.max(...competitors.map(c => c.COMPETITOR_ID || 0));
    const maxCompetitionId = Math.max(...competitions.map(c => c.COMPETITION_ID || 0));

    console.log(`📊 Current max IDs:`);
    console.log(`   Terms: ${maxTermId}`);
    console.log(`   Competitors: ${maxCompetitorId}`);
    console.log(`   Competitions: ${maxCompetitionId}`);

    // Find country IDs
    const findCountryByName = (name) => {
      return countries.find(c => 
        c.name && c.name.toLowerCase().includes(name.toLowerCase())
      );
    };

    const spain = findCountryByName('Spain') || { COUNTRY_ID: 2 }; // Fallback
    const italy = findCountryByName('Italy') || { COUNTRY_ID: 4 }; // Fallback
    const portugal = findCountryByName('Portugal');
    const saudiArabia = findCountryByName('Saudi');

    console.log(`\n🌍 Country IDs:`);
    console.log(`   Spain: ${spain.COUNTRY_ID}`);
    console.log(`   Italy: ${italy.COUNTRY_ID}`);
    console.log(`   Portugal: ${portugal ? portugal.COUNTRY_ID : 'NOT FOUND - will create'}`);
    console.log(`   Saudi Arabia: ${saudiArabia ? saudiArabia.COUNTRY_ID : 'NOT FOUND - will create'}`);

    // Create Portugal if missing
    let portugalId = portugal ? portugal.COUNTRY_ID : null;
    if (!portugal) {
      const maxCountryId = Math.max(...countries.map(c => c.COUNTRY_ID || 0));
      portugalId = maxCountryId + 1;
      countries.push({
        COUNTRY_ID: portugalId,
        NAME_ID: null, // Will need to create term
        COUNTRY_CODE: 'PT',
        TIME_ZONE_ID: 1,
        IS_NOT_REAL: false,
        ALLOW_BETTING: true,
        EMOJI: '🇵🇹',
        CONNECT_BY_TEXT: false,
        IMG_VER: 1,
        name: 'Portugal',
        MAIN_COLOR: 0,
        SECONDARY_COLOR: 16711680,
      });
      console.log(`✅ Created Portugal with COUNTRY_ID: ${portugalId}`);
    }

    // Create Saudi Arabia if missing
    let saudiId = saudiArabia ? saudiArabia.COUNTRY_ID : null;
    if (!saudiArabia) {
      const maxCountryId = Math.max(...countries.map(c => c.COUNTRY_ID || 0));
      saudiId = maxCountryId + 1;
      countries.push({
        COUNTRY_ID: saudiId,
        NAME_ID: null, // Will need to create term
        COUNTRY_CODE: 'SA',
        TIME_ZONE_ID: 3,
        IS_NOT_REAL: false,
        ALLOW_BETTING: true,
        EMOJI: '🇸🇦',
        CONNECT_BY_TEXT: false,
        IMG_VER: 1,
        name: 'Saudi Arabia',
        MAIN_COLOR: 0,
        SECONDARY_COLOR: 0,
      });
      console.log(`✅ Created Saudi Arabia with COUNTRY_ID: ${saudiId}`);
    }

    // Track new term IDs
    let nextTermId = maxTermId + 1;
    
    // Helper to create a term
    const createTerm = (name, categoryId = 1) => {
      const newTermId = nextTermId++;
      return {
        id: newTermId,
        categoryId: categoryId,
        aliasName: null,
        fatherTerm: null,
        createTime: null,
        description: null,
        category: categoryId === 1 ? "Competitors Names" : "Competitions Names",
        values: [
          {
            languageId: 1,
            value: name,
            isDefault: true,
            status: "Approved",
            context: "",
            block: false,
            sequence: 1
          }
        ],
        valsCount: 1,
        engValue: name,
        langValue: name
      };
    };

    // Track new competitor IDs
    let nextCompetitorId = maxCompetitorId + 1;
    
    // Helper to create a competitor
    const createCompetitor = (nameId, countryId, sportTypeId = 1, mainCompetition = null) => {
      const newCompetitorId = nextCompetitorId++;
      return {
        COMPETITOR_ID: newCompetitorId,
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
    };

    // Track new competition IDs
    let nextCompetitionId = maxCompetitionId + 1;
    
    // Helper to create a competition
    const createCompetition = (nameId, countryId, sportTypeId = 1) => {
      const newCompetitionId = nextCompetitionId++;
      return {
        COMPETITION_ID: newCompetitionId,
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
    };

    // Check what exists and create what's missing
    const newTerms = [];
    const newCompetitors = [];
    const newCompetitions = [];
    const competitorIds = {};

    // 1. Sporting CP
    let sportingTerm = terms.find(t => 
      t.categoryId === 1 && 
      t.engValue && 
      (t.engValue.toLowerCase().includes('sporting cp') || 
       (t.engValue.toLowerCase().includes('sporting') && !t.engValue.toLowerCase().includes('sporting lisbon')))
    );
    if (!sportingTerm) {
      sportingTerm = createTerm('Sporting CP', 1);
      newTerms.push(sportingTerm);
      terms.push(sportingTerm); // Add to array for next searches
      console.log(`✅ Created term for Sporting CP (ID: ${sportingTerm.id})`);
    }
    let sportingCompetitor = competitors.find(c => 
      c.NAME_ID === sportingTerm.id && c.SPORT_TYPE_ID === 1
    );
    if (!sportingCompetitor) {
      let ligaPortugal = competitions.find(c => {
        const compTerm = terms.find(t => t.id === c.NAME_ID);
        return compTerm && compTerm.engValue && compTerm.engValue.toLowerCase().includes('liga portugal') && c.COUNTRY_ID === portugalId && c.SPORT_TYPE_ID === 1;
      });
      if (!ligaPortugal) {
        const term = createTerm('Liga Portugal', 4); // categoryId 4 = Competitions Names
        newTerms.push(term);
        terms.push(term); // Add to array for next searches
        ligaPortugal = createCompetition(term.id, portugalId, 1);
        newCompetitions.push(ligaPortugal);
        competitions.push(ligaPortugal); // Add to array for next searches
        console.log(`✅ Created Liga Portugal competition (ID: ${ligaPortugal.COMPETITION_ID})`);
      }
      sportingCompetitor = createCompetitor(sportingTerm.id, portugalId, 1, ligaPortugal.COMPETITION_ID);
      newCompetitors.push(sportingCompetitor);
      competitors.push(sportingCompetitor); // Add to array for next searches
      console.log(`✅ Created Sporting CP competitor (ID: ${sportingCompetitor.COMPETITOR_ID})`);
    }
    competitorIds.sporting = sportingCompetitor.COMPETITOR_ID;

    // 2. Real Madrid (Football)
    let realMadridTerm = terms.find(t => 
      t.id === 2011 && t.categoryId === 1
    );
    if (!realMadridTerm) {
      realMadridTerm = createTerm('Real Madrid', 1);
      newTerms.push(realMadridTerm);
      terms.push(realMadridTerm); // Add to array for next searches
      console.log(`✅ Created term for Real Madrid (ID: ${realMadridTerm.id})`);
    }
    let realMadridCompetitor = competitors.find(c => 
      c.NAME_ID === realMadridTerm.id && c.SPORT_TYPE_ID === 1
    );
    if (!realMadridCompetitor) {
      let laLiga = competitions.find(c => {
        const compTerm = terms.find(t => t.id === c.NAME_ID);
        return compTerm && compTerm.engValue && compTerm.engValue.toLowerCase().includes('la liga') && c.COUNTRY_ID === spain.COUNTRY_ID && c.SPORT_TYPE_ID === 1;
      });
      if (!laLiga) {
        const term = createTerm('La Liga', 4);
        newTerms.push(term);
        terms.push(term); // Add to array for next searches
        laLiga = createCompetition(term.id, spain.COUNTRY_ID, 1);
        newCompetitions.push(laLiga);
        competitions.push(laLiga); // Add to array for next searches
        console.log(`✅ Created La Liga competition (ID: ${laLiga.COMPETITION_ID})`);
      }
      realMadridCompetitor = createCompetitor(realMadridTerm.id, spain.COUNTRY_ID, 1, laLiga.COMPETITION_ID);
      newCompetitors.push(realMadridCompetitor);
      competitors.push(realMadridCompetitor); // Add to array for next searches
      console.log(`✅ Created Real Madrid competitor (ID: ${realMadridCompetitor.COMPETITOR_ID})`);
    }
    competitorIds.realMadrid = realMadridCompetitor.COMPETITOR_ID;

    // 3. Juventus
    let juventusTerm = terms.find(t => 
      t.categoryId === 1 && 
      t.engValue && 
      t.engValue.toLowerCase() === 'juventus'
    );
    if (!juventusTerm) {
      juventusTerm = createTerm('Juventus', 1);
      newTerms.push(juventusTerm);
      terms.push(juventusTerm); // Add to array for next searches
      console.log(`✅ Created term for Juventus (ID: ${juventusTerm.id})`);
    }
    let juventusCompetitor = competitors.find(c => 
      c.NAME_ID === juventusTerm.id && c.SPORT_TYPE_ID === 1
    );
    if (!juventusCompetitor) {
      let serieA = competitions.find(c => {
        const compTerm = terms.find(t => t.id === c.NAME_ID);
        return compTerm && compTerm.engValue && compTerm.engValue.toLowerCase().includes('serie a') && c.COUNTRY_ID === italy.COUNTRY_ID && c.SPORT_TYPE_ID === 1;
      });
      if (!serieA) {
        const term = createTerm('Serie A', 4);
        newTerms.push(term);
        terms.push(term); // Add to array for next searches
        serieA = createCompetition(term.id, italy.COUNTRY_ID, 1);
        newCompetitions.push(serieA);
        competitions.push(serieA); // Add to array for next searches
        console.log(`✅ Created Serie A competition (ID: ${serieA.COMPETITION_ID})`);
      }
      juventusCompetitor = createCompetitor(juventusTerm.id, italy.COUNTRY_ID, 1, serieA.COMPETITION_ID);
      newCompetitors.push(juventusCompetitor);
      competitors.push(juventusCompetitor); // Add to array for next searches
      console.log(`✅ Created Juventus competitor (ID: ${juventusCompetitor.COMPETITOR_ID})`);
    }
    competitorIds.juventus = juventusCompetitor.COMPETITOR_ID;

    // 4. Al-Nassr
    let alNassrTerm = terms.find(t => 
      t.categoryId === 1 && 
      t.engValue && 
      (t.engValue.toLowerCase().includes('al-nassr') || t.engValue.toLowerCase().includes('nassr'))
    );
    if (!alNassrTerm) {
      alNassrTerm = createTerm('Al-Nassr', 1);
      newTerms.push(alNassrTerm);
      terms.push(alNassrTerm); // Add to array for next searches
      console.log(`✅ Created term for Al-Nassr (ID: ${alNassrTerm.id})`);
    }
    let alNassrCompetitor = competitors.find(c => 
      c.NAME_ID === alNassrTerm.id && c.SPORT_TYPE_ID === 1
    );
    if (!alNassrCompetitor) {
      let saudiProLeague = competitions.find(c => {
        const compTerm = terms.find(t => t.id === c.NAME_ID);
        return compTerm && compTerm.engValue && compTerm.engValue.toLowerCase().includes('saudi pro league') && c.COUNTRY_ID === saudiId && c.SPORT_TYPE_ID === 1;
      });
      if (!saudiProLeague) {
        const term = createTerm('Saudi Pro League', 4);
        newTerms.push(term);
        terms.push(term); // Add to array for next searches
        saudiProLeague = createCompetition(term.id, saudiId, 1);
        newCompetitions.push(saudiProLeague);
        competitions.push(saudiProLeague); // Add to array for next searches
        console.log(`✅ Created Saudi Pro League competition (ID: ${saudiProLeague.COMPETITION_ID})`);
      }
      alNassrCompetitor = createCompetitor(alNassrTerm.id, saudiId, 1, saudiProLeague.COMPETITION_ID);
      newCompetitors.push(alNassrCompetitor);
      competitors.push(alNassrCompetitor); // Add to array for next searches
      console.log(`✅ Created Al-Nassr competitor (ID: ${alNassrCompetitor.COMPETITOR_ID})`);
    }
    competitorIds.alNassr = alNassrCompetitor.COMPETITOR_ID;

    // Save all new data
    if (newTerms.length > 0) {
      terms.push(...newTerms);
      await dataLoader.saveData('terms.json', terms);
      console.log(`\n💾 Saved ${newTerms.length} new terms`);
    }

    if (countries.length > 0 && (!portugal || !saudiArabia)) {
      await dataLoader.saveData('countries.json', countries);
      console.log(`💾 Updated countries.json`);
    }

    if (newCompetitions.length > 0) {
      competitions.push(...newCompetitions);
      await dataLoader.saveData('competitions.json', competitions);
      console.log(`💾 Saved ${newCompetitions.length} new competitions`);
    }

    if (newCompetitors.length > 0) {
      competitors.push(...newCompetitors);
      await dataLoader.saveData('competitors.json', competitors);
      console.log(`💾 Saved ${newCompetitors.length} new competitors`);
    }

    console.log('\n✅ Summary:');
    console.log(`   Sporting CP: COMPETITOR_ID ${competitorIds.sporting}`);
    console.log(`   Real Madrid: COMPETITOR_ID ${competitorIds.realMadrid}`);
    console.log(`   Juventus: COMPETITOR_ID ${competitorIds.juventus}`);
    console.log(`   Al-Nassr: COMPETITOR_ID ${competitorIds.alNassr}`);

    return competitorIds;
  } catch (error) {
    console.error('❌ Error creating clubs and competitions:', error);
    process.exit(1);
  }
}

// Run the script
createRonaldoClubsAndCompetitions();
