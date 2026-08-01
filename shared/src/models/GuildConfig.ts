import { Collection } from "../db/collection";
import { IGuildConfig, createDefaultGuildConfig } from "../types/guildConfig";

export * from "../types/guildConfig";

export const GuildConfig = new Collection<IGuildConfig>("guild_configs", "guildId", () =>
  createDefaultGuildConfig("")
);
