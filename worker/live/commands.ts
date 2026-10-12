import type { LiveStatus } from "./protocol";

export function canStartQuestion(status: LiveStatus) {
  return status !== "question" && status !== "ended";
}
