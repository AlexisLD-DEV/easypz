export type QuestionPromptDisplayToken =
  | { type: "text"; text: string }
  | { type: "blank"; index: number }
  | { type: "lineBreak" };

export function splitQuestionPromptForDisplay(prompt: string): QuestionPromptDisplayToken[] {
  const parts = prompt.split(/(___|\r\n|\n|\r)/g).filter((part) => part.length > 0);
  let blankIndex = 0;

  return parts.map((part) => {
    if (part === "___") {
      blankIndex += 1;
      return { type: "blank", index: blankIndex };
    }
    if (part === "\n" || part === "\r" || part === "\r\n") {
      return { type: "lineBreak" };
    }
    return { type: "text", text: part };
  });
}
