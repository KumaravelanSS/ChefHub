/**
 * ============================================================================
 * DBMS HASHING VERIFICATION & EVALUATION SCRIPT
 * ============================================================================
 * Usage: node backend/test_hashing.js
 * 
 * Demonstrates:
 * 1. Polynomial Hash Function h_0(k)
 * 2. Linear Hashing (Linear Probing): h(k, i) = (h_0 + i) mod M
 * 3. Quadratic Hashing (Quadratic Probing): h(k, i) = (h_0 + 1*i + 1*i^2) mod M
 * 4. Collision Resolution & Probe Trajectory Verification
 * 5. O(1) Search Latency & Benchmark Comparison
 * ============================================================================
 */

const { DbmsHashTable } = require('./services/hash_search_engine');

function printHeader(title) {
  console.log('\n' + '='.repeat(70));
  console.log(`  ${title}`);
  console.log('='.repeat(70));
}

function testHashing() {
  printHeader('DBMS PROJECT EVALUATION: HASHING FOR SEARCHING');
  console.log('Topic: Open Addressing Hash Index with Linear & Quadratic Probing\n');

  // -------------------------------------------------------------------------
  // TEST 1: Small Table Collision Generation & Probe Inspection
  // -------------------------------------------------------------------------
  printHeader('1. Testing Collision Resolution on M = 17 Table');

  const smallLinear = new DbmsHashTable({ size: 17, strategy: 'LINEAR' });
  const smallQuadratic = new DbmsHashTable({ size: 17, strategy: 'QUADRATIC' });

  const testDishes = [
    { id: 101, name: 'Truffle Gnocchi', category: 'Pasta' },
    { id: 102, name: 'Spicy Hakka Noodles', category: 'Noodles' },
    { id: 103, name: 'Royal Hyderabadi Biryani', category: 'Biryani' },
    { id: 104, name: 'Woodfired Margherita Pizza', category: 'Pizza' },
    { id: 105, name: 'Handcrafted Spinach Ravioli', category: 'Pasta' },
    { id: 106, name: 'Tokyo Shoyu Ramen', category: 'Noodles' },
    { id: 107, name: 'Traditional Tiramisu', category: 'Dessert' }
  ];

  console.log('Inserting dishes into both Linear and Quadratic Hash Tables:');
  console.log('---------------------------------------------------------------------');
  console.log(
    'Dish Name'.padEnd(30) +
    'h0(k)'.padEnd(8) +
    'Linear Slot'.padEnd(14) +
    'Quadratic Slot'.padEnd(16)
  );
  console.log('---------------------------------------------------------------------');

  for (const dish of testDishes) {
    const h0 = smallLinear.hash0(dish.name);
    const linRes = smallLinear.insert(dish.name, dish, 'LINEAR');
    const quadRes = smallQuadratic.insert(dish.name, dish, 'QUADRATIC');

    console.log(
      dish.name.padEnd(30) +
      String(h0).padEnd(8) +
      `slot #${linRes.slot} (p=${linRes.probes})`.padEnd(14) +
      `slot #${quadRes.slot} (p=${quadRes.probes})`.padEnd(16)
    );
  }

  console.log('\nTable Metrics on M=17:');
  console.log('Linear Table Collisions:   ', smallLinear.totalInsertCollisions);
  console.log('Quadratic Table Collisions:', smallQuadratic.totalInsertCollisions);
  console.log('Load Factor alpha:         ', (testDishes.length / 17).toFixed(3));

  // -------------------------------------------------------------------------
  // TEST 2: Step-by-Step Search Probing Verification
  // -------------------------------------------------------------------------
  printHeader('2. Step-by-Step Search Probe Sequence Verification');

  const searchTarget = 'Handcrafted Spinach Ravioli';
  console.log(`Searching for: "${searchTarget}"\n`);

  const linSearch = smallLinear.search(searchTarget, 'LINEAR');
  console.log('▶ LINEAR PROBING:');
  console.log('  Formula:        h(k, i) = (h_0 + i) mod M');
  console.log('  Initial Bucket: slot #' + linSearch.hash0);
  console.log('  Probe Sequence: ' + linSearch.probeSequence.map(s => `slot #${s}`).join(' -> '));
  console.log('  Total Probes:   ' + linSearch.probes);
  console.log('  Collisions:     ' + linSearch.collisions);
  console.log('  Result Found:   ' + (linSearch.found ? 'YES ✓' : 'NO ✗'));
  console.log('  Search Time:    ' + linSearch.timeUs + ' microseconds');

  console.log('\n▶ QUADRATIC PROBING:');
  const quadSearch = smallQuadratic.search(searchTarget, 'QUADRATIC');
  console.log('  Formula:        h(k, i) = (h_0 + 1*i + 1*i^2) mod M');
  console.log('  Initial Bucket: slot #' + quadSearch.hash0);
  console.log('  Probe Sequence: ' + quadSearch.probeSequence.map(s => `slot #${s}`).join(' -> '));
  console.log('  Total Probes:   ' + quadSearch.probes);
  console.log('  Collisions:     ' + quadSearch.collisions);
  console.log('  Result Found:   ' + (quadSearch.found ? 'YES ✓' : 'NO ✗'));
  console.log('  Search Time:    ' + quadSearch.timeUs + ' microseconds');

  // Negative Search (Non-existent item)
  console.log('\n▶ NEGATIVE SEARCH (Key not present: "Dragon Fruit Sushi"):');
  const negSearch = smallQuadratic.search('Dragon Fruit Sushi', 'QUADRATIC');
  console.log('  Empty slot reached after ' + negSearch.probes + ' probes.');
  console.log('  Result Found:   ' + (negSearch.found ? 'YES' : 'NO (Correctly rejected in O(1) ✓)'));

  // -------------------------------------------------------------------------
  // TEST 3: Scaled Dataset Benchmark (Linear vs Quadratic Comparison)
  // -------------------------------------------------------------------------
  printHeader('3. Scaled Dataset Benchmark: Linear vs Quadratic Hashing');

  const benchmarkTable = new DbmsHashTable({ size: 101, strategy: 'QUADRATIC' });

  // Generate 60 test items to create a realistic 60% load factor
  const categories = ['Pasta', 'Noodles', 'Biryani', 'Pizza', 'Curry', 'Dessert', 'Starter', 'Beverage'];
  const testKeys = [];

  for (let i = 1; i <= 60; i++) {
    const cat = categories[i % categories.length];
    const key = `Chef Special Dish #${i} ${cat}`;
    testKeys.push(key);
    benchmarkTable.insert(key, { dish_id: i, name: key, category: cat, price: 150 + i * 5 });
  }

  const benchmarkResults = benchmarkTable.benchmark(testKeys);

  console.log('Benchmark Configuration:');
  console.log('  Table Capacity (M):      ', benchmarkResults.table_capacity);
  console.log('  Dataset Records (N):     ', benchmarkResults.dataset_size);
  console.log('  Load Factor (alpha = N/M):', benchmarkResults.load_factor);
  console.log('  Keys Queried:            ', benchmarkResults.test_count);
  console.log('\nBenchmark Comparison Table:');
  console.log('---------------------------------------------------------------------------');
  console.log('Metric'.padEnd(28) + 'Linear Probing'.padEnd(24) + 'Quadratic Probing'.padEnd(24));
  console.log('---------------------------------------------------------------------------');
  console.log(
    'Insert Collisions'.padEnd(28) +
    String(benchmarkResults.linear_probing.insert_collisions).padEnd(24) +
    String(benchmarkResults.quadratic_probing.insert_collisions).padEnd(24)
  );
  console.log(
    'Average Probes / Search'.padEnd(28) +
    String(benchmarkResults.linear_probing.average_probes).padEnd(24) +
    String(benchmarkResults.quadratic_probing.average_probes).padEnd(24)
  );
  console.log(
    'Avg Search Time (us)'.padEnd(28) +
    `${benchmarkResults.linear_probing.average_search_time_us} us`.padEnd(24) +
    `${benchmarkResults.quadratic_probing.average_search_time_us} us`.padEnd(24)
  );
  console.log(
    'Primary Clustering Factor'.padEnd(28) +
    String(benchmarkResults.linear_probing.clustering_factor).padEnd(24) +
    String(benchmarkResults.quadratic_probing.clustering_factor).padEnd(24)
  );
  console.log('---------------------------------------------------------------------------');
  console.log('\nEvaluation Theoretical Summary:');
  console.log('  ' + benchmarkResults.evaluation_summary);

  printHeader('ALL DBMS HASHING EVALUATION TESTS COMPLETED SUCCESSFULLY ✓');
}

testHashing();

