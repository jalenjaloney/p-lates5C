import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

type Meal = "breakfast" | "lunch" | "dinner" | "late_night";
type MenuRow = {
  date_served: string;
  meal: Meal;
  dish_name: string;
  section?: string | null;
  description?: string | null;
  tags?: string[] | null;
  ingredients?: string | null;
  allergens?: string[] | null;
  dietary_choices?: string[] | null;
  nutrients?: string | null;
};

// Allow either SUPABASE_URL (if set manually) or PROJECT_URL to dodge the CLI restriction.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");
const DAYS_AHEAD = 5;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL/PROJECT_URL or SERVICE_ROLE_KEY env vars");
}

const DINING_HALLS = {
  frary: { type: "pomona", url: "https://portal.pomona.edu/eatec/Frary.json", campus: "Pomona" },
  oldenborg: { type: "pomona", url: "https://portal.pomona.edu/eatec/Oldenborg.json", campus: "Pomona" },
  frank: { type: "pomona", url: "https://portal.pomona.edu/eatec/Frank.json", campus: "Pomona" },
  hoch: {
    type: "sodexo",
    url: "https://hmc.sodexomyway.com/en-us/locations/hoch-shanahan-dining-commons",
    campus: "HMC",
    meta: { dateParam: "date" },
  },
  malott: {
    type: "bonappetit",
    url: "https://scripps.cafebonappetit.com/",
    campus: "Scripps",
    meta: { cafePath: "/cafe/malott-dining-commons" },
  },
  mcconnell: {
    type: "bonappetit",
    url: "https://pitzer.cafebonappetit.com/",
    campus: "Pitzer",
    meta: { cafePath: "/cafe/mcconnell-bistro" },
  },
  collins: {
    type: "bonappetit",
    url: "https://collins-cmc.cafebonappetit.com/",
    campus: "CMC",
    meta: { cafePath: "/cafe/collins" },
  },
} as const;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function buildUrl(base: string) {
  const u = new URL(base);
  u.searchParams.set(`_${Date.now()}`, "");
  return u.toString();
}

function slugifyDish(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "dish";
}

function normalizeMealName(raw: string | null | undefined): Meal {
  const name = (raw ?? "").toLowerCase();
  if (name.includes("breakfast")) return "breakfast";
  if (name.includes("lunch")) return "lunch";
  if (name.includes("dinner")) return "dinner";
  if (name.includes("late")) return "late_night";
  return "dinner";
}

function inferMealFromStation(stationHtml: string | null | undefined): Meal | null {
  const s = (stationHtml ?? "").toLowerCase();
  if (!s) return null;

  if (s.includes("@breakfast")) return "breakfast";
  if (s.includes("late night") || s.includes("late-night")) return "late_night";
  if (s.includes("@lunch")) return "lunch";
  if (s.includes("@dinner")) return "dinner";

  return null;
}

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
}

function normalizeHtmlChunk(text: string) {
  return decodeHtmlEntities(
    text
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanDescription(text: string | null | undefined) {
  if (!text) return null;
  const cleaned = text.replace(/<br\s*\/?>/gi, " ").replace(/\s+/g, " ").trim();
  return decodeHtmlEntities(cleaned) || null;
}

function extractPomonaTags(recipe: any) {
  const tags: string[] = [];
  const choices = recipe?.dietaryChoices?.dietaryChoice;
  const list = Array.isArray(choices) ? choices : choices ? [choices] : [];
  for (const choice of list) {
    if ((choice?.["#text"] || "").trim().toLowerCase() === "yes") {
      const label = (choice?.["@id"] || "").trim();
      if (label) tags.push(label);
    }
  }
  return tags.length ? tags : null;
}

function extractPomonaAllergens(recipe: any) {
  const out: string[] = [];
  const allergens = recipe?.allergens?.allergen;
  const list = Array.isArray(allergens) ? allergens : allergens ? [allergens] : [];
  for (const item of list) {
    const flag = (item?.["#text"] || "").trim().toLowerCase();
    const label = (item?.["@id"] || "").trim();
    if (flag === "yes" && label) out.push(label);
  }
  return out.length ? out : null;
}

function extractBonAppTags(item: any) {
  const tags = new Set<string>();
  const corIcon = item?.cor_icon || {};
  const ordered = item?.ordered_cor_icon || {};

  for (const val of Object.values(corIcon)) {
    const label = typeof val === "string" ? val.trim() : (val as any)?.label?.trim();
    if (label) tags.add(label);
  }
  for (const entry of Object.values(ordered)) {
    const label = (entry as any)?.label?.trim();
    if (label) tags.add(label);
  }

  return tags.size ? Array.from(tags) : null;
}

function extractSodexoAllergens(item: any) {
  const values: string[] = [];
  const src = item?.allergens || item?.allergenIcons || item?.allergenNames;
  const list = Array.isArray(src) ? src : typeof src === "string" ? src.split(/[,;]+/) : [];
  for (const val of list) {
    const label = (val as any)?.label ?? val;
    const text = typeof label === "string" ? label.trim() : "";
    if (text) values.push(text);
  }
  return values.length ? values : null;
}

function extractSodexoDietary(item: any) {
  const values: string[] = [];
  const src = item?.dietary || item?.dietaryFlags || item?.specialDiets;
  const list = Array.isArray(src) ? src : typeof src === "string" ? src.split(/[,;]+/) : [];
  for (const val of list) {
    const label = (val as any)?.label ?? val;
    const text = typeof label === "string" ? label.trim() : "";
    if (text) values.push(text);
  }
  // Common boolean flags on Sodexo items
  const boolFlags: Array<[string, boolean | undefined]> = [
    ["Vegan", item?.isVegan],
    ["Vegetarian", item?.isVegetarian],
    ["Plant Based", item?.isPlantBased],
    ["Mindful", item?.isMindful],
    ["Swell", item?.isSwell],
  ];
  for (const [label, flag] of boolFlags) {
    if (flag) values.push(label);
  }
  return values.length ? values : null;
}

function formatSodexoNutrients(item: any) {
  const src = item?.nutrition ?? item?.nutritionInfo ?? item?.nutrients;

  if (Array.isArray(src)) {
    const parts = src
      .map((n: any) => {
        const label = (n?.label || n?.name || "").trim();
        const val = (n?.value || n?.amount || n?.qty || "").toString().trim();
        return label && val ? `${label}: ${val}` : null;
      })
      .filter(Boolean);
    return parts.length ? parts.join(" | ") : null;
  }

  if (src && typeof src === "object") {
    const parts = Object.entries(src)
      .map(([k, v]) => {
        const val = String(v ?? "").trim();
        return val ? `${k}: ${val}` : null;
      })
      .filter(Boolean);
    return parts.length ? parts.join(" | ") : null;
  }

  if (typeof src === "string") return src.trim() || null;
  // Build from common macro keys if present
  const macroKeys: Array<[string, string]> = [
    ["Calories", item?.calories],
    ["Calories from Fat", item?.caloriesFromFat],
    ["Fat", item?.fat],
    ["Saturated Fat", item?.saturatedFat],
    ["Trans Fat", item?.transFat],
    ["Polyunsaturated Fat", item?.polyunsaturatedFat],
    ["Cholesterol", item?.cholesterol],
    ["Sodium", item?.sodium],
    ["Carbohydrates", item?.carbohydrates],
    ["Dietary Fiber", item?.dietaryFiber],
    ["Sugar", item?.sugar],
    ["Added Sugar", item?.addedSugar],
    ["Protein", item?.protein],
    ["Potassium", item?.potassium],
    ["Iron", item?.iron],
    ["Calcium", item?.calcium],
    ["Vitamin A", item?.vitaminA],
    ["Vitamin C", item?.vitaminC],
    ["Vitamin D", item?.vitaminD],
  ];
  const parts = macroKeys
    .map(([label, val]) => {
      const text = typeof val === "string" ? val.trim() : val ? String(val).trim() : "";
      return text ? `${label}: ${text}` : null;
    })
    .filter(Boolean);
  return parts.length ? parts.join(" | ") : null;
}

function extractBonAppMealSections(html: string) {
  const sectionText: Partial<Record<Meal, string>> = {};
  const definitions: Array<{ id: string; meal: Meal }> = [
    { id: "breakfast", meal: "breakfast" },
    { id: "lunch", meal: "lunch" },
    { id: "dinner", meal: "dinner" },
    { id: "late-night", meal: "late_night" },
    { id: "late_night", meal: "late_night" },
  ];

  for (const def of definitions) {
    const regex = new RegExp(`<section[^>]*id=["']${def.id}["'][^>]*>([\\s\\S]*?)<\\/section>`, "i");
    const match = html.match(regex);
    if (match?.[1]) {
      const normalized = normalizeHtmlChunk(match[1]);
      if (normalized) sectionText[def.meal] = normalized;
    }
  }

  return sectionText;
}

function inferMealFromSections(label: string, sections: Partial<Record<Meal, string>>): Meal | null {
  const needle = normalizeHtmlChunk(label);
  if (!needle) return null;

  for (const [meal, content] of Object.entries(sections)) {
    if (content && content.includes(needle)) return meal as Meal;
  }

  return null;
}

function extractStationLabel(station: any) {
  const raw =
    typeof station === "string"
      ? station
      : station?.label || station?.name || station?.station || station?.display_name || "";

  const cleaned = decodeHtmlEntities(String(raw))
    .replace(/<[^>]+>/g, " ")
    .replace(/@/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || null;
}

function toIso(yyyymmdd: string) {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

function extractJsonObjectLiteral(html: string, marker: string) {
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return null;

  const braceIndex = html.indexOf("{", markerIndex);
  if (braceIndex === -1) return null;

  let depth = 0;
  let inString: string | null = null;

  for (let i = braceIndex; i < html.length; i += 1) {
    const char = html[i];
    if (inString) {
      if (char === "\\") {
        i += 1;
      } else if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return html.slice(braceIndex, i + 1);
      }
    }
  }

  return null;
}

function extractPreloadedState(html: string) {
  const directMatch = html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\})\s*;/);
  if (directMatch) {
    try {
      return JSON.parse(directMatch[1]);
    } catch (err) {
      console.warn('Failed to parse "__PRELOADED_STATE__"', err);
    }
  }

  const literalBlock = extractJsonObjectLiteral(html, "window.__PRELOADED_STATE__");
  if (literalBlock) {
    try {
      return JSON.parse(literalBlock);
    } catch (err) {
      console.warn('Failed to parse "__PRELOADED_STATE__" literal', err);
    }
  }

  const scriptMatch = html.match(/<script[^>]*>([\s\S]*?window\.__PRELOADED_STATE__[\s\S]*?)<\/script>/);
  if (!scriptMatch) return null;

  try {
    const context: any = { window: {}, JSON };
    // eslint-disable-next-line no-new-func
    const fn = new Function("window", "JSON", scriptMatch[1]);
    fn(context.window, JSON);
    return context.window.__PRELOADED_STATE__ ?? null;
  } catch (err) {
    console.warn('Failed to evaluate "__PRELOADED_STATE__"', err);
    return null;
  }
}

function extractSodexoMenu(preloaded: any) {
  const regions = preloaded?.composition?.subject?.regions;
  if (!Array.isArray(regions)) return null;
  return regions.find((r: any) => r.id === "menus") ?? null;
}

function extractBonAppJsonBlock(html: string, key: string) {
  const regex = new RegExp(`Bamco\\.${key}\\s*=\\s*(\\{[\\s\\S]*?\\});`);
  const match = html.match(regex);
  return match ? JSON.parse(match[1]) : null;
}

function uniqBy<T>(items: T[], keyFn: (item: T) => string) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = keyFn(item);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}

function normalizePomona(data: any) {
  const rows: MenuRow[] = [];
  const menu = data?.EatecExchange?.menu ?? [];
  const list = Array.isArray(menu) ? menu : [menu];

  for (const entry of list) {
    const servedate = entry?.["@servedate"];
    if (!servedate || servedate.length !== 8) continue;
    const meal = normalizeMealName(entry?.["@mealperiodname"]);
    const recipes = entry?.recipes?.recipe;
    const recipeList = Array.isArray(recipes) ? recipes : recipes ? [recipes] : [];
    for (const recipe of recipeList) {
      const dishName = recipe?.["@shortName"]?.trim() || recipe?.["@description"]?.trim();
      if (dishName) {
        const section = (recipe?.["@category"] || "").trim() || null;
        // Prefer the alternate description; ignore the formal recipe description if absent.
        const altDesc = (recipe?.["@alternatedescription"] || "").trim();
        const description = altDesc && altDesc.toLowerCase() !== "n/a" ? cleanDescription(altDesc) : null;
        const tags = extractPomonaTags(recipe);
        const allergens = extractPomonaAllergens(recipe);
        const dietaryChoices = extractPomonaTags(recipe);
        const ingredients = cleanDescription(recipe?.ingredients?.["#cdata-section"] || null);
        const nutrients = (recipe?.["@nutrients"] || "").trim() || null;

        rows.push({
          date_served: toIso(servedate),
          meal,
          dish_name: dishName,
          section,
          description,
          tags,
          allergens,
          dietary_choices: dietaryChoices,
          ingredients,
          nutrients,
        });
      }
    }
  }
  return uniqBy(rows, (r) => `${r.date_served}|${r.meal}|${r.section ?? ""}|${r.dish_name.toLowerCase()}`);
}

function normalizeSodexo(menuRegion: any, fallbackDate?: string) {
  const rows: MenuRow[] = [];
  const fragments = menuRegion?.fragments ?? [];
  for (const frag of fragments) {
    const dateRaw = frag?.content?.menuDate || frag?.content?.metadata?.menuDate;
    const isoDate = typeof dateRaw === "string" && dateRaw.includes("-") ? dateRaw.slice(0, 10) : fallbackDate ?? null;

    // Legacy Sodexo JSON structure.
    const meals = frag?.content?.meals ?? frag?.content?.menuBlocks ?? [];
    if (Array.isArray(meals) && meals.length) {
      for (const mealBlock of meals) {
        const meal = normalizeMealName(mealBlock?.name || mealBlock?.mealName);
        const categories = mealBlock?.categories || mealBlock?.stations || mealBlock?.items || [];
        for (const cat of categories) {
          const items = cat?.items || cat?.recipes || cat?.menuItems || [];
          const section = (cat?.name || cat?.categoryName || cat?.stationName || "").trim() || null;
          for (const item of items) {
            const dish = (item?.description || item?.name || item?.title || item?.itemName || item?.menuItemName || "").trim();
            if (!isoDate || !dish) continue;
            const description = cleanDescription(item?.longDescription || item?.summary || item?.description);
            const ingredients = cleanDescription(item?.ingredients || item?.ingredientList);
            const allergens = extractSodexoAllergens(item);
            const dietary_choices = extractSodexoDietary(item);
            const nutrients = formatSodexoNutrients(item);
            rows.push({
              date_served: isoDate,
              meal,
              dish_name: dish,
              section,
              description,
              ingredients,
              allergens,
              dietary_choices,
              nutrients,
            });
          }
        }
      }
      continue;
    }

    // Newer "sections/groups/items" structure.
    const sections = frag?.content?.main?.sections ?? [];
    for (const section of sections) {
      const sectionMeal = normalizeMealName(section?.name);
      const groups = section?.groups ?? [];
      for (const group of groups) {
        const groupSection = (group?.name || section?.name || "").trim() || null;
        const items = group?.items ?? [];
        for (const item of items) {
          const dish = (item?.formalName || item?.name || item?.title || "").trim();
          if (!dish || !isoDate) continue;
          const meal = normalizeMealName(item?.meal || sectionMeal);
          const description = cleanDescription(item?.description || item?.longDescription);
          const ingredients = cleanDescription(item?.ingredients || item?.ingredientList);
          const allergens = extractSodexoAllergens(item);
          const dietary_choices = extractSodexoDietary(item);
          const nutrients = formatSodexoNutrients(item);
          rows.push({
            date_served: isoDate,
            meal,
            dish_name: dish,
            section: groupSection,
            description,
            ingredients,
            allergens,
            dietary_choices,
            nutrients,
          });
        }
      }
    }
  }
  return uniqBy(rows, (r) => `${r.date_served}|${r.meal}|${r.section ?? ""}|${r.dish_name.toLowerCase()}`);
}

function normalizeBonApp(menuItems: Record<string, any>, dailyMenus: any, dayDate: string) {
  const rows: MenuRow[] = [];
  const dateMenu = dailyMenus?.[dayDate];
  const daypartsRaw = dateMenu?.dayparts ?? [];
  const dayparts = Array.isArray(daypartsRaw) && Array.isArray(daypartsRaw[0]) ? daypartsRaw.flat() : daypartsRaw;
  if (!dayparts?.length) return rows;
  for (const part of dayparts) {
    const meal = normalizeMealName(part?.label || part?.name);
    const stations = part?.stations ?? [];
    for (const station of stations) {
      const section = extractStationLabel(station);
      const itemIds: (string | number)[] = station?.items ?? [];
      for (const id of itemIds) {
        const dish = menuItems?.[id]?.label?.trim();
        if (dish) {
          const description = cleanDescription(menuItems?.[id]?.description);
          const tags = extractBonAppTags(menuItems?.[id]);
          rows.push({ date_served: dayDate, meal, dish_name: dish, section, description, tags });
        }
      }
    }
  }
  return uniqBy(rows, (r) => `${r.date_served}|${r.meal}|${r.section ?? ""}|${r.dish_name.toLowerCase()}`);
}

function inferBonAppMealsFromSections(
  menuItems: Record<string, any>,
  sections: Partial<Record<Meal, string>>,
  date: string
) {
  const rows: MenuRow[] = [];
  const hasSections = Object.keys(sections).length > 0;

  for (const item of Object.values(menuItems)) {
    const label = (item?.label || item?.name || "").trim();
    if (!label) continue;

    let meal: Meal | null = null;
    if (hasSections) meal = inferMealFromSections(label, sections);
    if (!meal) meal = inferMealFromStation(item?.station);

    if (meal) {
      const description = cleanDescription(item?.description);
      const tags = extractBonAppTags(item);
      rows.push({
        date_served: date,
        meal,
        dish_name: label,
        section: extractStationLabel(item?.station),
        description,
        tags,
      });
    }
  }

  return uniqBy(rows, (r) => `${r.date_served}|${r.meal}|${r.section ?? ""}|${r.dish_name.toLowerCase()}`);
}

async function upsertHall(name: string, campus?: string) {
  const { data, error } = await supabase
    .from("halls")
    .upsert({ name, campus }, { onConflict: "name" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as number;
}

async function upsertDishes(
  hallId: number,
  dishes: Array<{
    name: string;
    slug: string;
    description?: string | null;
    ingredients?: string | null;
    allergens?: string[] | null;
    dietary_choices?: string[] | null;
    nutrients?: string | null;
    tags?: string[] | null;
  }>
) {
  if (!dishes.length) return [];
  const payload = dishes.map((d) => ({
    hall_id: hallId,
    ...d,
    updated_at: new Date().toISOString(),
  }));
  const { data, error } = await supabase
    .from("dishes")
    .upsert(payload, { onConflict: "hall_id,slug" })
    .select("id, slug");
  if (error) throw error;
  return data ?? [];
}

async function upsertMenuItems(
  items: Array<{
    hall_id: number;
    dish_id: number;
    date_served: string;
    meal: Meal;
    dish_name: string;
    section?: string | null;
    description?: string | null;
    tags?: string[] | null;
    ingredients?: string | null;
    allergens?: string[] | null;
    dietary_choices?: string[] | null;
    nutrients?: string | null;
  }>
) {
  if (!items.length) return;
  const { error } = await supabase
    .from("menu_items")
    .upsert(items, { onConflict: "hall_id,dish_id,date_served,meal,section" });
  if (error) throw error;
}

async function scrapePomona(hall: (typeof DINING_HALLS)[keyof typeof DINING_HALLS]) {
  const res = await fetch(buildUrl(hall.url), {
    headers: { Accept: "application/json, text/javascript;q=0.9, */*;q=0.1" },
  });
  if (!res.ok) throw new Error(`Pomona fetch failed ${res.status}`);

  // Some endpoints return JS with comments/wrappers; peel out the JSON object manually.
  const raw = await res.text();
  const trimmed = raw.trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("Pomona response missing JSON object");
  }
  const jsonSlice = trimmed.slice(first, last + 1);
  const data = JSON.parse(jsonSlice);
  return normalizePomona(data);
}

async function scrapeSodexo(hall: (typeof DINING_HALLS)["hoch"]) {
  const dateParam = hall.meta?.dateParam || "date";
  const rows: MenuRow[] = [];
  const start = new Date();

  for (let offset = 0; offset <= DAYS_AHEAD; offset += 1) {
    const target = new Date(start);
    target.setDate(start.getDate() + offset);
    const isoDate = target.toISOString().slice(0, 10);

    const dayUrl = new URL(hall.url);
    dayUrl.searchParams.set(dateParam, isoDate);

    const res = await fetch(buildUrl(dayUrl.toString()), {
      headers: { Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8" },
    });
    if (!res.ok) throw new Error(`Sodexo fetch failed ${res.status} for ${isoDate}`);
    const html = await res.text();
    const preloaded = extractPreloadedState(html);
    if (!preloaded) {
      console.warn(`Sodexo: no __PRELOADED_STATE__ for ${isoDate}; skipping`);
      continue;
    }
    const menuRegion = extractSodexoMenu(preloaded);
    if (!menuRegion) throw new Error("Missing Sodexo menu region");
    rows.push(...normalizeSodexo(menuRegion, isoDate));
  }
  return rows;
}

async function scrapeBonApp(
  hall: Extract<(typeof DINING_HALLS)[keyof typeof DINING_HALLS], { type: "bonappetit" }>
) {
  const rows: MenuRow[] = [];
  const start = new Date();

  for (let offset = 0; offset <= DAYS_AHEAD; offset += 1) {
    const target = new Date(start);
    target.setDate(start.getDate() + offset);
    const isoDate = target.toISOString().slice(0, 10);

    const normalizedPath = (hall.meta?.cafePath ?? "").replace(/\/$/, "");
    const pathSegment = normalizedPath ? `${normalizedPath}/${isoDate}/` : `${isoDate}/`;
    const pageUrl = new URL(pathSegment, hall.url).toString();

    const htmlRes = await fetch(buildUrl(pageUrl), {
      headers: { Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8" },
    });
    if (!htmlRes.ok) {
      console.warn(`Bon App: HTML fetch failed ${htmlRes.status} for ${pageUrl}`);
      continue;
    }

    const html = await htmlRes.text();
    const menuItems = extractBonAppJsonBlock(html, "menu_items");
    const dailyMenus = extractBonAppJsonBlock(html, "daily_menus");
    const sectionTextByMeal = extractBonAppMealSections(html);

    if (!menuItems) {
      console.warn(`Bon App: missing menu_items for ${pageUrl}; skipping`);
      continue;
    }

    const daypartRows = dailyMenus ? normalizeBonApp(menuItems, dailyMenus, isoDate) : [];
    if (daypartRows.length) {
      rows.push(...daypartRows);
      continue;
    }

    const inferredRows = inferBonAppMealsFromSections(menuItems, sectionTextByMeal, isoDate);
    if (!inferredRows.length) {
      console.warn(`Bon App: no inferable meal periods for ${pageUrl}; skipping`);
      continue;
    }

    rows.push(...inferredRows);
  }

  return rows;
}

Deno.serve(async () => {
  try {
    const results: Record<string, number> = {};

    for (const [key, hall] of Object.entries(DINING_HALLS)) {
      const hallId = await upsertHall(key, hall.campus);
      let items: Array<{
        date_served: string;
        meal: Meal;
        dish_name: string;
        section?: string | null;
        description?: string | null;
        tags?: string[] | null;
        ingredients?: string | null;
        allergens?: string[] | null;
        dietary_choices?: string[] | null;
        nutrients?: string | null;
      }> = [];

      if (hall.type === "pomona") {
        items = await scrapePomona(hall);
      } else if (hall.type === "sodexo") {
        items = await scrapeSodexo(hall as any);
      } else if (hall.type === "bonappetit") {
        items = await scrapeBonApp(hall as any);
      }

      const deduped = uniqBy(
        items,
        (r) => `${r.date_served}|${r.meal}|${r.section ?? ""}|${r.dish_name.toLowerCase()}`
      );
      // Upsert canonical dishes
      const dishMap = new Map<
        string,
        {
          name: string;
          slug: string;
          description?: string | null;
          ingredients?: string | null;
          allergens?: string[] | null;
          dietary_choices?: string[] | null;
          nutrients?: string | null;
          tags?: string[] | null;
        }
      >();

      for (const row of deduped) {
        const slug = slugifyDish(row.dish_name);
        const prev = dishMap.get(slug);
        dishMap.set(slug, {
          name: row.dish_name,
          slug,
          description: row.description ?? prev?.description ?? null,
          ingredients: row.ingredients ?? prev?.ingredients ?? null,
          allergens: row.allergens ?? prev?.allergens ?? null,
          dietary_choices: row.dietary_choices ?? prev?.dietary_choices ?? null,
          nutrients: row.nutrients ?? prev?.nutrients ?? null,
          tags: row.tags ?? prev?.tags ?? null,
        });
      }

      const dishRows = await upsertDishes(hallId, Array.from(dishMap.values()));
      const slugToId = Object.fromEntries((dishRows || []).map((d: any) => [d.slug, d.id as number]));

      const itemsWithDish = deduped
        .map((r) => {
          const slug = slugifyDish(r.dish_name);
          const dish_id = slugToId[slug];
          if (!dish_id) return null;
          return { ...r, hall_id: hallId, dish_id };
        })
        .filter(Boolean) as Array<{
          hall_id: number;
          dish_id: number;
          date_served: string;
          meal: Meal;
          dish_name: string;
          section?: string | null;
          description?: string | null;
          tags?: string[] | null;
          ingredients?: string | null;
          allergens?: string[] | null;
          dietary_choices?: string[] | null;
          nutrients?: string | null;
        }>;

      // Dedupe again using the conflict target to avoid "ON CONFLICT ... cannot affect row a second time"
      // when multiple scraped rows normalize to the same slug/dish combo.
      const itemsForUpsert = uniqBy(
        itemsWithDish,
        (r) => `${r.hall_id}|${r.dish_id}|${r.date_served}|${r.meal}|${r.section ?? ""}`
      );

      await upsertMenuItems(itemsForUpsert);
      results[key] = deduped.length;
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("scrape-menus error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
});
