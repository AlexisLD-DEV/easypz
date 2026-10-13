/** Capture portfolio screens from the local app and local D1 only. */
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const BASE = process.env.CAPTURE_BASE_URL ?? "http://127.0.0.1:5173";
const OUT = "docs/screenshots";
const desktop = { width: 1280, height: 800 };
const mobile = { ...devices["iPhone 13"], defaultBrowserType: "chromium" };

function ensureLocalBase() {
  let url;
  try {
    url = new URL(BASE);
  } catch {
    throw new Error(`CAPTURE_BASE_URL invalide : ${BASE}`);
  }
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
    throw new Error(`Capture refusée : l’hôte ${url.hostname} n’est pas local (127.0.0.1 ou localhost requis).`);
  }
}

function removeTestQuizzes() {
  const sql = `DELETE FROM quizzes
    WHERE lower(title) LIKE '%e2e%' OR lower(title) LIKE '%playwright%'
       OR lower(tags_json) LIKE '%e2e%' OR lower(tags_json) LIKE '%playwright%'
    RETURNING title;`;
  const result = spawnSync("npx", ["wrangler", "d1", "execute", "quiz_english", "--local", "--command", sql], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Nettoyage D1 locale impossible. ${result.stderr || result.stdout}`);
  const removed = [...result.stdout.matchAll(/"title"\s*:\s*"([^"]*)"/g)].map((match) => match[1]);
  if (removed.length) console.log(`Quiz de test retirés (${removed.length}) : ${removed.join(", ")}`);
  else console.log("Quiz de test retirés : aucun quiz E2E/playwright présent.");
}

async function shoot(page, screen, kind, fullPage = false) {
  const path = `${OUT}/${screen}-${kind}.png`;
  await page.screenshot({ path, fullPage });
  console.log("captured", path);
}

async function reportGallery(page, kind) {
  const cards = await page.locator(".quiz-grid .public-quiz-card").evaluateAll((elements) => elements.map((card) => ({
    title: card.querySelector("h2")?.textContent?.trim() ?? "(sans titre)",
    src: card.querySelector(".quiz-cover-image")?.getAttribute("src") ?? "(aucune vignette)"
  })));
  if (cards.length < 6) throw new Error(`Galerie ${kind} : ${cards.length} quiz affiché(s), six requis.`);
  if (new Set(cards.slice(0, 6).map((card) => card.src)).size < 6) throw new Error(`Galerie ${kind} : les six premières vignettes ne sont pas distinctes.`);
  console.log(`Vignettes galerie ${kind} :`);
  for (const card of cards) console.log(`  ${card.title} → ${card.src}`);
}

async function prepareGallery(page, kind) {
  await page.locator(".quiz-grid .public-quiz-card").first().waitFor();
  await page.waitForTimeout(500);
  await page.locator(".quiz-cover-image").evaluateAll((images) => images.forEach((image) => { image.loading = "eager"; }));
  await page.waitForFunction(() => [...document.querySelectorAll(".quiz-cover-image")].every((image) => image.complete && image.naturalWidth > 0));
  await reportGallery(page, kind);
}

async function run() {
  ensureLocalBase();
  removeTestQuizzes();
  mkdirSync(OUT, { recursive: true });

  const response = await fetch(`${BASE}/api/public/quizzes`);
  if (!response.ok) throw new Error(`Impossible de charger les quiz locaux : HTTP ${response.status}`);
  const data = await response.json();
  const quizzes = data.quizzes ?? [];
  if (quizzes.length < 6) throw new Error(`Il faut au moins 6 quiz publics importés, seulement ${quizzes.length} trouvé(s).`);
  const titles = quizzes.map((quiz) => `${quiz.title} ${quiz.tags_json ?? ""}`).join(" ");
  if (/e2e|playwright/i.test(titles)) throw new Error("Des données E2E/playwright restent dans la galerie après nettoyage.");
  const firstSlug = quizzes[0]?.slug;
  if (!firstSlug) throw new Error("Aucun quiz public local utilisable pour la page practice.");

  const desktopBrowser = await chromium.launch();
  const mobileBrowser = await chromium.launch();
  try {
    const desktopPage = await desktopBrowser.newPage({ viewport: desktop, baseURL: BASE });
    await desktopPage.goto("/");
    await prepareGallery(desktopPage, "desktop");
    await shoot(desktopPage, "gallery", "desktop", true);
    await desktopPage.goto(`/practice/${firstSlug}`);
    await desktopPage.waitForTimeout(900);
    await shoot(desktopPage, "practice", "desktop");
    await desktopPage.goto("/join");
    await desktopPage.waitForTimeout(600);
    await shoot(desktopPage, "join", "desktop");

    const mobilePage = await mobileBrowser.newPage({ ...mobile, baseURL: BASE });
    await mobilePage.goto("/");
    await prepareGallery(mobilePage, "mobile");
    await shoot(mobilePage, "gallery", "mobile", true);
    await mobilePage.goto(`/practice/${firstSlug}`);
    await mobilePage.waitForTimeout(900);
    await shoot(mobilePage, "practice", "mobile", true);
    await mobilePage.goto("/join");
    await mobilePage.waitForTimeout(600);
    await shoot(mobilePage, "join", "mobile");
  } finally {
    await desktopBrowser.close();
    await mobileBrowser.close();
  }
}

run().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
