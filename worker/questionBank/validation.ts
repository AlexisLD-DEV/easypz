import { z } from "zod";
import { blankCountFromPrompt, splitFillBlankVariants } from "../live/fillBlank";
import { choiceInputSchema, questionTypeSchema } from "../quizzes/validation";

export const questionBankChoiceInputSchema = choiceInputSchema.omit({ id: true });
const schoolLevelSchema = z.enum(["", "seconde", "premiere", "terminale"]);
const languageTrackSchema = z.enum(["", "LVA", "LVB", "LVC"]);
const cefrLevelSchema = z.enum(["", "A1+", "A2", "A2+", "B1", "B1+", "B2"]);
const languageActivitySchema = z.enum([
  "",
  "comprehension_orale",
  "comprehension_ecrite",
  "expression_orale",
  "expression_ecrite",
  "interaction",
  "mediation"
]);

export const questionBankInputSchema = z.object({
  type: questionTypeSchema,
  prompt: z.string().trim().min(1).max(800),
  mediaKey: z.string().nullable().optional(),
  explanation: z.string().max(1200).default(""),
  level: z.string().max(40).default(""),
  primaryLanguage: z.enum(["fr", "en"]).default("en"),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  schoolLevel: schoolLevelSchema.default(""),
  languageTrack: languageTrackSchema.default(""),
  cefrLevel: cefrLevelSchema.default(""),
  programAxis: z.string().trim().max(80).default(""),
  languageActivity: languageActivitySchema.default(""),
  linguisticFocus: z.string().trim().max(80).default(""),
  timeLimitSeconds: z.number().int().min(5).max(180).default(30),
  points: z.number().int().min(100).max(5000).default(1000),
  acceptedAnswers: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  choices: z.array(questionBankChoiceInputSchema).max(16).default([])
}).superRefine((question, ctx) => {
  if (question.type === "multiple_choice") {
    if (question.choices.length < 2 || question.choices.length > 4) {
      ctx.addIssue({ code: "custom", path: ["choices"], message: "multiple_choice_requires_2_to_4_choices" });
    }
    if (question.choices.filter((choice) => choice.isCorrect).length !== 1) {
      ctx.addIssue({ code: "custom", path: ["choices"], message: "multiple_choice_requires_one_correct_choice" });
    }
  }

  if (question.type === "true_false") {
    if (question.choices.length !== 2) {
      ctx.addIssue({ code: "custom", path: ["choices"], message: "true_false_requires_two_choices" });
    }
    if (question.choices.filter((choice) => choice.isCorrect).length !== 1) {
      ctx.addIssue({ code: "custom", path: ["choices"], message: "true_false_requires_one_correct_choice" });
    }
  }

  if ((question.type === "short_answer" || question.type === "reformulation") && question.acceptedAnswers.length === 0) {
    ctx.addIssue({ code: "custom", path: ["acceptedAnswers"], message: `${question.type}_requires_accepted_answer` });
  }

  if (question.type === "word_order" && (question.choices.length < 2 || question.choices.length > 12)) {
    ctx.addIssue({ code: "custom", path: ["choices"], message: "word_order_requires_2_to_12_tokens" });
  }

  if (question.type === "fill_blank") {
    const blankCount = blankCountFromPrompt(question.prompt);
    if (blankCount === 0 || question.acceptedAnswers.length !== blankCount) {
      ctx.addIssue({ code: "custom", path: ["acceptedAnswers"], message: "fill_blank_requires_one_answer_group_per_blank" });
    }
    if (question.acceptedAnswers.some((group) => splitFillBlankVariants(group).length === 0)) {
      ctx.addIssue({ code: "custom", path: ["acceptedAnswers"], message: "fill_blank_requires_non_empty_answer_groups" });
    }
  }

  if (question.type === "matching" && (question.choices.length < 4 || question.choices.length > 16 || question.choices.length % 2 !== 0)) {
    ctx.addIssue({ code: "custom", path: ["choices"], message: "matching_requires_2_to_8_complete_pairs" });
  }
});

export const questionBankFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  type: questionTypeSchema.optional(),
  level: z.string().trim().max(40).optional(),
  language: z.enum(["fr", "en"]).optional(),
  tag: z.string().trim().max(40).optional(),
  schoolLevel: z.enum(["seconde", "premiere", "terminale"]).optional(),
  languageTrack: z.enum(["LVA", "LVB", "LVC"]).optional(),
  cefrLevel: z.enum(["A1+", "A2", "A2+", "B1", "B1+", "B2"]).optional(),
  programAxis: z.string().trim().max(80).optional(),
  languageActivity: z.enum([
    "comprehension_orale",
    "comprehension_ecrite",
    "expression_orale",
    "expression_ecrite",
    "interaction",
    "mediation"
  ]).optional(),
  linguisticFocus: z.string().trim().max(80).optional()
});

export const questionBankSimilarInputSchema = questionBankInputSchema.extend({
  excludeId: z.string().optional()
});

export type QuestionBankInput = z.infer<typeof questionBankInputSchema>;
export type QuestionBankFilters = z.infer<typeof questionBankFilterSchema>;
