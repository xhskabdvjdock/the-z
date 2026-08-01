import { Collection } from "../db/collection";

export interface ITempVoiceChannel {
  _id?: string;
  guildId: string;
  channelId: string;
  ownerId: string;
  locked: boolean;
  hidden: boolean;
  createdAt: Date;
}

export const TempVoiceChannel = new Collection<ITempVoiceChannel>("temp_voice_channels", "guildId", () => ({
  locked: false,
  hidden: false,
  createdAt: new Date()
}));
