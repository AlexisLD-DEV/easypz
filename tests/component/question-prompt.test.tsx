import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QuestionPrompt } from "../../src/features/questions/QuestionPrompt";

afterEach(cleanup);

describe("QuestionPrompt component", () => {
  it("renders prompt text and ordered blank chips with aria labels", () => {
    const { container } = render(<QuestionPrompt prompt={"I ___ to the park"} blankLabel="Case" />);

    // Full prompt text is present in the container (spaces normalized by getByText).
    expect(container.textContent).toBe("I 1 to the park");
    expect(screen.getByText("I")).toBeInTheDocument();

    // Each ___ becomes a labelled blank chip in order.
    expect(screen.getByLabelText("Case 1")).toHaveTextContent("1");
    expect(screen.queryByLabelText("Case 2")).not.toBeInTheDocument();
  });

  it("numbers multiple blanks sequentially", () => {
    render(<QuestionPrompt prompt={"Line one\nI ___\nand ___"} blankLabel="Case" />);

    expect(screen.getByLabelText("Case 1")).toHaveTextContent("1");
    expect(screen.getByLabelText("Case 2")).toHaveTextContent("2");
  });

  it("renders a <br> for each newline in the prompt", () => {
    const { container } = render(<QuestionPrompt prompt={"a\nb"} blankLabel="Case" />);

    expect(container.querySelectorAll("br")).toHaveLength(1);
  });

  it("keeps a prompt without blanks as a single text span", () => {
    const { container } = render(<QuestionPrompt prompt={"Choose the past form."} blankLabel="Case" />);

    expect(screen.getByText("Choose the past form.")).toBeInTheDocument();
    // No blank chips when there is no ___ token.
    expect(container.querySelector(".prompt-blank")).not.toBeInTheDocument();
  });
});
