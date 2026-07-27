export class Rng {
  state: number;

  constructor(state: number) {
    this.state = state | 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    const t = this.state;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('Rng.pick: empty array');
    return arr[Math.floor(this.next() * arr.length)]!;
  }

  sample<T>(arr: readonly T[], n: number): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy.slice(0, Math.min(n, copy.length));
  }

  weightedPick<T>(items: readonly T[], weightOf: (item: T) => number): T {
    if (items.length === 0) throw new Error('Rng.weightedPick: empty array');
    const total = items.reduce((sum, it) => sum + Math.max(0, weightOf(it)), 0);
    if (total <= 0) return this.pick(items);
    let roll = this.next() * total;
    for (const it of items) {
      roll -= Math.max(0, weightOf(it));
      if (roll <= 0) return it;
    }
    return items[items.length - 1]!;
  }
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2147483646) + 1;
}
