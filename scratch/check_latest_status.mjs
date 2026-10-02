import https from 'https';
const token = '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';

function get(path) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'api.github.com',
      path,
      headers: { 'User-Agent': 'Node.js', 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function run() {
  const commitStatus = await get('/repos/Jank6106/PWA_GoSavingFood/commits/master/status');
  console.log('--- COMBINED STATUS FOR master ---');
  console.log('State:', commitStatus.state);
  console.log('Total statuses:', commitStatus.statuses?.length);
  for (const s of (commitStatus.statuses || [])) {
    console.log(`- [${s.state}] ${s.context}: ${s.description}`);
    console.log(`  Target: ${s.target_url}`);
  }

  const checkRuns = await get('/repos/Jank6106/PWA_GoSavingFood/commits/8a8c3d40/check-runs');
  console.log('\n--- CHECK RUNS FOR 8a8c3d40 ---');
  console.log('Total check runs:', checkRuns.total_count);
  for (const c of (checkRuns.check_runs || [])) {
    console.log(`- [${c.status} / ${c.conclusion}] ${c.name}`);
    console.log(`  URL: ${c.html_url}`);
    console.log(`  Output title: ${c.output?.title}`);
    console.log(`  Output summary: ${c.output?.summary}`);
    console.log(`  Output text: ${c.output?.text?.slice(0, 300)}`);
  }
}

run().catch(console.error);
