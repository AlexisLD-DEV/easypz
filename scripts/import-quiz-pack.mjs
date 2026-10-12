import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const packPath = args.find((arg) => !arg.startsWith("--"));
const useRemote = args.includes("--remote");
const dryRun = args.includes("--dry-run");

if (!packPath) {
  console.error("Usage: node scripts/import-quiz-pack.mjs <pack.json> [--remote|--local] [--dry-run]");
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pack = JSON.parse(readFileSync(resolve(root, packPath), "utf8"));
const ownerEmail = pack.ownerEmail ?? "alexis@ledeunf.fr";
const nowSql = "CURRENT_TIMESTAMP";
const statements = [
  "PRAGMA foreign_keys = ON;"
];

for (const quiz of pack.quizzes ?? []) {
  appendQuiz(statements, ownerEmail, quiz);
}

const sql = `${statements.join("\n")}\n`;
if (dryRun) {
  process.stdout.write(sql);
  process.exit(0);
}

const tmpDir = resolve(root, ".tmp");
mkdirSync(tmpDir, { recursive: true });
const sqlPath = resolve(tmpDir, `quiz-pack-${Date.now()}.sql`);
writeFileSync(sqlPath, sql);

const wranglerArgs = ["wrangler", "d1", "execute", "quiz_english", useRemote ? "--remote" : "--local", "--file", relative(root, sqlPath)];
const result = spawnSync("npx", wranglerArgs, {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32"
});
rmSync(sqlPath, { force: true });
process.exit(result.status ?? 1);

function appendQuiz(output, ownerEmail, quiz) {
  const quizId = stableId("quiz", quiz.slug);
  const tags = quiz.tags ?? [];
  const questions = quiz.questions ?? [];
  const fingerprints = questions.map((question) => questionBankFingerprint(toQuestionInput(question)));

  output.push(`DELETE FROM quizzes WHERE slug = ${sqlValue(quiz.slug)};`);
  if (fingerprints.length > 0) {
    output.push(`DELETE FROM question_bank_items WHERE owner_id = (SELECT id FROM users WHERE email = ${sqlValue(ownerEmail)}) AND fingerprint IN (${fingerprints.map(sqlValue).join(", ")});`);
  }
  output.push(
    `INSERT INTO quizzes (id, owner_id, title, description, primary_language, level, tags_json, visibility, status, slug, secret_token, default_time_limit_seconds, show_correction, speed_scoring, published_at)
     SELECT ${sqlValue(quizId)}, users.id, ${sqlValue(quiz.title)}, ${sqlValue(quiz.description ?? "")}, 'en', ${sqlValue(quiz.level ?? "")}, ${sqlValue(JSON.stringify(tags))}, 'public', 'published', ${sqlValue(quiz.slug)}, NULL, ${integer(quiz.defaultTimeLimitSeconds ?? 20)}, 1, 0, ${nowSql}
     FROM users WHERE users.email = ${sqlValue(ownerEmail)};`
  );

  questions.forEach((question, index) => {
    const input = toQuestionInput(question);
    const questionId = stableId("question", `${quiz.slug}:${index}:${input.prompt}`);
    output.push(
      `INSERT INTO questions (id, quiz_id, type, order_index, prompt, media_key, time_limit_seconds, points, explanation, accepted_answers_json)
       VALUES (${sqlValue(questionId)}, ${sqlValue(quizId)}, ${sqlValue(input.type)}, ${index}, ${sqlValue(input.prompt)}, ${sqlValue(input.mediaKey ?? null)}, ${integer(input.timeLimitSeconds)}, ${integer(input.points)}, ${sqlValue(input.explanation)}, ${sqlValue(JSON.stringify(input.acceptedAnswers))});`
    );
    input.choices.forEach((choice, choiceIndex) => {
      output.push(
        `INSERT INTO question_choices (id, question_id, order_index, label, is_correct)
         VALUES (${sqlValue(stableId("choice", `${questionId}:${choiceIndex}:${choice.label}`))}, ${sqlValue(questionId)}, ${choiceIndex}, ${sqlValue(choice.label)}, ${choice.isCorrect ? 1 : 0});`
      );
    });

    const bankTags = unique([...(quiz.tags ?? []), ...(question.tags ?? [])]);
    output.push(
      `INSERT INTO question_bank_items
       (id, owner_id, type, prompt, media_key, explanation, level, primary_language, tags_json, school_level, language_track, cefr_level, program_axis, language_activity, linguistic_focus, time_limit_seconds, points, accepted_answers_json, choices_json, fingerprint)
       SELECT ${sqlValue(stableId("bank", `${ownerEmail}:${questionBankFingerprint(input)}`))}, users.id, ${sqlValue(input.type)}, ${sqlValue(input.prompt)}, ${sqlValue(input.mediaKey ?? null)}, ${sqlValue(input.explanation)}, ${sqlValue(quiz.level ?? "")}, 'en', ${sqlValue(JSON.stringify(bankTags))}, ${sqlValue(quiz.schoolLevel ?? "")}, ${sqlValue(quiz.languageTrack ?? "LVA")}, ${sqlValue(quiz.cefrLevel ?? "")}, ${sqlValue(quiz.programAxis ?? "")}, ${sqlValue(question.languageActivity ?? "comprehension_ecrite")}, ${sqlValue(question.linguisticFocus ?? "")}, ${integer(input.timeLimitSeconds)}, ${integer(input.points)}, ${sqlValue(JSON.stringify(input.acceptedAnswers))}, ${sqlValue(JSON.stringify(input.choices))}, ${sqlValue(questionBankFingerprint(input))}
       FROM users WHERE users.email = ${sqlValue(ownerEmail)};`
    );
  });
}

function toQuestionInput(question) {
  if (question.type === "true_false") {
    const answer = Boolean(question.answer);
    return {
      type: "true_false",
      prompt: question.prompt,
      mediaKey: question.mediaKey ?? null,
      explanation: question.explanation ?? "",
      timeLimitSeconds: question.timeLimitSeconds ?? 15,
      points: question.points ?? 1000,
      acceptedAnswers: [],
      choices: [
        { label: "True", isCorrect: answer },
        { label: "False", isCorrect: !answer }
      ]
    };
  }

  return {
    type: question.type ?? "multiple_choice",
    prompt: question.prompt,
    mediaKey: question.mediaKey ?? null,
    explanation: question.explanation ?? "",
    timeLimitSeconds: question.timeLimitSeconds ?? 20,
    points: question.points ?? 1000,
    acceptedAnswers: question.acceptedAnswers ?? [],
    choices: (question.choices ?? []).map((label, index) => ({
      label,
      isCorrect: index === question.correct
    }))
  };
}

function stableId(prefix, value) {
  return `${prefix}_${createHash("sha1").update(value).digest("hex").slice(0, 24)}`;
}

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function integer(value) {
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeBankText(value) {
  return String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function questionBankFingerprint(question) {
  const choices = question.choices.map((choice) => `${normalizeBankText(choice.label)}:${choice.isCorrect ? "1" : "0"}`);
  const acceptedAnswers = question.acceptedAnswers.map(normalizeBankText);
  return [
    question.type,
    normalizeBankText(question.prompt),
    choices.join("|"),
    acceptedAnswers.join("|")
  ].join("::");
}
