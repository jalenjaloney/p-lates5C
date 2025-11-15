/**
 * scraper.js
 * To run this script, copy and paste `node scraper.js` in the terminal
 */

import fs from 'node:fs/promises';

const URL_OLDENBORG = 'https://portal.pomona.edu/eatec/Oldenborg.json';

function buildUrl() {
  const u = new URL(URL_OLDENBORG);
  u.searchParams.set(`_${Date.now()}`, ''); // cache buster
  return u.toString();
}

// Robustly extract the JSON object from JS/JSONP payloads
function extractJsonFromJsPayload(s) {
  let t = s.trim();

  // fallback: slice first {...} block
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    t = t.slice(first, last + 1);
  }
  return t;
}

async function main() {
  const url = buildUrl();
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json, text/javascript;q=0.9, */*;q=0.1',
    },
  });

  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(extractJsonFromJsPayload(raw));
  } catch (e) {
    console.error('Parse failed. First 200 chars:\n', raw.slice(0, 200));
    throw e;
  }

  await fs.mkdir('data', { recursive: true });
  await fs.writeFile('data/oldenborg-raw.json', JSON.stringify(data, null, 2));
  console.log('Saved data/oldenborg-raw.json with', Object.keys(data).length, 'top-level keys');

  // TODO: map to your schema once you inspect the keys
}

main().catch(err => {
  console.error('Scrape failed:', err);
  process.exit(1);
});
