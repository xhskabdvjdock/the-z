const ASSETS: Record<string, Record<string, string>> = {
  xo: {
    win: "https://cdn.discordapp.com/attachments/0/0/xo_win.png",
    draw: "https://cdn.discordapp.com/attachments/0/0/xo_draw.png"
  },
  mafia: {
    night: "https://cdn.discordapp.com/attachments/0/0/mafia_night.png",
    day: "https://cdn.discordapp.com/attachments/0/0/mafia_day.png"
  },
  roulette: {
    wheel: "https://cdn.discordapp.com/attachments/0/0/roulette_wheel.png"
  }
};

const cache = new Map<string, string>();

export function getGameAsset(gameId: string, assetType: string): string | null {
  const key = `${gameId}:${assetType}`;
  if (cache.has(key)) return cache.get(key)!;
  const asset = ASSETS[gameId]?.[assetType] ?? null;
  if (asset) cache.set(key, asset);
  return asset;
}

export function hasAsset(gameId: string, assetType: string): boolean {
  return !!ASSETS[gameId]?.[assetType];
}