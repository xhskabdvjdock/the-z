import { Collection } from "../db/collection";

export interface IGifBlock {
  _id?: string;
  guildId: string;
  url: string;
  action: "delete" | "warn" | "mute" | "ban" | "kick";
  duration?: number; // duration in minutes for mute/warn
  reason?: string;
  enabled: boolean;
  addedBy: string;
  addedAt: Date;
}

export const GifBlock = new Collection<IGifBlock>("gif_blocks", "guildId", () => ({
  action: "delete",
  enabled: true,
  addedAt: new Date()
}));