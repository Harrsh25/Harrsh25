const fs = require('fs'), path = require('path');
(async () => {
  const only = process.argv[2]; let fails = 0, n = 0;
  for (const f of fs.readdirSync(path.join(__dirname, '../tests')).filter(f => f.endsWith('.test.js') && (!only || f.includes(only))).sort()) {
    n++; try { fails += await require('../tests/' + f)(); } catch (e) { fails++; console.log('✗', f, 'CRASH', e.message.split('\n')[0]); }
  }
  console.log(`\n${n} test files, ${fails} failure(s)`); process.exit(fails ? 1 : 0);
})();
