export class RandomService {
  randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  randomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  weightedRandom<T>(items: { item: T; weight: number }[]): T {
    const total = items.reduce((sum, x) => sum + x.weight, 0);
    let r = Math.random() * total;
    for (const { item, weight } of items) {
      r -= weight;
      if (r <= 0) return item;
    }
    return items[items.length - 1].item;
  }
}

export const randomService = new RandomService();

export function normalizeAnswer(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,!?؛،]/g, "");
}

export function isAnswerCorrect(input: string, expected: string | string[]): boolean {
  const norm = normalizeAnswer(input);
  const expectedList = Array.isArray(expected) ? expected : [expected];
  return expectedList.some((e) => normalizeAnswer(e) === norm);
}