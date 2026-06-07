import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UnitOptionsService {
  readonly categories: string[] = ['count', 'weight', 'volume'];

  private readonly fallbackUnitOptions: string[] = [
    'mg', 'g', 'kg', 'ton',
    'mL', 'L',
    't', 'T', 'fl oz', 'c', 'pt', 'qt', 'gal',
    'oz', 'lb',
    'each', 'dozen', "baker's dozen", 
    'pinch'
  ];

  private readonly preferredUnitOrder: string[] = [...this.fallbackUnitOptions];

  private readonly unitsByCategory: Record<string, string[]> = {
    weight: ['mg', 'g', 'kg', 'ton', 'oz', 'lb'],
    volume: ['mL', 'L', 't', 'T', 'fl oz', 'c', 'pt', 'qt', 'gal', 'pinch'],
    count: ['each', 'dozen', "baker's dozen"]
  };

  private unitOptions$?: Observable<string[]>;

  constructor() {}

  getUnitOptions(forceRefresh: boolean = false): Observable<string[]> {
    if (!this.unitOptions$ || forceRefresh) {
      this.unitOptions$ = of(this.getOrderedDistinctUnits([...this.fallbackUnitOptions])).pipe(
        shareReplay(1)
      );
    }

    return this.unitOptions$;
  }

  getUnitOptionsByCategory(category: string): Observable<string[]> {
    const normalized = this.sanitizeUnit(category).toLowerCase();
    const units = this.unitsByCategory[normalized] ?? [];
    return of(this.getOrderedDistinctUnits([...units]));
  }

  private sanitizeUnit(unit: unknown): string {
    return String(unit ?? '').trim();
  }

  private getOrderedDistinctUnits(units: string[]): string[] {
    const distinctUnits: string[] = [];
    const seen = new Set<string>();

    units
      .map(unit => this.sanitizeUnit(unit))
      .filter(unit => !!unit)
      .forEach(unit => {
        if (!seen.has(unit)) {
          seen.add(unit);
          distinctUnits.push(unit);
        }
      });

    const orderMap = new Map<string, number>();
    this.preferredUnitOrder.forEach((unit, index) => {
      const key = this.sanitizeUnit(unit);
      if (!orderMap.has(key)) {
        orderMap.set(key, index);
      }
    });

    return distinctUnits.sort((left, right) => {
      const leftOrder = orderMap.get(this.sanitizeUnit(left));
      const rightOrder = orderMap.get(this.sanitizeUnit(right));

      const leftInPreferred = leftOrder !== undefined;
      const rightInPreferred = rightOrder !== undefined;

      if (leftInPreferred && rightInPreferred) {
        if ((leftOrder as number) !== (rightOrder as number)) {
          return (leftOrder as number) - (rightOrder as number);
        }

        return left.localeCompare(right, undefined, { sensitivity: 'variant' });
      }

      if (leftInPreferred) return -1;
      if (rightInPreferred) return 1;

      return left.localeCompare(right, undefined, { sensitivity: 'variant' });
    });
  }
}