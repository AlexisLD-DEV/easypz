import type { LiveStatus } from "../../../worker/live/protocol";

export type LivePhaseView = {
  key: LiveStatus;
  tone: "waiting" | "active" | "review" | "done";
};

export function livePhaseView(status: LiveStatus): LivePhaseView {
  if (status === "question") return { key: status, tone: "active" };
  if (status === "reveal") return { key: status, tone: "review" };
  if (status === "ended") return { key: status, tone: "done" };
  return { key: "lobby", tone: "waiting" };
}
