import { Collection } from "../db/collection";

export type SuggestionStatus = "pending" | "approved" | "rejected" | "implemented";

export interface ISuggestion {
  id: string;
  guildId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  status: SuggestionStatus;
  upvotes: string[]; // userIds
  downvotes: string[]; // userIds
  channelId?: string;
  messageId?: string;
  createdAt: string;
  updatedAt: string;
}

export const Suggestion = new Collection<ISuggestion>("suggestions", "id", () => ({
  id: "",
  guildId: "",
  userId: "",
  userName: "",
  content: "",
  status: "pending",
  upvotes: [],
  downvotes: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}));

export interface ISuggestionConfig {
  enabled: boolean;
  channelId: string | null;
  logChannelId: string | null;
  allowVoting: boolean;
  autoThread: boolean;
  minVotesForApproval?: number;
}

export function createDefaultSuggestionConfig(): ISuggestionConfig {
  return {
    enabled: false,
    channelId: null,
    logChannelId: null,
    allowVoting: true,
    autoThread: false
  };
}