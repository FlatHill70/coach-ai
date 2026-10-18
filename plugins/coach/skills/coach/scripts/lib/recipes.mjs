import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { SKILL_DIR, paths, readJson, writeJson, loadProfile, isoDay, today, UserError } from "./common.mjs";
import { norm } from "./exercises.mjs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const METHODS = ["airfryer", "oven", "pan", "pot", "microwave", "none"];
const COATINGS = ["breaded", "battered"];

const BASE = JSON.parse(readFileSync(join(SKILL_DIR, "scripts", "recipes.json"), "utf8"));

export function catalog() {
  const custom = readJson(paths.customRecipes, {});
  const byId = Object.fromEntries(BASE.map((r) => [r.id, r]));
  for (const [id, r] of Object.entries(custom)) byId[id] = { ...r, id, custom: true };
  return Object.values(byId);
}

export async function cmdRecipes(args) {
  const sub = args._[0] ?? "find";
  if (sub === "find") return findRecipes(args);
  if (sub === "show") return showRecipe(args._[1]);
  if (sub === "import") return importRecipes(args);
  if (sub === "add") return addRecipes(args);
  if (sub === "remove") return removeRecipe(args._[1]);
  if (sub === "list") {
    const all = catalog();
    const ids = BASE.map((r) => r.id);
    const invalid = [
      ...BASE.map((r) => ({ id: r.id, missing: validate(r) })).filter((x) => x.missing.length),
      ...ids.filter((id, i) => ids.indexOf(id) !== i).map((id) => ({ id, missing: ["unique id"] })),
    ];
    return { base: BASE.length, custom: all.filter((r) => r.custom).length, invalid, creators: countBy(all, (r) => r.source?.creator ?? "coach") };
  }
  throw new UserError("Usage: recipes <find|show|import|add|remove|list>");
}

const splitList = (v) => (v && v !== true ? String(v).split(",").map((s) => norm(s)).filter(Boolean) : []);
const countBy = (xs, f) => xs.reduce((acc, x) => ({ ...acc, [f(x)]: (acc[f(x)] ?? 0) + 1 }), {});
const words = (r) => [r.title, ...(r.main ?? []), ...(r.ingredients ?? []).map((i) => i.item)].map(norm);
const mentions = (r, term) => words(r).some((w) => w.includes(term));

function recentTitles(n = 20) {
  const file = join(paths.home, "recipes.md");
  if (!existsSync(file)) return [];
  return [...readFileSync(file, "utf8").matchAll(/^## \S+ · (.+)$/gm)].map((m) => norm(m[1])).slice(-n);
}

function hash(s) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function findRecipes(args) {
  const profile = loadProfile();
  const have = splitList(args.with);
  const exclude = [...splitList(args.exclude), ...(profile?.nutrition?.dislikes ?? []).map(norm)];
  const allergies = (profile?.nutrition?.allergies ?? []).map(norm);
  const methods = splitList(args.method);
  const tags = splitList(args.tag);
  const q = splitList(args.q);
  const limit = Number(args.limit ?? 8);
  const recent = new Set(recentTitles());
  const seed = `${isoDay(today())}|${args.seed ?? ""}`;

  const scored = [];
  for (const r of catalog()) {
    const ps = r.perServing ?? {};
    if (methods.length && !(r.methods ?? []).some((m) => methods.includes(norm(m)))) continue;
    if (args["max-kcal"] && ps.kcal > Number(args["max-kcal"])) continue;
    if (args["min-kcal"] && ps.kcal < Number(args["min-kcal"])) continue;
    if (args["min-protein"] && ps.protein < Number(args["min-protein"])) continue;
    if (args["max-minutes"] && r.minutes > Number(args["max-minutes"])) continue;
    if (args.coating && args.coating !== true && norm(r.coating ?? "none") !== norm(args.coating)) continue;
    if (tags.length && !tags.every((t) => (r.tags ?? []).map(norm).includes(t))) continue;
    if (q.length && !q.every((t) => mentions(r, t) || norm(r.cuisine ?? "").includes(t) || norm(r.flavour ?? "").includes(t))) continue;
    if (exclude.some((t) => mentions(r, t))) continue;
    if (allergies.some((a) => (r.allergens ?? []).map(norm).includes(a) || mentions(r, a))) continue;
    if (recent.has(norm(r.title))) continue;
    const mainHits = (r.main ?? []).filter((m) => have.some((h) => norm(m).includes(h) || h.includes(norm(m)))).length;
    const missingMain = (r.main ?? []).length - mainHits;
    if (have.length && args.strict && missingMain > 0) continue;
    const score = have.length ? mainHits * 10 - missingMain * 4 : 0;
    scored.push({ r, score, tie: hash(seed + r.id), missingMain });
  }
  scored.sort((a, b) => b.score - a.score || a.tie - b.tie);

  const picked = [];
  const usedMain = new Map();
  for (const s of scored) {
    if (picked.length >= limit) break;
    const key = norm(s.r.main?.[0] ?? s.r.id);
    if ((usedMain.get(key) ?? 0) >= Math.max(2, Math.ceil(limit / 3))) continue;
    usedMain.set(key, (usedMain.get(key) ?? 0) + 1);
    picked.push(s);
  }
  return {
    matches: scored.length,
    shown: picked.length,
    recipes: picked.map(({ r, missingMain }) => ({
      id: r.id, title: r.title, methods: r.methods, coating: r.coating ?? null, minutes: r.minutes, servings: r.servings,
      perServing: r.perServing, main: r.main, tags: r.tags, flavour: r.flavour, creator: r.source?.creator ?? null,
      ...(have.length ? { missingMain } : {}),
    })),
  };
}

function showRecipe(id) {
  if (!id) throw new UserError("Usage: recipes show <id>");
  const r = catalog().find((x) => x.id === id) ?? catalog().find((x) => norm(x.title) === norm(id));
  if (!r) throw new UserError(`No recipe "${id}". Try: recipes find --q "${id}"`);
  return r;
}

function validate(r) {
  const errors = [];
  if (!r.id || !/^[a-z0-9-]+$/.test(r.id)) errors.push("id (kebab-case)");
  if (!r.title) errors.push("title");
  if (!Array.isArray(r.methods) || !r.methods.length || r.methods.some((m) => !METHODS.includes(m))) errors.push(`methods (${METHODS.join("|")})`);
  if (r.coating != null && !COATINGS.includes(r.coating)) errors.push(`coating (${COATINGS.join("|")} or null)`);
  if (!Array.isArray(r.main) || !r.main.length) errors.push("main");
  if (!Array.isArray(r.ingredients) || !r.ingredients.length) errors.push("ingredients");
  if (!Array.isArray(r.steps) || !r.steps.length) errors.push("steps");
  if (!(r.servings > 0)) errors.push("servings");
  if (!(r.minutes > 0)) errors.push("minutes");
  const ps = r.perServing ?? {};
  if (!["kcal", "protein", "carbs", "fat"].every((k) => Number.isFinite(ps[k]))) errors.push("perServing {kcal, protein, carbs, fat}");
  return errors;
}

function addRecipes(args) {
  if (!args.file || args.file === true) throw new UserError("Usage: recipes add --file <recipe.json> (one recipe or an array)");
  const input = [readJson(args.file, null)].flat().filter(Boolean);
  const custom = readJson(paths.customRecipes, {});
  const saved = [], rejected = [];
  for (const r of input) {
    const errors = validate(r);
    if (errors.length) { rejected.push({ id: r.id ?? null, missing: errors }); continue; }
    const { custom: _, ...clean } = r;
    custom[r.id] = { ...clean, added: isoDay(today()) };
    saved.push(r.id);
  }
  if (saved.length) writeJson(paths.customRecipes, custom);
  return { saved, rejected, file: paths.customRecipes };
}

function removeRecipe(id) {
  const custom = readJson(paths.customRecipes, {});
  if (!custom[id]) throw new UserError(`"${id}" is not one of your saved recipes.`);
  delete custom[id];
  writeJson(paths.customRecipes, custom);
  return { removed: id };
}

async function importRecipes(args) {
  const urls = args.file && args.file !== true
    ? readFileSync(args.file, "utf8").split(/\r?\n/).map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s))
    : args._.slice(1);
  if (!urls.length) throw new UserError("Usage: recipes import <url> [<url>...] | --file urls.txt");
  const known = new Set(catalog().map((r) => r.source?.url).filter(Boolean).map(canonicalUrl));
  const out = [];
  for (let i = 0; i < urls.length; i += 4) {
    out.push(...await Promise.all(urls.slice(i, i + 4).map(async (url) => {
      try {
        const page = await readPage(url);
        return { ...page, alreadyInCatalog: known.has(canonicalUrl(page.url)) };
      } catch (e) {
        return { url, error: e.message };
      }
    })));
  }
  return urls.length === 1 && !args.file ? out[0] : { pages: out.length, ok: out.filter((p) => !p.error).length, results: out };
}

const canonicalUrl = (u) => String(u).replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();

async function fetchText(url) {
  const r = await fetch(url, { headers: { "user-agent": UA, "accept-language": "es-ES,es;q=0.9,en;q=0.8" }, signal: AbortSignal.timeout(20000), redirect: "follow" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return { text: await r.text(), finalUrl: r.url };
}

const decodeEntities = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

const meta = (html, prop) => {
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i"))
    ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, "i"));
  return m ? decodeEntities(m[1]) : null;
};

export function vttToText(vtt) {
  const lines = vtt.split(/\r?\n/).map((l) => l.trim())
    .filter((l) => l && l !== "WEBVTT" && !/-->/.test(l) && !/^\d+$/.test(l) && !/^(NOTE|STYLE|Kind:|Language:)/.test(l))
    .map((l) => l.replace(/<[^>]+>/g, ""));
  return lines.filter((l, i) => l !== lines[i - 1]).join(" ").replace(/\s+/g, " ").trim();
}

function jsonLdRecipe(html) {
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>(.*?)<\/script>/gis)) {
    let data;
    try { data = JSON.parse(m[1]); } catch { continue; }
    const stack = [data].flat();
    while (stack.length) {
      const node = stack.shift();
      if (!node || typeof node !== "object") continue;
      const type = [node["@type"]].flat();
      if (type.includes("Recipe")) {
        const steps = [node.recipeInstructions].flat().filter(Boolean).flatMap((s) => (typeof s === "string" ? [s] : s.itemListElement ? s.itemListElement.map((x) => x.text) : [s.text])).filter(Boolean);
        return { name: node.name, ingredients: node.recipeIngredient ?? [], steps, yield: node.recipeYield ?? null, totalTime: node.totalTime ?? null, nutrition: node.nutrition ?? null };
      }
      if (node["@graph"]) stack.push(...node["@graph"]);
      if (Array.isArray(node)) stack.push(...node);
    }
  }
  return null;
}

export function parseTikTok(html) {
  const m = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)<\/script>/s);
  if (!m) return null;
  const item = JSON.parse(m[1])?.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct;
  if (!item) return null;
  const subs = item.video?.subtitleInfos ?? [];
  const pick = subs.find((s) => /^(es|spa)/i.test(s.LanguageCodeName ?? "") && s.Format === "webvtt")
    ?? subs.find((s) => /^(es|spa)/i.test(s.LanguageCodeName ?? ""))
    ?? subs.find((s) => s.Format === "webvtt") ?? subs[0];
  return {
    platform: "tiktok",
    creator: item.author?.uniqueId ? `@${item.author.uniqueId}` : null,
    creatorName: item.author?.nickname ?? null,
    caption: item.desc ?? "",
    durationSec: item.video?.duration ?? null,
    subtitleUrl: pick?.Url ?? null,
    subtitleLanguage: pick?.LanguageCodeName ?? null,
    subtitleSource: pick?.Source ?? null,
  };
}

async function readPage(url) {
  const { text: html, finalUrl } = await fetchText(url);
  const tiktok = parseTikTok(html);
  if (tiktok) {
    const { subtitleUrl, ...rest } = tiktok;
    let transcript = null;
    if (subtitleUrl) {
      try { transcript = vttToText((await fetchText(subtitleUrl)).text); } catch { transcript = null; }
    }
    return { url: finalUrl, ...rest, transcript, hasRecipeText: hasRecipeText(rest.caption) || hasRecipeText(transcript ?? "") };
  }
  const recipe = jsonLdRecipe(html);
  const host = new URL(finalUrl).hostname.replace(/^www\./, "");
  const caption = meta(html, "og:description") ?? meta(html, "description") ?? "";
  const author = host.includes("instagram.com") ? (caption.match(/-\s*([\w.]+)\s+(?:on|en)\s/)?.[1] ?? finalUrl.match(/instagram\.com\/([\w.]+)\//)?.[1]) : null;
  return {
    url: finalUrl,
    platform: host.includes("instagram.com") ? "instagram" : "web",
    creator: author ? `@${author}` : host,
    title: meta(html, "og:title"),
    caption,
    transcript: null,
    recipe,
    hasRecipeText: Boolean(recipe) || hasRecipeText(caption),
    note: host.includes("instagram.com") && !caption ? "Instagram hid the post without login: ask the user to paste the caption or send screenshots." : undefined,
  };
}

function hasRecipeText(s) {
  const t = norm(s ?? "");
  const cues = ["ingrediente", "gramos", " g ", "cucharad", "minutos", "min ", "grados", "ºc", "°c", "horno", "airfryer", "freidora", "sartén", "sarten", "huevo", "harina", "ingredient", "tbsp", "cup"];
  return cues.filter((c) => t.includes(norm(c))).length >= 3;
}
