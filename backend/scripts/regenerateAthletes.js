const fs = require('fs');
const path = require('path');
const dataLoader = require('../utils/dataLoader');

/**
 * Script to regenerate athletes.json with real data from competitors.json
 * - Athletes use NAME_ID from terms.json (categoryId 50)
 * - Athletes are linked to competitors
 * - Nationality comes from competitor's COUNTRY_ID
 * - Sport type matches competitor's SPORT_TYPE_ID
 */

async function regenerateAthletes() {
  try {
    console.log('Loading data files...');
    
    // Load all required data
    const [competitors, terms, countries] = await Promise.all([
      dataLoader.loadData('competitors.json'),
      dataLoader.loadData('terms.json'),
      dataLoader.loadData('countries.json')
    ]);

    // Get athlete name terms (categoryId 50)
    const athleteNameTerms = terms.filter(t => t.categoryId === 50);
    console.log(`Found ${athleteNameTerms.length} athlete name terms`);

    // Group competitors by sport type
    const competitorsBySport = {};
    competitors.forEach(comp => {
      if (!competitorsBySport[comp.SPORT_TYPE_ID]) {
        competitorsBySport[comp.SPORT_TYPE_ID] = [];
      }
      competitorsBySport[comp.SPORT_TYPE_ID].push(comp);
    });

    // Generate athletes
    const athletes = [];
    let athleteId = 1;
    let nameTermIndex = 0;

    // Generate athletes for each sport type
    for (const sportTypeId in competitorsBySport) {
      const sportCompetitors = competitorsBySport[sportTypeId];
      const athletesPerSport = Math.ceil(100 / Object.keys(competitorsBySport).length);
      
      for (let i = 0; i < athletesPerSport && nameTermIndex < athleteNameTerms.length && athleteId <= 100; i++) {
        // Select a random competitor for this sport
        const competitor = sportCompetitors[Math.floor(Math.random() * sportCompetitors.length)];
        
        // Get athlete name term
        const nameTerm = athleteNameTerms[nameTermIndex];
        nameTermIndex++;

        // Generate birthdate (between 1985 and 2005)
        const year = 1985 + Math.floor(Math.random() * 21);
        const month = Math.floor(Math.random() * 12) + 1;
        const day = Math.floor(Math.random() * 28) + 1;
        const birthdate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Generate realistic height and weight based on sport
        let height, weight;
        if (sportTypeId == 1) { // Football
          height = 170 + Math.floor(Math.random() * 25); // 170-195 cm
          weight = 65 + Math.floor(Math.random() * 25); // 65-90 kg
        } else if (sportTypeId == 2) { // Basketball
          height = 185 + Math.floor(Math.random() * 30); // 185-215 cm
          weight = 80 + Math.floor(Math.random() * 40); // 80-120 kg
        } else { // Tennis
          height = 170 + Math.floor(Math.random() * 25); // 170-195 cm
          weight = 60 + Math.floor(Math.random() * 25); // 60-85 kg
        }

        // Gender (1=Male, 2=Female) - random
        const gender = Math.random() > 0.3 ? 1 : 2;

        // Create athlete
        const athlete = {
          ATHLETE_ID: athleteId++,
          NAME_ID: nameTerm.id,
          SPORT_TYPE_ID: parseInt(sportTypeId),
          BIRTHDATE: birthdate,
          GENDER: gender,
          HEIGHT: height,
          WEIGHT: weight,
          NATIONALITY: competitor.COUNTRY_ID, // Use competitor's country
          COUNTRY_OF_BIRTH: competitor.COUNTRY_ID, // Same as nationality for simplicity
          PLACE_OF_BIRTH: null, // Can be set later if needed
          POSITION: null, // Can be set later if needed
          FORMATION_POSITION: null, // Can be set later if needed
          BOOT_ID: null,
          IMG_VER: 1,
          STATUS: 3, // Active
          DATE_OF_DEATH: null,
          CONNECT_BY_TEXT: false,
          TOTAL_SOCIAL_FOLLOWERS: Math.floor(Math.random() * 5000000),
          SELECTION_RANK: Math.floor(Math.random() * 100),
          HIDE_ON_CATALOG: false,
          BUZZ_TYPE: null,
          ENABLE_BUZZ: false,
          HIDE_ON_SEARCH: false,
          DATE_OF_RETIREMENT: null,
          HAS_LOGO: false,
          HIDE_PLAYER_GAME_CARD: false,
          PREFERRED_SIDE: null,
          PREFERRED_SURFACE: null,
          BACKHAND_TYPE: null,
          PRIZE_MONEY: null,
          HIGHEST_CAREER_RANKING: null,
          CURRENT_CLUB_ID: competitor.COMPETITOR_ID, // Link to competitor
        };

        athletes.push(athlete);
      }
    }

    // Sort by ATHLETE_ID
    athletes.sort((a, b) => a.ATHLETE_ID - b.ATHLETE_ID);

    // Save to file
    const dataPath = path.join(__dirname, '../data/athletes.json');
    await dataLoader.saveData('athletes.json', athletes);

    console.log(`✅ Successfully generated ${athletes.length} athletes`);
    console.log(`   - Linked to ${new Set(athletes.map(a => a.CURRENT_CLUB_ID)).size} unique competitors`);
    console.log(`   - Using ${new Set(athletes.map(a => a.NAME_ID)).size} unique athlete names`);
    console.log(`   - From ${new Set(athletes.map(a => a.NATIONALITY)).size} different countries`);
    console.log(`   - Sport types: ${new Set(athletes.map(a => a.SPORT_TYPE_ID)).size}`);

  } catch (error) {
    console.error('❌ Error regenerating athletes:', error);
    process.exit(1);
  }
}

// Run the script
regenerateAthletes();
