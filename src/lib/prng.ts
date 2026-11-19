export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pickOne<T>(items: readonly T[], weights: readonly number[], rand: () => number): T {
  let total = 0
  for (const weight of weights) total += weight
  let cursor = rand() * total
  for (let index = 0; index < items.length; index += 1) {
    cursor -= weights[index] ?? 0
    if (cursor < 0) return items[index] as T
  }
  return items[items.length - 1] as T
}
