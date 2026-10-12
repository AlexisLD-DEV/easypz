import type { LeaderboardRow } from "../../../worker/live/protocol";

export type ParticipantAvatar = {
  initials: string;
  tone: string;
};

export type GamifiedLeaderboardRow = LeaderboardRow & {
  rank: number;
  rankLabel: string;
  isPodium: boolean;
  isCurrentParticipant: boolean;
  avatar: ParticipantAvatar;
};

const avatarToneCount = 7;

export function participantAvatar(participantId: string, displayName: string): ParticipantAvatar {
  return {
    initials: participantInitials(displayName),
    tone: `avatar-tone-${avatarToneIndex(`${participantId}:${displayName}`)}`
  };
}

export function buildGamifiedLeaderboard(rows: LeaderboardRow[], currentParticipantId?: string): GamifiedLeaderboardRow[] {
  return rows.map((row, index) => ({
    ...row,
    rank: index + 1,
    rankLabel: `#${index + 1}`,
    isPodium: index < 3,
    isCurrentParticipant: row.participantId === currentParticipantId,
    avatar: participantAvatar(row.participantId, row.displayName)
  }));
}

function participantInitials(displayName: string) {
  const parts = displayName
    .trim()
    .split(/[\s-]+/)
    .map((part) => Array.from(part.trim())[0])
    .filter(Boolean);

  if (parts.length === 0) return "?";
  return parts.slice(0, 2).join("").toUpperCase();
}

function avatarToneIndex(seed: string) {
  let hash = 4;
  for (const character of seed) {
    hash = (hash * 21 + character.charCodeAt(0)) % 100000;
  }
  return hash % avatarToneCount;
}
