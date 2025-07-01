
export type SimpleMove = {
  from: string;
  to: string;
  promotion?: string;
};

export type TranspositionEntry = {
  score: number;
  depth: number;
  flag: 'FULL' | 'ALPHA' | 'BETA';
  bestMove?: SimpleMove
};

export class TranspositionTable {
  private table = new Map<string, TranspositionEntry>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(hash: string) {
    return this.table.get(hash);
  }

  set(hash: string, entry: TranspositionEntry) {
    const existing = this.table.get(hash);

    if (!existing || entry.depth >= existing.depth) {
      this.table.set(hash, entry);
    }
  }

  size(): number{
    return this.table.size
  }
}

