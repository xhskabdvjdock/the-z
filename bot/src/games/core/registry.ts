import { GameDefinition } from "./types";

/**
 * GameRegistry — مستودع تعريفات الألعاب.
 * الأسماء والأسماء المستعارة فريدة وحساسة للحالة (يُخزَّن الاسم صغيرًا).
 */
export class GameRegistry {
  private games = new Map<string, GameDefinition>();
  private aliases = new Map<string, string>();

  register(def: GameDefinition): void {
    const name = def.name.toLowerCase();
    if (this.games.has(name)) {
      throw new Error(`Duplicate game registration: ${name}`);
    }
    this.games.set(name, def);
    this.aliases.set(name, name);
    for (const alias of def.aliases ?? []) {
      const a = alias.toLowerCase();
      if (!this.aliases.has(a)) this.aliases.set(a, name);
    }
  }

  /** بحث بالاسم أو الاسم المستعار */
  get(name: string): GameDefinition | undefined {
    if (!name) return undefined;
    const key = name.toLowerCase().trim();
    const resolved = this.aliases.get(key);
    return resolved ? this.games.get(resolved) : undefined;
  }

  has(name: string): boolean {
    return this.get(name) != null;
  }

  all(): GameDefinition[] {
    return [...this.games.values()];
  }

  byCategory(category: "multiplayer" | "singleplayer"): GameDefinition[] {
    return this.all().filter((g) => g.category === category);
  }

  /** بحث نصي بالاسم/العنوان/الوصف */
  search(query: string): GameDefinition[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return this.all().filter(
      (g) =>
        g.name.includes(q) ||
        g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.aliases.some((a) => a.includes(q))
    );
  }

  size(): number {
    return this.games.size;
  }
}

export const registry = new GameRegistry();