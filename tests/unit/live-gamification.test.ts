import { describe, expect, it } from "vitest";
import { buildGamifiedLeaderboard, participantAvatar } from "../../src/features/live/liveGamification";
import type { LeaderboardRow } from "../../worker/live/protocol";

const leaderboard: LeaderboardRow[] = [
  { participantId: "p1", displayName: "Alexis", score: 2400, correctAnswers: 3 },
  { participantId: "p2", displayName: "Marie Claire", score: 1900, correctAnswers: 2 },
  { participantId: "p3", displayName: "Noah", score: 900, correctAnswers: 1 }
];

describe("live gamification", () => {
  it("builds stable avatars from participant names and ids", () => {
    expect(participantAvatar("p1", "Alexis")).toEqual({
      initials: "A",
      tone: "avatar-tone-6"
    });
    expect(participantAvatar("p2", "Marie Claire")).toEqual({
      initials: "MC",
      tone: "avatar-tone-0"
    });
    expect(participantAvatar("p3", "")).toEqual({
      initials: "?",
      tone: "avatar-tone-2"
    });
  });

  it("adds rank, podium state, current participant, and avatar metadata", () => {
    expect(buildGamifiedLeaderboard(leaderboard, "p2")).toEqual([
      {
        ...leaderboard[0],
        rank: 1,
        rankLabel: "#1",
        isPodium: true,
        isCurrentParticipant: false,
        avatar: { initials: "A", tone: "avatar-tone-6" }
      },
      {
        ...leaderboard[1],
        rank: 2,
        rankLabel: "#2",
        isPodium: true,
        isCurrentParticipant: true,
        avatar: { initials: "MC", tone: "avatar-tone-0" }
      },
      {
        ...leaderboard[2],
        rank: 3,
        rankLabel: "#3",
        isPodium: true,
        isCurrentParticipant: false,
        avatar: { initials: "N", tone: "avatar-tone-3" }
      }
    ]);
  });
});
