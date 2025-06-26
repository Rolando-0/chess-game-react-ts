export type TranspositionEntry = {
  score: number;
  depth: number;
  flag: 'FULL' | 'ALPHA' | 'BETA'
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
    if (this.table.size >= this.maxSize) {
      // Remove oldest inserted entry
      const firstKey = this.table.keys().next().value || '';
      this.table.delete(firstKey);
    }
    this.table.set(hash, entry);
  }
}

