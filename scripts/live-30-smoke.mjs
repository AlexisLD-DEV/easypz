import WebSocket from "ws";

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:5173").replace(/\/$/, "");
const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD;
let cookie = process.env.SMOKE_COOKIE ?? "";

if (!cookie && (!email || !password)) {
  throw new Error("Set SMOKE_EMAIL and SMOKE_PASSWORD, or set SMOKE_COOKIE.");
}

const startedAt = Date.now();
const openClients = [];

try {
  if (!cookie) {
    cookie = await login();
  }

  const quiz = await createSmokeQuiz();
  const session = await api(`/api/teacher/quizzes/${encodeURIComponent(quiz.id)}/live-sessions`, {
    method: "POST",
    body: {}
  });

  const teacher = await openSocket(`/api/live/sessions/${encodeURIComponent(session.id)}/socket?role=teacher`, "teacher");
  openClients.push(teacher);
  const students = [];
  for (let index = 0; index < 30; index += 1) {
    const displayName = `Student ${String(index + 1).padStart(2, "0")}`;
    const joined = await api(`/api/live/${encodeURIComponent(session.code)}/join`, {
      method: "POST",
      body: { displayName }
    });
    const student = await openSocket(
      `/api/live/sessions/${encodeURIComponent(session.id)}/socket?role=student&participantId=${encodeURIComponent(joined.participantId)}&participantToken=${encodeURIComponent(joined.participantToken)}`,
      displayName
    );
    students.push(student);
    openClients.push(student);
  }

  await waitForMessage(teacher, (message) => message.type === "state" && message.participantCount === 30, 45_000, "teacher state with 30 participants");
  teacher.ws.send(JSON.stringify({ type: "teacher:start" }));
  const questionMessage = await waitForMessage(teacher, (message) => message.type === "question", 45_000, "teacher question message");
  const correctChoice = questionMessage.question.choices.find((choice) => choice.label === "went") ?? questionMessage.question.choices[0];

  const accepted = students.map((student) => waitForMessage(student, (message) => message.type === "answer:accepted", 45_000, `${student.name} accepted answer`));
  await sleep(Math.max(0, questionMessage.startedAt + 800 - Date.now()));
  students.forEach((student, index) => {
    student.ws.send(JSON.stringify({
      type: "student:answer",
      questionId: questionMessage.question.id,
      choiceId: correctChoice.id,
      sentAt: Date.now() + index * 50
    }));
  });
  await Promise.all(accepted);
  await waitForMessage(teacher, (message) => message.type === "state" && message.answerCount === 30, 45_000, "teacher state with 30 answers");

  teacher.ws.send(JSON.stringify({ type: "teacher:reveal" }));
  await waitForMessage(teacher, (message) => message.type === "reveal", 45_000, "teacher reveal message");
  teacher.ws.send(JSON.stringify({ type: "teacher:end" }));
  await waitForMessage(teacher, (message) => message.type === "ended", 45_000, "teacher ended message");

  const resultsResponse = await api(`/api/teacher/live-sessions/${encodeURIComponent(session.id)}/results`, { method: "GET" });
  const results = resultsResponse.results;
  const csvResponse = await fetch(`${baseUrl}/api/teacher/live-sessions/${encodeURIComponent(session.id)}/export.csv`, {
    headers: { Cookie: cookie }
  });
  const csv = await csvResponse.text();
  if (!csvResponse.ok) throw new Error(`CSV export failed with HTTP ${csvResponse.status}: ${csv}`);

  assert(results.summary.participantCount === 30, `Expected 30 participants, got ${results.summary.participantCount}`);
  assert(results.summary.answerCount === 30, `Expected 30 answers, got ${results.summary.answerCount}`);
  assert(results.participants.length === 30, `Expected 30 result rows, got ${results.participants.length}`);
  assert(csv.split("\n").length === 31, "Expected CSV header plus 30 answer rows.");
  assert(results.participants[0].score >= results.participants.at(-1).score, "Leaderboard is not sorted by score.");

  closeSockets(openClients);
  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    sessionId: session.id,
    code: session.code,
    participantCount: results.summary.participantCount,
    answerCount: results.summary.answerCount,
    averageScore: results.summary.averageScore,
    durationMs: Date.now() - startedAt
  }, null, 2));
} catch (error) {
  closeSockets(openClients);
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Login failed with HTTP ${response.status}: ${body}`);
  const setCookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  const nextCookie = setCookies.map((value) => value.split(";")[0]).join("; ");
  if (!nextCookie) throw new Error("Login succeeded but no session cookie was exposed. Set SMOKE_COOKIE manually.");
  return nextCookie;
}

async function createSmokeQuiz() {
  const title = `Live 30 smoke ${new Date().toISOString()}`;
  return api("/api/teacher/quizzes", {
    method: "POST",
    body: {
      title,
      description: "Automated 30 student live smoke test.",
      primaryLanguage: "en",
      level: "A2",
      tags: ["smoke", "live30"],
      visibility: "private",
      status: "draft",
      defaultTimeLimitSeconds: 30,
      showCorrection: true,
      speedScoring: true,
      questions: [{
        type: "multiple_choice",
        prompt: "Choose the past form of go.",
        timeLimitSeconds: 30,
        points: 1000,
        explanation: "Go becomes went in the simple past.",
        acceptedAnswers: [],
        choices: [
          { label: "went", isCorrect: true },
          { label: "gone", isCorrect: false },
          { label: "goes", isCorrect: false },
          { label: "goed", isCorrect: false }
        ]
      }]
    }
  });
}

async function api(path, options) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${options.method} ${path} failed with HTTP ${response.status}: ${text}`);
  }
  return body;
}

async function openSocket(path, name) {
  const url = `${baseUrl}${path}`.replace(/^http/, "ws");
  const ws = new WebSocket(url, cookie ? { headers: { Cookie: cookie } } : undefined);
  const messages = [];
  ws.addEventListener("message", (event) => {
    messages.push(JSON.parse(event.data));
  });
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  return { name, ws, messages };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForMessage(client, predicate, timeoutMs, label) {
  const existing = client.messages.find(predicate);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setTimeout(() => {
      clearInterval(interval);
      reject(new Error(`Timed out waiting for ${label} after ${timeoutMs}ms. Recent ${client.name} messages: ${JSON.stringify(client.messages.slice(-5))}`));
    }, timeoutMs);

    const interval = setInterval(() => {
      const message = client.messages.find(predicate);
      if (!message) return;
      clearTimeout(timer);
      clearInterval(interval);
      resolve(message);
    }, Math.min(100, Math.max(20, Math.floor((timeoutMs - (Date.now() - started)) / 100))));
  });
}

function closeSockets(clients) {
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) client.ws.close();
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
