/**
 * Calcula o nível a partir do XP total acumulado.
 * Progressão fixa: 500 XP por nível.
 * Nível 1: 0–499 XP, Nível 2: 500–999 XP, etc.
 */
export function getLevelFromXp(xp: number): number {
  return Math.floor(xp / 500) + 1;
}

/**
 * Retorna o XP acumulado dentro do nível atual.
 */
export function getXpInCurrentLevel(xp: number): number {
  return xp % 500;
}

/**
 * XP necessário para completar o nível atual (sempre 500).
 */
export const XP_PER_LEVEL = 500;

/**
 * Percentual de progresso dentro do nível atual (0 a 1).
 */
export function getXpProgress(xp: number): number {
  return Math.min((xp % XP_PER_LEVEL) / XP_PER_LEVEL, 1);
}
