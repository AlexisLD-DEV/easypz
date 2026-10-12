const markedBlankPattern = /\[\[([\s\S]*?)\]\]/g;

export type FillBlankBuildResult = {
  prompt: string;
  acceptedAnswers: string[];
  blankCount: number;
};

export function buildFillBlankFromMarkedText(sourceText: string): FillBlankBuildResult {
  const acceptedAnswers: string[] = [];
  const prompt = sourceText.replace(markedBlankPattern, (marker, rawAnswers: string) => {
    const variants = rawAnswers
      .split("|")
      .map((answer) => answer.trim())
      .filter(Boolean);

    if (variants.length === 0) return marker;
    acceptedAnswers.push(variants.join(" | "));
    return "___";
  }).trim();

  return {
    prompt,
    acceptedAnswers,
    blankCount: acceptedAnswers.length
  };
}
