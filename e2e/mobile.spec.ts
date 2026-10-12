import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const TEACHER_EMAIL = process.env.E2E_TEACHER_EMAIL ?? "e2e@easypz.fr";
const TEACHER_PASSWORD = process.env.E2E_TEACHER_PASSWORD ?? "e2e-strong-password";
const BASE = "http://127.0.0.1:5173";

let sessionCookie = "";

async function loginAsTeacher(request: APIRequestContext) {
  if (sessionCookie) return; // reuse the module-scoped session across tests in this worker
  const response = await request.post("/api/auth/login", { data: { email: TEACHER_EMAIL, password: TEACHER_PASSWORD } });
  expect(response.ok()).toBeTruthy();
  sessionCookie = (response.headers()["set-cookie"] ?? "").split(";")[0];
  expect(sessionCookie).toContain("qe_session=");
}

async function createPublishedQuiz(request: APIRequestContext, title: string) {
  const response = await request.post("/api/teacher/quizzes", {
    headers: { Cookie: sessionCookie },
    data: {
      title,
      description: "Automated mobile E2E quiz.",
      primaryLanguage: "en",
      level: "A2",
      tags: ["mobile-e2e"],
      visibility: "public",
      status: "published",
      defaultTimeLimitSeconds: 60,
      showCorrection: true,
      speedScoring: false,
      questions: [
        {
          type: "multiple_choice",
          prompt: "Choose the past form of go.",
          timeLimitSeconds: 60,
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
      ],
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { slug: string };
}

// Detects horizontal overflow on a page (common mobile bug when a fixed-width
// element is wider than the viewport).
async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth ? doc.scrollWidth - doc.clientWidth : 0;
  });
  expect(overflow, `${label} has horizontal overflow of ${overflow}px`).toBe(0);
}

test.describe("Mobile experience (applies to every student device)", () => {
  test("key screens fit the viewport without horizontal overflow", async ({ page }) => {
    // Gallery (public, no login needed).
    await page.goto("/");
    await expectNoHorizontalOverflow(page, "gallery");
    await expect(page.locator("main")).toBeVisible();

    // Login screen.
    await page.goto("/login");
    await expectNoHorizontalOverflow(page, "login");
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // Join screen (the main student entry point).
    await page.goto("/join");
    await expectNoHorizontalOverflow(page, "join");
    await expect(page.locator("form")).toBeVisible();
  });

  test("a learner can complete a public quiz on a phone viewport", async ({ page, request }) => {
    await loginAsTeacher(request);
    const title = `Mobile Q ${Date.now()}`;
    const { slug } = await createPublishedQuiz(request, title);

    await page.goto(`/practice/${slug}`);
    await expectNoHorizontalOverflow(page, "practice");
    await expect(page.locator(".answer-tile", { hasText: "went" })).toBeVisible();

    await page.locator(".answer-tile", { hasText: "went" }).click();
    await expect(page.locator(".practice-feedback.feedback-good")).toBeVisible();

    await page.locator("button", { hasText: /Next question|See result|Question suivante|Voir le résultat/i }).click();
    await expect(page.locator(".practice-score")).toContainText("1 / 1");
    await expectNoHorizontalOverflow(page, "practice result");
  });

  test("a student can join and answer a live session on a phone viewport", async ({ page, request, browser }) => {
    await loginAsTeacher(request);

    // Create a live session via the teacher API.
    const title = `Mobile live ${Date.now()}`;
    await createPublishedQuiz(request, title);
    const quizzes = ((await (await request.get("/api/teacher/quizzes", { headers: { Cookie: sessionCookie } })).json()).quizzes) as Array<{ id: string; title: string }>;
    const quiz = quizzes.find((q) => q.title === title)!;
    const resp = await request.post(`/api/teacher/quizzes/${quiz.id}/live-sessions`, { headers: { Cookie: sessionCookie } });
    expect(resp.ok()).toBeTruthy();
    const live = (await resp.json()) as { id: string; code: string };

    // Teacher room in a separate desktop context (mobile student is the main page).
    const teacherContext = await browser.newContext({ baseURL: BASE });
    await teacherContext.addCookies([{ name: "qe_session", value: sessionCookie.split("=")[1], domain: "127.0.0.1", path: "/" }]);
    const teacherPage = await teacherContext.newPage();
    await teacherPage.goto(`/live/teacher/${live.id}`);
    await expect(teacherPage.getByRole("button", { name: /Démarrer la question|Start question/ })).toBeEnabled({ timeout: 20_000 });

    // Student joins from the (mobile) page and answers.
    await page.goto(`/join/${live.code}`);
    const inputs = page.locator(".auth-panel input");
    await inputs.nth(0).fill(live.code);
    await inputs.nth(1).fill("Mobi");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/live\/student\//, { timeout: 20_000 });
    await expectNoHorizontalOverflow(page, "live student waiting");

    // Start the question, the student answers (first tile = correct "went").
    await teacherPage.getByRole("button", { name: /Démarrer la question|Start question/ }).click();
    await page.locator(".answer-grid button").first().click();
    await expect(page.locator(".student-feedback.feedback-good").first()).toBeVisible({ timeout: 15_000 });
    await expectNoHorizontalOverflow(page, "live student answered");

    await teacherContext.close();
  });
});
