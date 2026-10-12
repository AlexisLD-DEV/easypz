export type SessionResultStatus = "lobby" | "question" | "reveal" | "ended" | string;

export type SessionResultsInput = {
  session: {
    id: string;
    quizId: string;
    quizTitle: string;
    code: string;
    status: SessionResultStatus;
    createdAt: string;
    startedAt: string | null;
    endedAt: string | null;
  };
  questions: Array<{
    id: string;
    orderIndex: number;
    prompt: string;
    points: number;
  }>;
  participants: Array<{
    id: string;
    displayName: string;
    score: number;
  }>;
  answers: Array<{
    participantId: string;
    questionId: string;
    choiceLabel: string | null;
    answerText: string | null;
    isCorrect: boolean;
    points: number;
    responseMs: number;
  }>;
};

export type SessionResults = ReturnType<typeof buildSessionResults>;

export function buildSessionResults(input: SessionResultsInput) {
  const orderedQuestions = [...input.questions].sort((left, right) => left.orderIndex - right.orderIndex);
  const answerByParticipantAndQuestion = new Map(
    input.answers.map((answer) => [`${answer.participantId}:${answer.questionId}`, answer])
  );
  const analysis = buildClassAnalysis(orderedQuestions, input.participants, answerByParticipantAndQuestion);
  const participants = [...input.participants]
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.displayName.localeCompare(right.displayName, "fr");
    })
    .map((participant) => {
      const answers = orderedQuestions.map((question, index) => {
        const answer = answerByParticipantAndQuestion.get(`${participant.id}:${question.id}`);
        return {
          questionId: question.id,
          questionNumber: index + 1,
          prompt: question.prompt,
          answer: answer ? answerLabel(answer) : "",
          isCorrect: answer?.isCorrect ?? false,
          points: answer?.points ?? 0,
          responseMs: answer?.responseMs ?? null
        };
      });
      return {
        id: participant.id,
        displayName: participant.displayName,
        score: participant.score,
        correctAnswers: answers.filter((answer) => answer.isCorrect).length,
        answeredCount: answers.filter((answer) => answer.answer.length > 0).length,
        answers
      };
    });

  return {
    session: input.session,
    summary: {
      participantCount: participants.length,
      questionCount: orderedQuestions.length,
      answerCount: input.answers.length,
      averageScore: participants.length
        ? Math.round(participants.reduce((total, participant) => total + participant.score, 0) / participants.length)
        : 0
    },
    questions: orderedQuestions.map((question, index) => ({
      id: question.id,
      questionNumber: index + 1,
      prompt: question.prompt,
      points: question.points
    })),
    analysis,
    participants
  };
}

function buildClassAnalysis(
  orderedQuestions: SessionResultsInput["questions"],
  participants: SessionResultsInput["participants"],
  answerByParticipantAndQuestion: Map<string, SessionResultsInput["answers"][number]>
) {
  const totalPossibleAnswers = participants.length * orderedQuestions.length;
  let completedAnswerCount = 0;
  let correctAnswerCount = 0;

  const questionStats = orderedQuestions.map((question, index) => {
    const answers = participants
      .map((participant) => answerByParticipantAndQuestion.get(`${participant.id}:${question.id}`))
      .filter((answer): answer is SessionResultsInput["answers"][number] => Boolean(answer));
    const correctCount = answers.filter((answer) => answer.isCorrect).length;
    const incorrectCount = answers.filter((answer) => !answer.isCorrect).length;
    completedAnswerCount += answers.length;
    correctAnswerCount += correctCount;

    const accuracyPercent = participants.length ? percent(correctCount, participants.length) : 0;
    return {
      questionId: question.id,
      questionNumber: index + 1,
      prompt: question.prompt,
      answerCount: answers.length,
      correctCount,
      incorrectCount,
      unansweredCount: Math.max(0, participants.length - answers.length),
      accuracyPercent,
      needsReview: participants.length > 0 && accuracyPercent < 60,
      frequentMistakes: frequentMistakes(answers)
    };
  });

  return {
    totalPossibleAnswers,
    completionPercent: totalPossibleAnswers ? percent(completedAnswerCount, totalPossibleAnswers) : 0,
    accuracyPercent: totalPossibleAnswers ? percent(correctAnswerCount, totalPossibleAnswers) : 0,
    questionsToReviewCount: questionStats.filter((question) => question.needsReview).length,
    questionStats
  };
}

function frequentMistakes(answers: SessionResultsInput["answers"]) {
  const byNormalizedAnswer = new Map<string, { answer: string; count: number }>();
  for (const answer of answers) {
    if (answer.isCorrect) continue;
    const label = answerLabel(answer).trim();
    if (!label) continue;
    const key = label.toLocaleLowerCase("fr");
    const current = byNormalizedAnswer.get(key);
    if (current) {
      current.count += 1;
    } else {
      byNormalizedAnswer.set(key, { answer: label, count: 1 });
    }
  }

  return [...byNormalizedAnswer.values()]
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return left.answer.localeCompare(right.answer, "fr");
    })
    .slice(0, 3);
}

function percent(value: number, total: number) {
  return Math.round((value / total) * 100);
}

function answerLabel(answer: SessionResultsInput["answers"][number]) {
  return answer.choiceLabel ?? answer.answerText ?? "";
}

export function sessionResultsToCsv(results: SessionResults) {
  const lines = ["Eleve,Score,Bonnes reponses,Question,Enonce,Reponse,Correct,Points,Temps ms"];
  for (const participant of results.participants) {
    for (const answer of participant.answers) {
      lines.push([
        participant.displayName,
        String(participant.score),
        String(participant.correctAnswers),
        String(answer.questionNumber),
        answer.prompt,
        answer.answer,
        answer.isCorrect ? "oui" : "non",
        String(answer.points),
        answer.responseMs === null ? "" : String(answer.responseMs)
      ].map(csvCell).join(","));
    }
  }
  return lines.join("\n");
}

function csvCell(value: string) {
  if (/^-?\d+(\.\d+)?$/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}
