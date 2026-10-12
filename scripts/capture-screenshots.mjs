/**
 * Captures portfolio screenshots for key screens (desktop + mobile) and writes
 * them to docs/screenshots/. Run with a local server up:
 *
 *   npm run dev   (in another terminal)
 *   node scripts/capture-screenshots.mjs
 */
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.CAPTURE_BASE_URL ?? "http://127.0.0.1:5173";
const OUT = "docs/screenshots";

const desktop = { width: 1280, height: 800 };
const mobile = { ...devices["iPhone 13"], defaultBrowserType: "chromium" };

function fileName(screen, kind) {
  return `${OUT}/${screen}-${kind}.png`;
}

async function shoot(page, screen, kind) {
  await page.screenshot({ path: fileName(screen, kind), fullPage: false });
  console.log("captured", fileName(screen, kind));
}

async function run() {
  mkdirSync(OUT, { recursive: true });

  // Seed a published public quiz so the gallery/learner screenshots look real.
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.E2E_TEACHER_EMAIL ?? "e2e@easypz.fr", password: process.env.E2E_TEACHER_PASSWORD ?? "e2e-strong-password" }),
  });
  const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
  await fetch(`${BASE}/api/teacher/quizzes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      title: "Irregular verbs — 5e",
      description: "A quick warm-up on the simple past.",
      primaryLanguage: "en",
      level: "A2",
      tags: ["5e", "past-simple"],
      visibility: "public",
      status: "published",
      defaultTimeLimitSeconds: 30,
      showCorrection: true,
      speedScoring: true,
      questions: [{
        type: "multiple_choice",
        prompt: "Choose the past form of go.",
        timeLimitSeconds: 30,
        points: 1000,
        explanation: "Go becomes went.",
        acceptedAnswers: [],
        choices: [
          { label: "went", isCorrect: true },
          { label: "gone", isCorrect: false },
          { label: "goes", isCorrect: false },
          { label: "goed", isCorrect: false },
        ],
      },
      {
        type: "short_answer",
        prompt: "Write the past form of see.",
        timeLimitSeconds: 30,
        points: 1000,
        explanation: "See becomes saw.",
        acceptedAnswers: ["saw"],
        choices: [],
      }],
    }),
  });

  const desktopBrowser = await chromium.launch();
  const mobileBrowser = await chromium.launch();

  // Desktop captures
  const desktopPage = await desktopBrowser.newPage({ viewport: desktop, baseURL: BASE });
  await desktopPage.goto("/");
  await desktopPage.waitForTimeout(800);
  await shoot(desktopPage, "gallery", "desktop");

  // Learner practice screen (opens the first public quiz) + student join screen.
  const quizzes = await (await fetch(`${BASE}/api/public/quizzes`)).json();
  const firstSlug = quizzes.quizzes?.[0]?.slug;
  if (firstSlug) {
    await desktopPage.goto(`/practice/${firstSlug}`);
    await desktopPage.waitForTimeout(900);
    await shoot(desktopPage, "practice", "desktop");
  }
  await desktopPage.goto("/join");
  await desktopPage.waitForTimeout(600);
  await shoot(desktopPage, "join", "desktop");

  // Mobile captures
  const mobilePage = await mobileBrowser.newPage({ ...mobile, baseURL: BASE });
  await mobilePage.goto("/");
  await mobilePage.waitForTimeout(800);
  await shoot(mobilePage, "gallery", "mobile");

  if (firstSlug) {
    await mobilePage.goto(`/practice/${firstSlug}`);
    await mobilePage.waitForTimeout(900);
    await shoot(mobilePage, "practice", "mobile");
  }
  await mobilePage.goto("/join");
  await mobilePage.waitForTimeout(600);
  await shoot(mobilePage, "join", "mobile");

  await desktopBrowser.close();
  await mobileBrowser.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
