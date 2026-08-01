/** صيغة حساب الخبرة اللازمة للوصول لمستوى معين (منحنى تصاعدي شائع) */
export function xpForLevel(level: number): number {
  return 5 * (level ** 2) + 50 * level + 100;
}

export function levelFromTotalXp(totalXp: number): { level: number; currentLevelXp: number; neededXp: number } {
  let level = 0;
  let remaining = totalXp;
  let needed = xpForLevel(level);
  while (remaining >= needed) {
    remaining -= needed;
    level++;
    needed = xpForLevel(level);
  }
  return { level, currentLevelXp: remaining, neededXp: needed };
}
