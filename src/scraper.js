/**
 * scraper.js
 * To run this script, copy and paste `node scraper.js` in the terminal
 */

import fs from 'node:fs/promises';

const DATA_DIR = 'data';
const DINING_HALLS = {
  frary: {
    url: 'https://portal.pomona.edu/eatec/Frary.json',
    outfile: 'frary-raw.json',
  },
  oldenborg: {
    url: 'https://portal.pomona.edu/eatec/Oldenborg.json',
    outfile: 'oldenborg-raw.json',
  },
  frank: {
    url: 'https://portal.pomona.edu/eatec/Frank.json',
    outfile: 'frank-raw.json',
  }
};

function buildUrl(baseUrl) {
  const u = new URL(baseUrl);
  u.searchParams.set(`_${Date.now()}`, ''); // cache buster
  return u.toString();
}

function extractJson(raw) {
  const trimmed = raw.trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) {
    throw new Error('Could not find JSON object');
  }
  return trimmed.slice(first, last + 1);
}

async function scrapeHall(key) {
  const hall = DINING_HALLS[key];
  if (!hall) {
    throw new Error(`Unknown dining hall "${key}". Options: ${Object.keys(DINING_HALLS).join(', ')}`);
  }

  const url = buildUrl(hall.url);
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json, text/javascript;q=0.9, */*;q=0.1',
    },
  });

  const raw = await res.text();
  const data = JSON.parse(extractJson(raw));

  await fs.mkdir(DATA_DIR, { recursive: true });
  const outPath = `${DATA_DIR}/${hall.outfile}`;
  await fs.writeFile(outPath, JSON.stringify(data, null, 2));
  console.log(`[${key}] Saved ${outPath} with`, Object.keys(data).length, 'top-level keys');
}

async function main() {
  const args = process.argv.slice(2).map(arg => arg.toLowerCase());
  const targets = args.length ? args : Object.keys(DINING_HALLS);

  for (const key of targets) {
    try {
      await scrapeHall(key);
    } catch (err) {
      console.error(`[${key}] Scrape failed:`, err.message);
      process.exitCode = 1;
    }
  }

  if (process.exitCode) {
    throw new Error('One or more scrapes failed. See logs above.');
  }

  // TODO: map to schema after inspecting the keys
}

main().catch(err => {
  console.error('Scrape failed:', err);
  process.exit(1);
});
