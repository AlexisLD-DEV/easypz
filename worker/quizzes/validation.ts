import { z } from "zod";
import { blankCountFromPrompt, splitFillBlankVariants } from "../live/fillBlank";

export const quizVisibilitySchema = z.enum(["private", "public", "secret_link"]);
export const quizStatusSchema = z.enum(["draft", "published"]);
export const questionTypeSchema = z.enum(["multiple_choice", "true_false", "short_answer", "reformulation", "word_order", "fill_blank", "matching"]);
export const publicationIntentSchema = z.object({
  intent: z.enum(["publish", "publish_secret", "unpublish"])
});

export const choiceInputSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1).max(180),
  isCorrect: z.boolean()
});

export const questionInputSchema = z.object({
  id: z.string().optional(),
  type: questionTypeSchema,
  prompt: z.string().trim().min(1).max(800),
  mediaKey: z.string().nullable().optional(),
  timeLimitSeconds: z.number().int().min(5).max(180),
  points: z.number().int().min(100).max(5000),
  explanation: z.string().max(1200).default(""),
  acceptedAnswers: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  choices: z.array(choiceInputSchema).max(16).default([])
});

export const quizInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().max(800).default(""),
  primaryLanguage: z.enum(["fr", "en"]).default("en"),
  level: z.string().max(40).default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  visibility: quizVisibilitySchema.default("private"),
  status: quizStatusSchema.default("draft"),
  defaultTimeLimitSeconds: z.number().int().min(5).max(180).default(30),
  showCorrection: z.boolean().default(true),
  speedScoring: z.boolean().default(true),
  examMode: z.boolean().default(false),
  questions: z.array(questionInputSchema).max(80).default([])
}).superRefine((quiz, ctx) => {
  for (const [index, question] of quiz.questions.entries()) {
    if (question.type === "multiple_choice") {
      if (question.choices.length < 2 || question.choices.length > 4) {
        ctx.addIssue({
          code: "custom",
          path: ["questions", index, "choices"],
          message: "multiple_choice_requires_2_to_4_choices"
        });
      }
      if (question.choices.filter((choice) => choice.isCorrect).length !== 1) {
        ctx.addIssue({
          code: "custom",
          path: ["questions", index, "choices"],
          message: "multiple_choice_requires_one_correct_choice"
        });
      }
    }
    if (question.type === "true_false" && question.choices.length !== 2) {
      ctx.addIssue({
        code: "custom",
        path: ["questions", index, "choices"],
        message: "true_false_requires_two_choices"
      });
    }
    if ((question.type === "short_answer" || question.type === "reformulation") && question.acceptedAnswers.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["questions", index, "acceptedAnswers"],
        message: `${question.type}_requires_accepted_answer`
      });
    }
    if (question.type === "word_order" && (question.choices.length < 2 || question.choices.length > 12)) {
      ctx.addIssue({
        code: "custom",
        path: ["questions", index, "choices"],
        message: "word_order_requires_2_to_12_tokens"
      });
    }
    if (question.type === "fill_blank") {
      const blankCount = blankCountFromPrompt(question.prompt);
      if (blankCount === 0 || question.acceptedAnswers.length !== blankCount) {
        ctx.addIssue({
          code: "custom",
          path: ["questions", index, "acceptedAnswers"],
          message: "fill_blank_requires_one_answer_group_per_blank"
        });
      }
      if (question.acceptedAnswers.some((group) => splitFillBlankVariants(group).length === 0)) {
        ctx.addIssue({
          code: "custom",
          path: ["questions", index, "acceptedAnswers"],
          message: "fill_blank_requires_non_empty_answer_groups"
        });
      }
    }
    if (question.type === "matching" && (question.choices.length < 4 || question.choices.length > 16 || question.choices.length % 2 !== 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["questions", index, "choices"],
        message: "matching_requires_2_to_8_complete_pairs"
      });
    }
  }
});

export type QuizInput = z.infer<typeof quizInputSchema>;
