import { Collection } from "../db/collection";

export interface ISuggestion {
  _id?: string;
  guildId: string;
  userId: string;
  messageId: string;
  channelId: string;
  content: string;
  imageUrl?: string;
  upvotes?: string[];
  downvotes?: string[];
  votes?: {
    userId: string;
    vote: "up" | "down";
  }[];
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
}

export const Suggestion = new Collection<ISuggestion>("suggestions", "guildId", () => ({
  upvotes: [],
  downvotes: [],
  votes: [],
  status: "pending",
  createdAt: new Date()
}));