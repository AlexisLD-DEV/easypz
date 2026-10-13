import { describe, expect, it, vi } from "vitest";
import { buildSessionResults } from "../../worker/live/results";
import {
  SessionEmailError,
  buildSessionSummaryEmail,
  sendSessionSummaryEmail
} from "../../worker/live/sessionEmail";

const results = buildSessionResults({
  session: {
    id: "session-1",
    quizId: "quiz-1",
    quizTitle: "Irregular verbs <test>",
    code: "ABCD",
    status: "ended",
    createdAt: "2026-05-19 10:00:00",
    startedAt: "2026-05-19 10:01:00",
    endedAt: "2026-05-19 10:05:00"
  },
  questions: [
    { id: "q1", orderIndex: 0, prompt: "Past of go?", points: 1000 },
    { id: "q2", orderIndex: 1, prompt: "Past of eat?", points: 1000 }
  ],
  participants: [
    { id: "p1", displayName: "Lina", score: 1000 },
    { id: "p2", displayName: "Adam", score: 0 },
    { id: "p3", displayName: "Nora", score: 1000 }
  ],
  answers: [
    { participantId: "p1", questionId: "q1", choiceLabel: "went", answerText: null, isCorrect: true, points: 1000, responseMs: 1400 },
    { participantId: "p2", questionId: "q1", choiceLabel: "gone", answerText: null, isCorrect: false, points: 0, responseMs: 3000 },
    { participantId: "p3", questionId: "q1", choiceLabel: "went", answerText: null, isCorrect: true, points: 1000, responseMs: 1600 },
    { participantId: "p1", questionId: "q2", choiceLabel: "eated", answerText: null, isCorrect: false, points: 0, responseMs: 2100 },
    { participantId: "p2", questionId: "q2", choiceLabel: "eated", answerText: null, isCorrect: false, points: 0, responseMs: 2200 },
    { participantId: "p3", questionId: "q2", choiceLabel: "ate", answerText: null, isCorrect: true, points: 1000, responseMs: 1800 }
  ]
});

describe("buildSessionSummaryEmail", () => {
  it("builds a teacher recap with escaped HTML, summary metrics, review points and results link", () => {
    const email = buildSessionSummaryEmail(results, {
      to: "prof@example.org",
      resultsUrl: "https://quiz.example.org/sessions/session-1/results"
    });

    expect(email.to).toBe("prof@example.org");
    expect(email.subject).toBe("Recap EasyPZ - Irregular verbs <test> (ABCD)");
    expect(email.html).toContain("EasyPZ");
    expect(email.html).toContain("Irregular verbs &lt;test&gt;");
    expect(email.html).toContain("3 eleves");
    expect(email.html).toContain("Reussite globale");
    expect(email.html).toContain("Past of eat?");
    expect(email.html).toContain("eated x2");
    expect(email.html).toContain("https://quiz.example.org/sessions/session-1/results");
    expect(email.text).toContain("Participants: 3");
    expect(email.text).toContain("Questions a revoir: 1");
  });
});

describe("sendSessionSummaryEmail", () => {
  it("sends the recap through Resend without exposing the API key to the client", async () => {
    const fetchCalls: Array<[string, RequestInit?]> = [];
    const fetcher = vi.fn(async (input: string, init?: RequestInit) => {
      fetchCalls.push([input, init]);
      return Response.json({ id: "email-123" });
    });
    const email = buildSessionSummaryEmail(results, {
      to: "prof@example.org",
      resultsUrl: "https://quiz.example.org/sessions/session-1/results"
    });

    const response = await sendSessionSummaryEmail({
      apiKey: "re_test_key",
      from: "EasyPZ <noreply@example.org>",
      fetcher
    }, email);

    expect(response).toEqual({ id: "email-123" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetchCalls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer re_test_key",
      "Content-Type": "application/json"
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      from: "EasyPZ <noreply@example.org>",
      to: ["prof@example.org"],
      subject: "Recap EasyPZ - Irregular verbs <test> (ABCD)"
    });
  });

  it("throws a clear configuration error when Resend is not configured", async () => {
    const email = buildSessionSummaryEmail(results, {
      to: "prof@example.org",
      resultsUrl: "https://quiz.example.org/sessions/session-1/results"
    });

    await expect(sendSessionSummaryEmail({ apiKey: "", from: "", fetcher: vi.fn() }, email))
      .rejects.toEqual(new SessionEmailError("email_not_configured"));
  });
});
