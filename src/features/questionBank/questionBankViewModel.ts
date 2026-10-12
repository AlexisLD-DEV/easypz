export const bankTabs = ["program_bank", "my_bank"] as const;
export type QuestionBankTab = typeof bankTabs[number];
export const defaultBankTab: QuestionBankTab = "my_bank";
