import { expect, test, type APIRequestContext } from "@playwright/test";

const TEACHER_EMAIL = process.env.E2E_TEACHER_EMAIL ?? "e2e@easypz.fr";
const TEACHER_PASSWORD = process.env.E2E_TEACHER_PASSWORD ?? "e2e-strong-password";

let sessionCookie = "";

/**
 * Logs in over the API and captures the session cookie shared by subsequent
 * teacher API calls in the suite.
 */
async function loginAsTeacher(request: APIRequestContext) {
  if (sessionCookie) return; // reuse the module-scoped session across tests in this worker
  const response = await request.post("/api/auth/login", {
    data: { email: TEACHER_EMAIL, password: TEACHER_PASSWORD },
  });
  expect(response.ok()).toBeTruthy();
  const setCookies = response.headers()["set-cookie"] ?? "";
  sessionCookie = setCookies.split(";")[0];
  expect(sessionCookie).toContain("qe_session=");
}

/** Creates a published public quiz with one multiple-choice question. */
async function createPublishedQuiz(request: APIRequestContext, title: string, examMode = false) {
  const response = await request.post("/api/teacher/quizzes", {
    headers: { Cookie: sessionCookie },
    data: {
      title,
      description: "Automated Playwright E2E quiz.",
      primaryLanguage: "en",
      level: "A2",
      tags: ["playwright", "e2e"],
      visibility: "public",
      status: "published",
      defaultTimeLimitSeconds: 60,
      showCorrection: true,
      speedScoring: false,
      examMode,
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

test.describe("Teacher → public gallery → learner (E2E)", () => {
  test("a published quiz appears in the gallery and is playable end to end", async ({ request, page }) => {
    // Seed a published quiz via the teacher API.
    await loginAsTeacher(request);
    const title = `My E2E ${Date.now()}`;
    const { slug } = await createPublishedQuiz(request, title);

    // Open the public gallery in the browser and confirm the new quiz is listed.
    await page.goto("/");
    // The published quiz appears in the gallery; open it via its Practice button.
    await expect(page.locator(`a[href*="${slug}"]`).first()).toBeVisible();
    await page.locator(`.public-quiz-card a.button-link[href*="${slug}"]`).click();

    // The learner lands on the practice screen and can answer the QCM.
    await expect(page.locator("text=Choose the past form of go.")).toBeVisible();
    await page.locator(".answer-tile", { hasText: "went" }).click();
    await expect(page.locator(".practice-feedback.feedback-good")).toBeVisible();

    // Move through the result and confirm the score of 1/1.
    await page.locator("button", { hasText: /Next question|See result|Question suivante|Voir le résultat/i }).click();
    await expect(page.locator(".practice-score")).toContainText("1 / 1");
  });

  test("login flow authenticates the seeded teacher", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(TEACHER_EMAIL);
    await page.locator('input[type="password"]').fill(TEACHER_PASSWORD);
    await page.locator('button[type="submit"]').click();
    // After login the app leaves the login page and shows teacher navigation.
    await expect(page).not.toHaveURL(/\/login$/, { timeout: 15_000 });
    await expect(page.locator('a.nav-link[href="/dashboard"]').first()).toBeVisible();
  });

  test("exam mode hides the correction until the final score", async ({ page, request }) => {
    await loginAsTeacher(request);
    const title = `Exam E2E ${Date.now()}`;
    const { slug } = await createPublishedQuiz(request, title, true);

    await page.goto(`/practice/${slug}`);
    await expect(page.locator("text=Choose the past form of go.")).toBeVisible();
    // Exam mode shows a global countdown (questions × default time limit).
    await expect(page.locator(".practice-countdown")).toBeVisible();
    await page.locator(".answer-tile", { hasText: "went" }).click();

    // The learner still gets correct/incorrect feedback, but no correction text.
    await expect(page.locator(".practice-feedback.feedback-good")).toBeVisible();
    await expect(page.locator(".practice-correction-card")).not.toBeVisible();

    // Move to the result: only the score is shown, no review list.
    await page.locator("button", { hasText: /Next question|See result|Question suivante|Voir le résultat/i }).click();
    await expect(page.locator(".practice-score")).toContainText("1 / 1");
    await expect(page.locator(".practice-review-list")).not.toBeVisible();
  });

  test("a live session is joinable, answerable, and surfaced in class analytics", async ({ page, request, browser }) => {
    await loginAsTeacher(request);

    // 1. Create a quiz, then a live session from its id via the teacher API.
    const title = `Live E2E ${Date.now()}`;
    await createPublishedQuiz(request, title);
    const quizzesRes = await request.get("/api/teacher/quizzes", { headers: { Cookie: sessionCookie } });
    const quizzes = (await quizzesRes.json()).quizzes as Array<{ id: string; title: string }>;
    const quiz = quizzes.find((q) => q.title === title);
    expect(quiz).toBeTruthy();

    const resp = await request.post(`/api/teacher/quizzes/${quiz!.id}/live-sessions`, {
      headers: { Cookie: sessionCookie },
    });
    expect(resp.ok()).toBeTruthy();
    const live = (await resp.json()) as { id: string; code: string };

    // 2. Teacher room in its own browser context.
    const teacherContext = await browser.newContext({ baseURL: "http://127.0.0.1:5173" });
    await teacherContext.addCookies([{ name: "qe_session", value: sessionCookie.split("=")[1], domain: "127.0.0.1", path: "/" }]);
    const teacherPage = await teacherContext.newPage();
    await teacherPage.goto(`/live/teacher/${live.id}`);
    await expect(teacherPage.locator("text=/Démarrer la question|Start question/")).toBeEnabled({ timeout: 20_000 });

    // 3. Student joins via the join page (code field then name field) and answers.
    await page.goto(`/join/${live.code}`);
    const joinInputs = page.locator(".auth-panel input");
    await joinInputs.nth(0).fill(live.code);
    await joinInputs.nth(1).fill("Alice");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/live\/student\//, { timeout: 20_000 });

    // Start the question from the teacher side.
    await teacherPage.locator("button", { hasText: /Démarrer la question|Start question/ }).click();

    // The student sees the QCM and answers with the correct (first) choice.
    await page.locator(".answer-grid button").first().waitFor({ timeout: 20_000 });
    await page.locator(".answer-grid button").first().click();
    await expect(page.locator(".student-feedback.feedback-good").first()).toBeVisible({ timeout: 15_000 });

    // 4. The class analytics panel on the dashboard lists the quiz/session.
    await teacherPage.goto("/dashboard");
    // Wait for the dashboard body to mount, then the analytics data to arrive.
    await expect(teacherPage.locator(".analytics-panel")).toBeVisible({ timeout: 20_000 });
    await expect(teacherPage.locator(".analytics-table").first()).toContainText("alice", { timeout: 20_000 });

    await teacherContext.close();
  });
});
