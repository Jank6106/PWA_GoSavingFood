import https from 'https';

const token = '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';

function get(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      headers: {
        'User-Agent': 'Node.js',
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const commitStatus = await get('/repos/Jank6106/PWA_GoSavingFood/commits/c60a8e83/status');
  console.log('--- COMBINED STATUS ---');
  console.log('State:', commitStatus.body.state);
  console.log('Statuses count:', commitStatus.body.statuses?.length);
  commitStatus.body.statuses?.forEach(s => {
    console.log(`- [${s.state}] ${s.context}: ${s.description} (${s.target_url})`);
  });

  const checkRuns = await get('/repos/Jank6106/PWA_GoSavingFood/commits/c60a8e83/check-runs');
  console.log('\n--- CHECK RUNS ---');
  console.log('Total check runs:', checkRuns.body.total_count);
  checkRuns.body.check_runs?.forEach(c => {
    console.log(`- [${c.status} / ${c.conclusion}] ${c.name}: ${c.html_url}`);
  });

  const deployments = await get('/repos/Jank6106/PWA_GoSavingFood/deployments?per_page=5');
  console.log('\n--- RECENT DEPLOYMENTS ---');
  for (const d of (deployments.body || [])) {
    const depStatus = await get(`/repos/Jank6106/PWA_GoSavingFood/deployments/${d.id}/statuses`);
    const latest = depStatus.body?.[0];
    console.log(`- Deployment ID ${d.id} for ref ${d.ref} (${d.sha?.slice(0, 8)}):`);
    console.log(`  Environment: ${d.environment}`);
    console.log(`  State: ${latest?.state}`);
    console.log(`  Description: ${latest?.description}`);
    console.log(`  URL: ${latest?.environment_url || latest?.target_url}`);
    console.log(`  Created at: ${latest?.created_at}`);
  }
}

run().catch(console.error);
