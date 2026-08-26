import { GAMES_LIST } from "@thez/shared";

export interface GameDefinition {
  id: string;
  name: string;
  description: string;
  category: "جماعية" | "فردية";
  minPlayers: number;
  maxPlayers: number;
  duration: number;
}

const GAME_DEFINITIONS: Record<string, GameDefinition> = {};

for (const g of GAMES_LIST) {
  GAME_DEFINITIONS[g.id] = {
    id: g.id,
    name: g.name,
    description: g.description,
    category: g.category as any,
    minPlayers: g.category === "جماعية" ? 2 : 1,
    maxPlayers: g.category === "جماعية" ? 10 : 1,
    duration: 120
  };
}

export class GameRegistry {
  private games = new Map<string, GameDefinition>();

  constructor() {
    for (const def of Object.values(GAME_DEFINITIONS)) {
      this.games.set(def.id, def);
    }
  }

  get(id: string): GameDefinition | undefined {
    return this.games.get(id);
  }

  getAll(): GameDefinition[] {
    return [...this.games.values()];
  }

  getByCategory(category: string): GameDefinition[] {
    return this.getAll().filter((g) => g.category === category);
  }

  has(id: string): boolean {
    return this.games.has(id);
  }
}

export const gameRegistry = new GameRegistry();