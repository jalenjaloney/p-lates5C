/* eslint-env node */
/* global process */
/**
 * scraper.js
 * Local helper to fetch raw menu JSON into data/*.json for debugging the edge function scraper.
 */

import fs from 'node:fs/promises';
import vm from 'node:vm';

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
  },
  hoch: {
    type: 'sodexo',
    url: 'https://hmc.sodexomyway.com/en-us/locations/hoch-shanahan-dining-commons',
    outfile: 'hoch-shanahan-raw.json',
    meta: {
      locationId: '13147001',
      menuId: '15258',
      dateParam: 'date',
    },
  },
  malott: {
    type: 'bonappetit',
    url: 'https://scripps.cafebonappetit.com/',
    outfile: 'malott-raw.json',
    meta: {
      cafePath: '/cafe/malott-dining-commons',
    },
  },
  mcconnell: {
    type: 'bonappetit',
    url: 'https://pitzer.cafebonappetit.com/',
    outfile: 'mcconnell-raw.json',
    meta: {
      cafePath: '/cafe/mcconnell-bistro',
    },
  },
  collins: {
    type: 'bonappetit',
    url: 'https://collins-cmc.cafebonappetit.com/',
    outfile: 'collins-raw.json',
    meta: {
      cafePath: '/cafe/collins',
    },
  },
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

async function scrapePomonaHall(key, hall) {
  const url = buildUrl(hall.url);
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json, text/javascript;q=0.9, */*;q=0.1',
    },
  });

  const raw = await res.text();
  const data = JSON.parse(extractJson(raw));
  await writeHallData(key, hall.outfile, data, Object.keys(data).length);
}

function extractJsonObjectLiteral(html, marker) {
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  const braceIndex = html.indexOf('{', markerIndex);
  if (braceIndex === -1) {
    return null;
  }

  let depth = 0;
  let inString = null;

  for (let i = braceIndex; i < html.length; i += 1) {
    const char = html[i];
    if (inString) {
      if (char === '\\') {
        i += 1;
      } else if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return html.slice(braceIndex, i + 1);
      }
    }
  }

  return null;
}

function extractPreloadedState(html) {
  const directMatch = html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\})\s*;/);
  if (directMatch) {
    try {
      return JSON.parse(directMatch[1]);
    } catch (err) {
      throw new Error(`Failed to parse "__PRELOADED_STATE__": ${err.message}`);
    }
  }

  const literalBlock = extractJsonObjectLiteral(html, 'window.__PRELOADED_STATE__');
  if (literalBlock) {
    try {
      return JSON.parse(literalBlock);
    } catch (err) {
      throw new Error(`Failed to parse "__PRELOADED_STATE__" literal: ${err.message}`);
    }
  }

  const scriptMatch = html.match(
    /<script[^>]*>([\s\S]*?window\.__PRELOADED_STATE__[\s\S]*?)<\/script>/
  );
  if (!scriptMatch) {
    throw new Error('Could not locate "__PRELOADED_STATE__" in HTML response');
  }

  try {
    const context = {
      window: {},
      JSON,
    };
    vm.runInNewContext(scriptMatch[1], context);
    if (!context.window.__PRELOADED_STATE__) {
      throw new Error('window.__PRELOADED_STATE__ was not set after evaluating script block');
    }
    return context.window.__PRELOADED_STATE__;
  } catch (err) {
    throw new Error(`Failed to evaluate "__PRELOADED_STATE__": ${err.message}`);
  }
}

function extractSodexoMenu(preloadedState) {
  const regions = preloadedState?.composition?.subject?.regions;
  if (!Array.isArray(regions)) {
    return null;
  }

  return regions.find(region => region.id === 'menus') ?? null;
}

function extractBonAppCafeInfo(html) {
  const match = html.match(
    /Bamco\.current_cafe\s*=\s*\{\s*name:\s*['"]([^'"]+)['"],\s*id:\s*(\d+)/
  );
  if (!match) {
    return null;
  }

  return {
    name: match[1],
    id: Number(match[2]),
  };
}

function extractBonAppJsonBlock(html, key) {
  const regex = new RegExp(`Bamco\\.${key}\\s*=\\s*(\\{[\\s\\S]*?\\});`);
  const match = html.match(regex);
  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[1]);
  } catch (err) {
    throw new Error(`Failed to parse Bamco.${key} JSON: ${err.message}`);
  }
}

async function fetchSodexoPage(pageUrl, hall) {
  const url = buildUrl(pageUrl);
  const res = await fetch(url, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
    },
  });

  const html = await res.text();
  const preloadedState = extractPreloadedState(html);
  const menuRegion = extractSodexoMenu(preloadedState);
  if (!menuRegion) {
    throw new Error('Unable to locate Sodexo menu region in preloaded state');
  }

  const payload = {
    meta: {
      ...hall.meta,
      locationId: hall.meta?.locationId ?? menuRegion?.fragments?.[0]?.content?.metadata?.locationId,
      menuId: hall.meta?.menuId ?? menuRegion?.fragments?.[0]?.content?.metadata?.menuId,
    },
    menuRegion,
    preloadedState,
  };

  return payload;
}

async function scrapeSodexoHall(key, hall) {
  const daysAhead = 5;
  const dateParam = hall.meta?.dateParam || 'date';

  if (daysAhead <= 0) {
    const payload = await fetchSodexoPage(hall.url, hall);
    const fragmentCount = payload.menuRegion?.fragments?.length ?? 0;
    await writeHallData(
      key,
      hall.outfile,
      {
        scrapedAt: new Date().toISOString(),
        sourceUrl: hall.url,
        ...payload,
      },
      fragmentCount,
    );
    return;
  }

  const days = [];
  const start = new Date();

  for (let offset = 0; offset <= daysAhead; offset += 1) {
    const target = new Date(start);
    target.setDate(start.getDate() + offset);
    const isoDate = target.toISOString().slice(0, 10);

    const dayUrl = new URL(hall.url);
    dayUrl.searchParams.set(dateParam, isoDate);

    const payload = await fetchSodexoPage(dayUrl.toString(), hall);
    days.push({
      date: isoDate,
      url: dayUrl.toString(),
      fragments: payload.menuRegion?.fragments ?? [],
      meta: payload.meta,
      preloadedState: payload.preloadedState,
    });
  }

  await writeHallData(
    key,
    hall.outfile,
    {
      scrapedAt: new Date().toISOString(),
      baseUrl: hall.url,
      dateParam,
      daysAhead,
      days,
    },
    days.length,
  );
}

async function scrapeBonAppHall(key, hall) {
  const cafePath = hall.meta?.cafePath ?? '';
  const daysAhead = 5;

  const start = new Date();
  const days = [];

  for (let offset = 0; offset <= daysAhead; offset += 1) {
    const target = new Date(start);
    target.setDate(start.getDate() + offset);
    const isoDate = target.toISOString().slice(0, 10);

    const normalizedPath = cafePath.replace(/\/$/, '');
    const pathSegment = normalizedPath ? `${normalizedPath}/${isoDate}/` : `${isoDate}/`;
    const pageUrl = new URL(pathSegment, hall.url).toString();

    const htmlRes = await fetch(buildUrl(pageUrl), {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      },
    });

    if (!htmlRes.ok) {
      throw new Error(`Failed to fetch ${pageUrl}: ${htmlRes.status}`);
    }

    const html = await htmlRes.text();
    const cafeInfo = extractBonAppCafeInfo(html);
    const cafeId = hall.meta?.cafeId ?? cafeInfo?.id;
    if (!cafeId) {
      throw new Error(`Could not determine Bon Appétit cafe id for ${pageUrl}`);
    }

    const menuItems = extractBonAppJsonBlock(html, 'menu_items');
    if (!menuItems) {
      throw new Error(`Unable to find Bamco.menu_items blob for ${pageUrl}`);
    }

    const menuItemsNonce = html.match(/Bamco\.menu_items_nonce\s*=\s*'([^']+)'/)?.[1] ?? null;
    const viewTierMatch = html.match(/Bamco\.view_tier\s*=\s*(\d+)/);
    const viewTier = viewTierMatch ? Number(viewTierMatch[1]) : null;

    days.push({
      date: isoDate,
      url: pageUrl,
      cafe: {
        id: cafeId,
        name: hall.meta?.name ?? cafeInfo?.name ?? null,
      },
      meta: {
        menuItemsNonce,
        viewTier,
      },
      data: {
        menuItems,
      },
    });
  }

  const payload = {
    scrapedAt: new Date().toISOString(),
    baseUrl: hall.url,
    cafePath,
    daysAhead,
    days,
  };

  await writeHallData(key, hall.outfile, payload, days.length);
}

async function writeHallData(key, outfile, data, count = 0) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const outPath = `${DATA_DIR}/${outfile}`;
  await fs.writeFile(outPath, JSON.stringify(data, null, 2));
  console.log(`[${key}] Saved ${outPath} (${count} top-level entries)`);
}

async function scrapeHall(key) {
  const hall = DINING_HALLS[key];
  if (!hall) {
    throw new Error(`Unknown dining hall "${key}". Options: ${Object.keys(DINING_HALLS).join(', ')}`);
  }

  const type = hall.type ?? 'pomona';
  if (type === 'sodexo') {
    await scrapeSodexoHall(key, hall);
    return;
  }

  if (type === 'bonappetit') {
    await scrapeBonAppHall(key, hall);
    return;
  }

  await scrapePomonaHall(key, hall);
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
}

main().catch(err => {
  console.error('Scrape failed:', err);
  process.exit(1);
});
