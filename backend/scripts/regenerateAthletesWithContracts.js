const fs = require('fs');
const path = require('path');
const dataLoader = require('../utils/dataLoader');

/**
 * Script to regenerate athletes.json with real player names and contracts
 * - Creates 3 athletes per competitor (team)
 * - Uses real famous player names
 * - Creates athlete_contracts.json with contract history
 * - Each athlete can have multiple contracts, but only one is CURRENT_CLUB = true
 */

// Real famous player names by sport type
const REAL_PLAYER_NAMES = {
  1: [ // Football
    "Lionel Messi", "Cristiano Ronaldo", "Kylian Mbappé", "Erling Haaland", "Karim Benzema",
    "Robert Lewandowski", "Mohamed Salah", "Sadio Mané", "Kevin De Bruyne", "Luka Modrić",
    "Virgil van Dijk", "Sergio Ramos", "Manuel Neuer", "Thibaut Courtois", "Alisson Becker",
    "Neymar Jr", "Antoine Griezmann", "Paul Pogba", "Eden Hazard", "Raheem Sterling",
    "Harry Kane", "Romelu Lukaku", "Luis Suárez", "Gareth Bale", "Toni Kroos",
    "Marcelo", "Casemiro", "Marco Verratti", "Joshua Kimmich", "Leonardo Bonucci",
    "Gianluigi Buffon", "David de Gea", "Jan Oblak", "Ederson", "Keylor Navas",
    "Ángel Di María", "Philippe Coutinho", "James Rodríguez", "Isco", "Thiago Alcântara",
    "Mats Hummels", "Mario Götze", "Marco Reus", "Pierre-Emerick Aubameyang", "Alexis Sánchez",
    "Alexandre Lacazette", "Olivier Giroud", "Dimitri Payet", "N'Golo Kanté", "Raphaël Varane",
    "Samuel Umtiti", "Lucas Hernández", "Benjamin Pavard", "Ousmane Dembélé", "Kingsley Coman",
    "Thomas Müller", "Serge Gnabry", "Leroy Sané", "Timo Werner", "Kai Havertz",
    "Jadon Sancho", "Mason Mount", "Phil Foden", "Bukayo Saka", "Declan Rice",
    "Jack Grealish", "Marcus Rashford", "Jadon Sancho", "Mason Greenwood", "Tammy Abraham",
    "Callum Hudson-Odoi", "Reece James", "Ben Chilwell", "Trent Alexander-Arnold", "Joe Gomez",
    "Andrew Robertson", "Fabinho", "Georginio Wijnaldum", "Jordan Henderson", "Roberto Firmino",
    "Diogo Jota", "Takumi Minamino", "Xherdan Shaqiri", "Divock Origi", "Alex Oxlade-Chamberlain",
    "Naby Keïta", "Thiago", "Joël Matip", "Ibrahima Konaté", "Kostas Tsimikas",
    "Adrián", "Caoimhín Kelleher", "Harvey Elliott", "Curtis Jones", "Neco Williams",
    "Rhys Williams", "Nat Phillips", "Ozan Kabak", "Ben Davies", "Harry Winks",
    "Tanguy Ndombele", "Giovani Lo Celso", "Steven Bergwijn", "Lucas Moura", "Erik Lamela",
    "Moussa Sissoko", "Pierre-Emile Højbjerg", "Matt Doherty", "Sergio Reguilón", "Davinson Sánchez",
    "Eric Dier", "Toby Alderweireld", "Hugo Lloris", "Joe Hart", "Carlos Vinicius",
    "Gareth Bale", "Dele Alli", "Son Heung-min", "Harry Kane", "Tanguy Ndombele"
  ],
  2: [ // Basketball
    "LeBron James", "Stephen Curry", "Kevin Durant", "Giannis Antetokounmpo", "Kawhi Leonard",
    "Luka Dončić", "Jayson Tatum", "Joel Embiid", "Nikola Jokić", "Damian Lillard",
    "James Harden", "Russell Westbrook", "Chris Paul", "Anthony Davis", "Paul George",
    "Jimmy Butler", "Klay Thompson", "Draymond Green", "Kyrie Irving", "Blake Griffin",
    "DeMarcus Cousins", "Al Horford", "Gordon Hayward", "Kemba Walker", "Bradley Beal",
    "John Wall", "DeMar DeRozan", "Kyle Lowry", "Marc Gasol", "Pau Gasol",
    "Rudy Gobert", "Donovan Mitchell", "Mike Conley", "Bojan Bogdanović", "Joe Ingles",
    "Derrick Favors", "Royce O'Neale", "Jordan Clarkson", "Georges Niang", "Trent Forrest",
    "Miye Oni", "Jarrell Brantley", "Elijah Hughes", "Udoka Azubuike", "Matt Thomas",
    "Ersan İlyasova", "Al-Farouq Aminu", "Evan Fournier", "Markelle Fultz", "Jonathan Isaac",
    "Mo Bamba", "Chuma Okeke", "Cole Anthony", "R.J. Hampton", "Wendell Carter Jr.",
    "Terrence Ross", "Gary Harris", "Michael Carter-Williams", "Dwayne Bacon", "Khem Birch",
    "James Ennis", "Otto Porter Jr.", "Bismack Biyombo", "Chasson Randle", "D.J. Augustin"
  ],
  3: [ // Tennis
    "Novak Djokovic", "Rafael Nadal", "Roger Federer", "Daniil Medvedev", "Stefanos Tsitsipas",
    "Alexander Zverev", "Andrey Rublev", "Matteo Berrettini", "Casper Ruud", "Hubert Hurkacz",
    "Felix Auger-Aliassime", "Jannik Sinner", "Cameron Norrie", "Denis Shapovalov", "Taylor Fritz",
    "Diego Schwartzman", "Pablo Carreño Busta", "Grigor Dimitrov", "Aslan Karatsev", "Lorenzo Musetti",
    "Sebastian Korda", "Carlos Alcaraz", "Holger Rune", "Jack Draper", "Ben Shelton",
    "Serena Williams", "Naomi Osaka", "Ashleigh Barty", "Simona Halep", "Bianca Andreescu",
    "Sofia Kenin", "Iga Świątek", "Aryna Sabalenka", "Karolína Plíšková", "Petra Kvitová",
    "Garbiñe Muguruza", "Elina Svitolina", "Madison Keys", "Sloane Stephens", "Venus Williams",
    "Maria Sharapova", "Victoria Azarenka", "Caroline Wozniacki", "Angelique Kerber", "Jelena Ostapenko",
    "Anastasia Pavlyuchenkova", "Barbora Krejčíková", "Emma Raducanu", "Leylah Fernandez", "Coco Gauff",
    "Ons Jabeur", "Paula Badosa", "Maria Sakkari", "Jessica Pegula", "Amanda Anisimova"
  ]
};

function getRandomDate(startYear, endYear) {
  const year = startYear + Math.floor(Math.random() * (endYear - startYear + 1));
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addYears(dateStr, years) {
  const date = new Date(dateStr);
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().split('T')[0];
}

async function regenerateAthletesWithContracts() {
  try {
    console.log('Loading data files...');
    
    // Load all required data
    const [competitors, terms, countries] = await Promise.all([
      dataLoader.loadData('competitors.json'),
      dataLoader.loadData('terms.json'),
      dataLoader.loadData('countries.json')
    ]);

    console.log(`Found ${competitors.length} competitors`);

    // Get existing athlete name terms (categoryId 50)
    const existingAthleteTerms = terms.filter(t => t.categoryId === 50);
    console.log(`Found ${existingAthleteTerms.length} existing athlete name terms`);

    // Create new terms for real player names if they don't exist
    let nextTermId = Math.max(...terms.map(t => t.id || 0), 0) + 1;
    const newTerms = [];
    const nameToTermId = new Map();

    // Map existing terms
    existingAthleteTerms.forEach(term => {
      if (term.engValue) {
        nameToTermId.set(term.engValue.toLowerCase(), term.id);
      }
    });

    // Create terms for real player names
    for (const sportTypeId in REAL_PLAYER_NAMES) {
      for (const playerName of REAL_PLAYER_NAMES[sportTypeId]) {
        const key = playerName.toLowerCase();
        if (!nameToTermId.has(key)) {
          const aliasName = playerName.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
          const newTerm = {
            id: nextTermId++,
            categoryId: 50,
            aliasName: aliasName,
            fatherTerm: null,
            createTime: null,
            description: null,
            category: "Athletes Names",
            values: [
              {
                languageId: 1,
                value: playerName,
                isDefault: true,
                status: "Approved",
                context: "",
                block: false,
                sequence: 1
              }
            ],
            valsCount: 1,
            engValue: playerName,
            langValue: playerName
          };
          newTerms.push(newTerm);
          nameToTermId.set(key, newTerm.id);
        }
      }
    }

    // Add new terms to terms.json if any
    if (newTerms.length > 0) {
      console.log(`Creating ${newTerms.length} new athlete name terms...`);
      const allTerms = [...terms, ...newTerms];
      await dataLoader.saveData('terms.json', allTerms);
      console.log(`✅ Added ${newTerms.length} new terms to terms.json`);
    }

    // Generate athletes - 3 per competitor
    const athletes = [];
    const contracts = [];
    let athleteId = 1;
    let nameIndex = { 1: 0, 2: 0, 3: 0 }; // Track name index per sport

    for (const competitor of competitors) {
      const sportTypeId = competitor.SPORT_TYPE_ID;
      const playerNames = REAL_PLAYER_NAMES[sportTypeId] || REAL_PLAYER_NAMES[1];
      
      // Create 3 athletes for this competitor
      for (let i = 0; i < 3; i++) {
        // Get player name (cycle through if needed)
        const nameIdx = nameIndex[sportTypeId] % playerNames.length;
        const playerName = playerNames[nameIdx];
        nameIndex[sportTypeId]++;
        
        const nameKey = playerName.toLowerCase();
        const nameTermId = nameToTermId.get(nameKey);

        if (!nameTermId) {
          console.warn(`Warning: No term ID found for ${playerName}, skipping...`);
          continue;
        }

        // Generate birthdate (between 1990 and 2005)
        const birthdate = getRandomDate(1990, 2005);

        // Generate realistic height and weight based on sport
        let height, weight, gender;
        if (sportTypeId == 1) { // Football
          height = 170 + Math.floor(Math.random() * 25); // 170-195 cm
          weight = 65 + Math.floor(Math.random() * 25); // 65-90 kg
          gender = Math.random() > 0.1 ? 1 : 2; // Mostly male
        } else if (sportTypeId == 2) { // Basketball
          height = 185 + Math.floor(Math.random() * 30); // 185-215 cm
          weight = 80 + Math.floor(Math.random() * 40); // 80-120 kg
          gender = Math.random() > 0.1 ? 1 : 2; // Mostly male
        } else { // Tennis
          height = 170 + Math.floor(Math.random() * 25); // 170-195 cm
          weight = 60 + Math.floor(Math.random() * 25); // 60-85 kg
          gender = Math.random() > 0.5 ? 1 : 2; // Mixed
        }

        // Create athlete
        const athlete = {
          ATHLETE_ID: athleteId++,
          NAME_ID: nameTermId,
          SPORT_TYPE_ID: sportTypeId,
          BIRTHDATE: birthdate,
          GENDER: gender,
          HEIGHT: height,
          WEIGHT: weight,
          NATIONALITY: competitor.COUNTRY_ID,
          COUNTRY_OF_BIRTH: competitor.COUNTRY_ID,
          PLACE_OF_BIRTH: null,
          POSITION: null,
          FORMATION_POSITION: null,
          BOOT_ID: null,
          IMG_VER: 1,
          STATUS: 3, // Active
          DATE_OF_DEATH: null,
          CONNECT_BY_TEXT: false,
          TOTAL_SOCIAL_FOLLOWERS: Math.floor(Math.random() * 10000000) + 100000,
          SELECTION_RANK: Math.floor(Math.random() * 100) + 1,
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
          CURRENT_CLUB_ID: competitor.COMPETITOR_ID, // Current club
        };

        athletes.push(athlete);

        // Create contract history for this athlete
        // Each athlete can have 1-4 previous contracts + current contract
        const numContracts = Math.floor(Math.random() * 4) + 1; // 1-4 previous + 1 current = 2-5 total
        
        // Get other competitors from same sport and country (for realistic transfers)
        const otherCompetitors = competitors.filter(c => 
          c.SPORT_TYPE_ID === sportTypeId && 
          c.COMPETITOR_ID !== competitor.COMPETITOR_ID
        );
        
        // Shuffle and take some for contract history
        const shuffledCompetitors = [...otherCompetitors].sort(() => Math.random() - 0.5);
        const contractCompetitors = shuffledCompetitors.slice(0, numContracts);
        contractCompetitors.push(competitor); // Add current club at the end

        // Create contracts in chronological order (oldest to newest)
        const contractDates = [];
        let currentDate = new Date('2015-01-01');
        
        // Generate jersey number ranges based on sport type
        const getJerseyNumber = (sportTypeId) => {
          // 85% chance of having a jersey number
          if (Math.random() > 0.85) {
            return null;
          }
          
          if (sportTypeId == 1) { // Football
            // Football: 1-99, but mostly 1-30
            if (Math.random() > 0.2) {
              return Math.floor(Math.random() * 30) + 1; // 1-30 (80% chance)
            } else {
              return Math.floor(Math.random() * 69) + 31; // 31-99 (20% chance)
            }
          } else if (sportTypeId == 2) { // Basketball
            // Basketball: 0-99, but mostly 0-55
            if (Math.random() > 0.2) {
              return Math.floor(Math.random() * 56); // 0-55 (80% chance)
            } else {
              return Math.floor(Math.random() * 44) + 56; // 56-99 (20% chance)
            }
          } else { // Tennis or other
            // Tennis: 1-99
            return Math.floor(Math.random() * 99) + 1;
          }
        };
        
        for (let j = 0; j < contractCompetitors.length; j++) {
          const contractCompetitor = contractCompetitors[j];
          const isCurrentClub = contractCompetitor.COMPETITOR_ID === competitor.COMPETITOR_ID;
          
          // Contract duration: 1-4 years
          const contractYears = isCurrentClub ? 
            (Math.floor(Math.random() * 3) + 1) : // Current: 1-3 years
            (Math.floor(Math.random() * 3) + 1); // Past: 1-3 years
          
          const startDate = currentDate.toISOString().split('T')[0];
          let endDate;
          
          if (isCurrentClub) {
            // Current contract: end date is null or future
            endDate = null; // null means current/active contract
          } else {
            // Past contract: has end date
            currentDate.setFullYear(currentDate.getFullYear() + contractYears);
            endDate = currentDate.toISOString().split('T')[0];
            // Move to next contract start (can overlap slightly)
            currentDate.setMonth(currentDate.getMonth() + 1);
          }
          
          // Generate jersey number for this contract
          const jerseyNumber = getJerseyNumber(sportTypeId);
          
          const contract = {
            ATHLETE_ID: athlete.ATHLETE_ID,
            COMPETITOR_ID: contractCompetitor.COMPETITOR_ID,
            START_DATE: startDate,
            END_DATE: endDate,
            CURRENT_CLUB: isCurrentClub, // true only for current club
            JERSEY_NUMBER: jerseyNumber
          };
          
          contracts.push(contract);
        }
      }
    }

    // Sort athletes by ATHLETE_ID
    athletes.sort((a, b) => a.ATHLETE_ID - b.ATHLETE_ID);

    // Save athletes
    await dataLoader.saveData('athletes.json', athletes);
    console.log(`✅ Successfully generated ${athletes.length} athletes`);

    // Save contracts
    await dataLoader.saveData('athlete_contracts.json', contracts);
    console.log(`✅ Successfully generated ${contracts.length} contracts`);

    // Statistics
    console.log(`\n📊 Statistics:`);
    console.log(`   - Athletes: ${athletes.length}`);
    console.log(`   - Contracts: ${contracts.length}`);
    console.log(`   - Average contracts per athlete: ${(contracts.length / athletes.length).toFixed(2)}`);
    console.log(`   - Current clubs: ${contracts.filter(c => c.CURRENT_CLUB).length}`);
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
regenerateAthletesWithContracts();
