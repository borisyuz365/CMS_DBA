const dataLoader = require('../utils/dataLoader');

/**
 * Script to assign POSITION and FORMATION_POSITION to athletes
 * Based on sport type, height, and weight
 */

// Position assignment logic based on height and sport type
function assignPosition(athlete, positions) {
  const sportTypeId = athlete.SPORT_TYPE_ID;
  const height = athlete.HEIGHT;
  const weight = athlete.WEIGHT;

  // Filter positions by sport type
  const sportPositions = positions.filter(p => p.SPORT_TYPE_ID === sportTypeId);

  if (sportTypeId === 1) {
    // Football positions
    return assignFootballPosition(height, weight, sportPositions);
  } else if (sportTypeId === 2) {
    // Basketball positions
    return assignBasketballPosition(height, weight, sportPositions);
  }

  return { position: null, formationPosition: null };
}

function assignFootballPosition(height, weight, positions) {
  if (!height) {
    // If no height, assign randomly
    const randomPos = positions[Math.floor(Math.random() * positions.length)];
    const randomFormPos = randomPos.FORMATION_POSITIONS[Math.floor(Math.random() * randomPos.FORMATION_POSITIONS.length)];
    return { position: randomPos.POSITION_ID, formationPosition: randomFormPos.FORMATION_POSITION_ID };
  }

  // Goalkeeper: Usually taller (180+)
  if (height >= 180) {
    const gkPos = positions.find(p => p.POSITION_NAME === 'Goalkeeper');
    if (gkPos) {
      return {
        position: gkPos.POSITION_ID,
        formationPosition: gkPos.FORMATION_POSITIONS[0].FORMATION_POSITION_ID
      };
    }
  }

  // Forward: Usually 170-190, lighter build
  if (height >= 170 && height <= 190 && weight && weight < 85) {
    const forwardPos = positions.find(p => p.POSITION_NAME === 'Forward');
    if (forwardPos) {
      // Prefer wingers for lighter players, strikers for medium weight
      const formPositions = forwardPos.FORMATION_POSITIONS;
      let formPos;
      if (weight < 75) {
        // Lighter = winger
        formPos = formPositions.find(fp => fp.FORMATION_POSITION_NAME.includes('Winger')) || formPositions[0];
      } else {
        // Medium = striker/center forward
        formPos = formPositions.find(fp => 
          fp.FORMATION_POSITION_NAME === 'Striker' || 
          fp.FORMATION_POSITION_NAME === 'Center Forward'
        ) || formPositions[0];
      }
      return {
        position: forwardPos.POSITION_ID,
        formationPosition: formPos.FORMATION_POSITION_ID
      };
    }
  }

  // Defender: Usually taller (175-195), heavier build
  if (height >= 175 && height <= 195) {
    const defenderPos = positions.find(p => p.POSITION_NAME === 'Defender');
    if (defenderPos) {
      const formPositions = defenderPos.FORMATION_POSITIONS;
      let formPos;
      if (height >= 185) {
        // Taller = center back
        formPos = formPositions.find(fp => fp.FORMATION_POSITION_NAME === 'Center Back') || formPositions[0];
      } else if (height <= 180) {
        // Shorter = full back
        formPos = formPositions.find(fp => 
          fp.FORMATION_POSITION_NAME === 'Left Back' || 
          fp.FORMATION_POSITION_NAME === 'Right Back'
        ) || formPositions[0];
      } else {
        // Medium = wing back
        formPos = formPositions.find(fp => fp.FORMATION_POSITION_NAME === 'Wing Back') || formPositions[0];
      }
      return {
        position: defenderPos.POSITION_ID,
        formationPosition: formPos.FORMATION_POSITION_ID
      };
    }
  }

  // Midfielder: Usually 165-185, versatile
  if (height >= 165 && height <= 185) {
    const midPos = positions.find(p => p.POSITION_NAME === 'Midfielder');
    if (midPos) {
      const formPositions = midPos.FORMATION_POSITIONS;
      let formPos;
      if (weight && weight >= 80) {
        // Heavier = defensive midfielder
        formPos = formPositions.find(fp => fp.FORMATION_POSITION_NAME === 'Defensive Midfielder') || formPositions[0];
      } else if (weight && weight < 70) {
        // Lighter = attacking midfielder
        formPos = formPositions.find(fp => fp.FORMATION_POSITION_NAME === 'Attacking Midfielder') || formPositions[0];
      } else {
        // Medium = central midfielder
        formPos = formPositions.find(fp => fp.FORMATION_POSITION_NAME === 'Central Midfielder') || formPositions[0];
      }
      return {
        position: midPos.POSITION_ID,
        formationPosition: formPos.FORMATION_POSITION_ID
      };
    }
  }

  // Default: assign based on height ranges
  if (height >= 180) {
    const defenderPos = positions.find(p => p.POSITION_NAME === 'Defender');
    if (defenderPos) {
      return {
        position: defenderPos.POSITION_ID,
        formationPosition: defenderPos.FORMATION_POSITIONS[0].FORMATION_POSITION_ID
      };
    }
  } else if (height >= 170) {
    const midPos = positions.find(p => p.POSITION_NAME === 'Midfielder');
    if (midPos) {
      return {
        position: midPos.POSITION_ID,
        formationPosition: midPos.FORMATION_POSITIONS[0].FORMATION_POSITION_ID
      };
    }
  } else {
    const forwardPos = positions.find(p => p.POSITION_NAME === 'Forward');
    if (forwardPos) {
      return {
        position: forwardPos.POSITION_ID,
        formationPosition: forwardPos.FORMATION_POSITIONS[0].FORMATION_POSITION_ID
      };
    }
  }

  // Fallback: random position
  const randomPos = positions[Math.floor(Math.random() * positions.length)];
  const randomFormPos = randomPos.FORMATION_POSITIONS[Math.floor(Math.random() * randomPos.FORMATION_POSITIONS.length)];
  return { position: randomPos.POSITION_ID, formationPosition: randomFormPos.FORMATION_POSITION_ID };
}

function assignBasketballPosition(height, weight, positions) {
  if (!height) {
    // If no height, assign randomly
    const randomPos = positions[Math.floor(Math.random() * positions.length)];
    const randomFormPos = randomPos.FORMATION_POSITIONS[Math.floor(Math.random() * randomPos.FORMATION_POSITIONS.length)];
    return { position: randomPos.POSITION_ID, formationPosition: randomFormPos.FORMATION_POSITION_ID };
  }

  // Center: Usually tallest (205+)
  if (height >= 205) {
    const centerPos = positions.find(p => p.POSITION_NAME === 'Center');
    if (centerPos) {
      return {
        position: centerPos.POSITION_ID,
        formationPosition: centerPos.FORMATION_POSITIONS[0].FORMATION_POSITION_ID
      };
    }
  }

  // Power Forward: Usually 200-210
  if (height >= 200 && height < 210) {
    const pfPos = positions.find(p => p.POSITION_NAME === 'Power Forward');
    if (pfPos) {
      return {
        position: pfPos.POSITION_ID,
        formationPosition: pfPos.FORMATION_POSITIONS[0].FORMATION_POSITION_ID
      };
    }
  }

  // Small Forward: Usually 195-205
  if (height >= 195 && height < 205) {
    const sfPos = positions.find(p => p.POSITION_NAME === 'Small Forward');
    if (sfPos) {
      return {
        position: sfPos.POSITION_ID,
        formationPosition: sfPos.FORMATION_POSITIONS[0].FORMATION_POSITION_ID
      };
    }
  }

  // Shooting Guard: Usually 185-200
  if (height >= 185 && height < 200) {
    const sgPos = positions.find(p => p.POSITION_NAME === 'Shooting Guard');
    if (sgPos) {
      return {
        position: sgPos.POSITION_ID,
        formationPosition: sgPos.FORMATION_POSITIONS[0].FORMATION_POSITION_ID
      };
    }
  }

  // Point Guard: Usually 170-190
  if (height >= 170 && height < 190) {
    const pgPos = positions.find(p => p.POSITION_NAME === 'Point Guard');
    if (pgPos) {
      return {
        position: pgPos.POSITION_ID,
        formationPosition: pgPos.FORMATION_POSITIONS[0].FORMATION_POSITION_ID
      };
    }
  }

  // Default: assign based on height ranges
  if (height >= 200) {
    const pfPos = positions.find(p => p.POSITION_NAME === 'Power Forward');
    if (pfPos) {
      return {
        position: pfPos.POSITION_ID,
        formationPosition: pfPos.FORMATION_POSITIONS[0].FORMATION_POSITION_ID
      };
    }
  } else if (height >= 190) {
    const sfPos = positions.find(p => p.POSITION_NAME === 'Small Forward');
    if (sfPos) {
      return {
        position: sfPos.POSITION_ID,
        formationPosition: sfPos.FORMATION_POSITIONS[0].FORMATION_POSITION_ID
      };
    }
  } else if (height >= 180) {
    const sgPos = positions.find(p => p.POSITION_NAME === 'Shooting Guard');
    if (sgPos) {
      return {
        position: sgPos.POSITION_ID,
        formationPosition: sgPos.FORMATION_POSITIONS[0].FORMATION_POSITION_ID
      };
    }
  } else {
    const pgPos = positions.find(p => p.POSITION_NAME === 'Point Guard');
    if (pgPos) {
      return {
        position: pgPos.POSITION_ID,
        formationPosition: pgPos.FORMATION_POSITIONS[0].FORMATION_POSITION_ID
      };
    }
  }

  // Fallback: random position
  const randomPos = positions[Math.floor(Math.random() * positions.length)];
  const randomFormPos = randomPos.FORMATION_POSITIONS[Math.floor(Math.random() * randomPos.FORMATION_POSITIONS.length)];
  return { position: randomPos.POSITION_ID, formationPosition: randomFormPos.FORMATION_POSITION_ID };
}

async function assignPositionsToAthletes() {
  try {
    console.log('Loading data files...');
    
    // Load all required data
    const [athletes, positions] = await Promise.all([
      dataLoader.loadData('athletes.json'),
      dataLoader.loadData('athletes_positions.json')
    ]);

    console.log(`Found ${athletes.length} athletes`);
    console.log(`Found ${positions.length} position definitions`);

    let updated = 0;
    let skipped = 0;

    // Assign positions to each athlete
    for (let i = 0; i < athletes.length; i++) {
      const athlete = athletes[i];
      
      // Skip if already has position (optional - remove if you want to reassign)
      // if (athlete.POSITION && athlete.FORMATION_POSITION) {
      //   skipped++;
      //   continue;
      // }

      const { position, formationPosition } = assignPosition(athlete, positions);
      
      if (position && formationPosition) {
        athlete.POSITION = position;
        athlete.FORMATION_POSITION = formationPosition;
        updated++;
      } else {
        skipped++;
      }

      // Progress indicator
      if ((i + 1) % 1000 === 0) {
        console.log(`Processed ${i + 1}/${athletes.length} athletes...`);
      }
    }

    console.log(`\nAssignment complete!`);
    console.log(`Updated: ${updated} athletes`);
    console.log(`Skipped: ${skipped} athletes`);

    // Save updated athletes
    console.log('\nSaving updated athletes.json...');
    await dataLoader.saveData('athletes.json', athletes);
    console.log('✓ Successfully saved athletes.json');

    // Print statistics
    console.log('\n=== Position Statistics ===');
    const stats = {};
    athletes.forEach(athlete => {
      if (athlete.POSITION) {
        const pos = positions.find(p => p.POSITION_ID === athlete.POSITION);
        if (pos) {
          const key = `${pos.SPORT_TYPE_ID === 1 ? 'Football' : 'Basketball'}: ${pos.POSITION_NAME}`;
          stats[key] = (stats[key] || 0) + 1;
        }
      }
    });
    
    Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([pos, count]) => {
        console.log(`${pos}: ${count}`);
      });

  } catch (error) {
    console.error('Error assigning positions:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  assignPositionsToAthletes()
    .then(() => {
      console.log('\n✓ Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { assignPositionsToAthletes, assignPosition };
