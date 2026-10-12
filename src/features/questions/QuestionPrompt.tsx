import { splitQuestionPromptForDisplay } from "./promptDisplay";

export function QuestionPrompt({ prompt, blankLabel }: { prompt: string; blankLabel: string }) {
  return (
    <span className="question-prompt-text">
      {splitQuestionPromptForDisplay(prompt).map((token, index) => {
        if (token.type === "lineBreak") return <br key={`line-${index}`} />;
        if (token.type === "blank") {
          return (
            <span className="prompt-blank" aria-label={`${blankLabel} ${token.index}`} key={`blank-${token.index}-${index}`}>
              {token.index}
            </span>
          );
        }
        return <span key={`text-${index}`}>{token.text}</span>;
      })}
    </span>
  );
}
