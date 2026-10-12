import { describe, expect, it } from "vitest";
import { buildSessionResults, sessionResultsToCsv } from "../../worker/live/results";

const input = {
  session: {
    id: "session-1",
    quizId: "quiz-1",
    quizTitle: "Irregular verbs",
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
    { id: "p1", displayName: "Lina", score: 950 },
    { id: "p2", displayName: "Adam", score: 0 }
  ],
  answers: [
    {
      participantId: "p1",
      questionId: "q1",
      choiceLabel: "went",
      answerText: null,
      isCorrect: true,
      points: 950,
      responseMs: 1400
    },
    {
      participantId: "p2",
      questionId: "q1",
      choiceLabel: "gone",
      answerText: null,
      isCorrect: false,
      points: 0,
      responseMs: 3000
    }
  ]
};

describe("buildSessionResults", () => {
  it("summarizes participant scores and per-question answers", () => {
    const results = buildSessionResults(input);

    expect(results.summary).toEqual({
      participantCount: 2,
      questionCount: 2,
      answerCount: 2,
      averageScore: 475
    });
    expect(results.participants[0]).toMatchObject({
      displayName: "Lina",
      score: 950,
      correctAnswers: 1,
      answeredCount: 1
    });
    expect(results.participants[0].answers).toHaveLength(2);
    expect(results.participants[0].answers[0]).toMatchObject({
      questionNumber: 1,
      prompt: "Past of go?",
      answer: "went",
      isCorrect: true,
      points: 950
    });
    expect(results.participants[0].answers[1]).toMatchObject({
      questionNumber: 2,
      answer: "",
      isCorrect: false,
      points: 0
    });
  });

  it("builds class analysis with success rates and frequent mistakes", () => {
    const results = buildSessionResults({
      ...input,
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
        {
          participantId: "p1",
          questionId: "q1",
          choiceLabel: "went",
          answerText: null,
          isCorrect: true,
          points: 1000,
          responseMs: 1400
        },
        {
          participantId: "p2",
          questionId: "q1",
          choiceLabel: "gone",
          answerText: null,
          isCorrect: false,
          points: 0,
          responseMs: 3000
        },
        {
          participantId: "p1",
          questionId: "q2",
          choiceLabel: "eated",
          answerText: null,
          isCorrect: false,
          points: 0,
          responseMs: 2100
        },
        {
          participantId: "p2",
          questionId: "q2",
          choiceLabel: "eated",
          answerText: null,
          isCorrect: false,
          points: 0,
          responseMs: 2200
        },
        {
          participantId: "p3",
          questionId: "q2",
          choiceLabel: "ate",
          answerText: null,
          isCorrect: true,
          points: 1000,
          responseMs: 1800
        }
      ]
    });

    expect(results.analysis).toEqual({
      totalPossibleAnswers: 6,
      completionPercent: 83,
      accuracyPercent: 33,
      questionsToReviewCount: 2,
      questionStats: [
        {
          questionId: "q1",
          questionNumber: 1,
          prompt: "Past of go?",
          answerCount: 2,
          correctCount: 1,
          incorrectCount: 1,
          unansweredCount: 1,
          accuracyPercent: 33,
          needsReview: true,
          frequentMistakes: [{ answer: "gone", count: 1 }]
        },
        {
          questionId: "q2",
          questionNumber: 2,
          prompt: "Past of eat?",
          answerCount: 3,
          correctCount: 1,
          incorrectCount: 2,
          unansweredCount: 0,
          accuracyPercent: 33,
          needsReview: true,
          frequentMistakes: [{ answer: "eated", count: 2 }]
        }
      ]
    });
  });
});

describe("sessionResultsToCsv", () => {
  it("exports one row per participant and question with escaped values", () => {
    const csv = sessionResultsToCsv(buildSessionResults(input));

    expect(csv.split("\n")[0]).toBe("Eleve,Score,Bonnes reponses,Question,Enonce,Reponse,Correct,Points,Temps ms");
    expect(csv).toContain('"Lina",950,1,1,"Past of go?","went","oui",950,1400');
    expect(csv).toContain('"Adam",0,0,2,"Past of eat?","","non",0,');
  });
});
