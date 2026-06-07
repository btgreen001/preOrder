import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { UnitConversionApiService } from './unit-conversion-api.service';

@Injectable({
  providedIn: 'root'
})
export class UnitConversionResolverService {
  private static readonly STORAGE_KEY = 'unit-conversion-resolver-cache-v1';
  private static readonly STORAGE_TTL_MS = 12 * 60 * 60 * 1000;
  private static readonly ENDPOINT_STATE_KEY = 'unit-conversion-endpoint-state-v2';
  private static readonly ENDPOINT_STATE_TTL_MS = 15 * 60 * 1000;
  private static readonly MAX_CACHE_ENTRIES = 500;

  private endpointUnavailable = false;
  private readonly conversionCache = new Map<string, number | null>();

  private readonly localUnitDefinitions: Record<string, { category: 'weight' | 'volume' | 'count'; toBase: number }> = {
    mg: { category: 'weight', toBase: 0.001 },
    g: { category: 'weight', toBase: 1 },
    kg: { category: 'weight', toBase: 1000 },
    ton: { category: 'weight', toBase: 1000000 },
    oz: { category: 'weight', toBase: 28.349523125 },
    lb: { category: 'weight', toBase: 453.59237 },

    mL: { category: 'volume', toBase: 1 },
    L: { category: 'volume', toBase: 1000 },
    t: { category: 'volume', toBase: 4.92892159375 },
    T: { category: 'volume', toBase: 14.78676478125 },
    'fl oz': { category: 'volume', toBase: 29.5735295625 },
    c: { category: 'volume', toBase: 236.5882365 },
    pt: { category: 'volume', toBase: 473.176473 },
    qt: { category: 'volume', toBase: 946.352946 },
    gal: { category: 'volume', toBase: 3785.411784 },

    each: { category: 'count', toBase: 1 },
    dozen: { category: 'count', toBase: 12 },
    "baker's dozen": { category: 'count', toBase: 13 },
    pinch: { category: 'count', toBase: 1 }
  };

  constructor(private readonly unitConversionApi: UnitConversionApiService) {
    this.loadPersistedCache();
    this.loadPersistedEndpointState();
  }

  convertValue(value: number, fromUnitRaw: string, toUnitRaw: string, inventoryItemExternalId?: string): Observable<number | null> {
    if (!Number.isFinite(value)) {
      return of(null);
    }

    const fromUnit = this.normalizeUnit(fromUnitRaw);
    const toUnit = this.normalizeUnit(toUnitRaw);
    const normalizedInventoryItemExternalId = this.normalizeInventoryItemExternalId(inventoryItemExternalId);

    if (!fromUnit || !toUnit) {
      return of(null);
    }

    const cacheKeyPrefix = normalizedInventoryItemExternalId ? `item:${normalizedInventoryItemExternalId}` : 'global';
    const cacheKey = `${cacheKeyPrefix}:${fromUnit}->${toUnit}`;
    const cachedFactor = this.conversionCache.get(cacheKey);
    if (cachedFactor !== undefined) {
      if (cachedFactor === null) {
        return of(null);
      }
      return of(value * cachedFactor);
    }

    return this.ensureApiAvailability().pipe(
      switchMap((apiAvailable) => {
        if (apiAvailable) {
          return this.unitConversionApi.convert({ value, fromUnit, toUnit, inventoryItemExternalId: normalizedInventoryItemExternalId ?? undefined }).pipe(
            map(response => {
              const converted = Number(response?.convertedValue);
              if (!Number.isFinite(converted)) {
                return null;
              }

              const factor = value === 0 ? Number(response?.appliedFactor ?? 0) : converted / value;
              if (Number.isFinite(factor) && factor > 0) {
                this.setCachedFactor(cacheKey, factor);
              }

              return converted;
            }),
            catchError((error) => {
              if (error?.status === 404) {
                this.setEndpointUnavailable();
              }

              const localConverted = this.tryConvertLocal(value, fromUnit, toUnit);
              if (localConverted !== null) {
                const localFactor = value === 0 ? this.tryConvertLocal(1, fromUnit, toUnit) : localConverted / value;
                if (localFactor !== null && Number.isFinite(localFactor) && localFactor > 0) {
                  this.setCachedFactor(cacheKey, localFactor);
                }
                return of(localConverted);
              }

              this.setCachedFactor(cacheKey, null);
              return of(null);
            })
          );
        }

        const localConverted = this.tryConvertLocal(value, fromUnit, toUnit);
        if (localConverted !== null) {
          const localFactor = value === 0 ? this.tryConvertLocal(1, fromUnit, toUnit) : localConverted / value;
          if (localFactor !== null && Number.isFinite(localFactor) && localFactor > 0) {
            this.setCachedFactor(cacheKey, localFactor);
          }
          return of(localConverted);
        }

        this.setCachedFactor(cacheKey, null);
        return of(null);
      })
    );

  }

  private ensureApiAvailability(): Observable<boolean> {
    if (this.endpointUnavailable) {
      return of(false);
    }

    return this.unitConversionApi.convert({
      value: 1,
      fromUnit: 'g',
      toUnit: 'g'
    }).pipe(
      map(() => true),
      catchError((error) => {
        // Only treat 404 as a hard "endpoint unavailable" signal.
        // 401/403 may be transient auth timing issues and should not permanently disable API attempts.
        if (error?.status === 404) {
          this.setEndpointUnavailable();
          return of(false);
        }

        // Keep trying API on future calls for non-404 failures.
        return of(true);
      })
    );
  }

  private tryConvertLocal(value: number, fromUnitRaw: string, toUnitRaw: string): number | null {
    const fromUnit = this.normalizeUnit(fromUnitRaw);
    const toUnit = this.normalizeUnit(toUnitRaw);

    if (!fromUnit || !toUnit) return null;
    if (fromUnit === toUnit) return value;

    const fromDef = this.localUnitDefinitions[fromUnit];
    const toDef = this.localUnitDefinitions[toUnit];

    if (!fromDef || !toDef) return null;
    if (fromDef.category !== toDef.category) return null;
    if (!Number.isFinite(fromDef.toBase) || !Number.isFinite(toDef.toBase) || toDef.toBase <= 0) return null;

    return value * (fromDef.toBase / toDef.toBase);
  }

  private normalizeUnit(unit: unknown): string {
    return String(unit ?? '').trim();
  }

  private normalizeInventoryItemExternalId(value: unknown): string | null {
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized ? normalized : null;
  }

  private setCachedFactor(cacheKey: string, factor: number | null): void {
    this.conversionCache.set(cacheKey, factor);
    this.trimCacheIfNeeded();
    this.persistCache();
  }

  private trimCacheIfNeeded(): void {
    while (this.conversionCache.size > UnitConversionResolverService.MAX_CACHE_ENTRIES) {
      const firstKey = this.conversionCache.keys().next().value as string | undefined;
      if (!firstKey) break;
      this.conversionCache.delete(firstKey);
    }
  }

  private persistCache(): void {
    try {
      const payload = {
        savedAt: Date.now(),
        entries: Array.from(this.conversionCache.entries())
      };
      localStorage.setItem(UnitConversionResolverService.STORAGE_KEY, JSON.stringify(payload));
    } catch {
    }
  }

  private loadPersistedCache(): void {
    try {
      const raw = localStorage.getItem(UnitConversionResolverService.STORAGE_KEY);
      if (!raw) return;

      const payload = JSON.parse(raw) as { savedAt?: number; entries?: Array<[string, number | null]> };
      if (!payload?.savedAt || !Array.isArray(payload.entries)) {
        localStorage.removeItem(UnitConversionResolverService.STORAGE_KEY);
        return;
      }

      const age = Date.now() - payload.savedAt;
      if (age > UnitConversionResolverService.STORAGE_TTL_MS) {
        localStorage.removeItem(UnitConversionResolverService.STORAGE_KEY);
        return;
      }

      payload.entries.slice(0, UnitConversionResolverService.MAX_CACHE_ENTRIES).forEach(([key, factor]) => {
        if (typeof key === 'string') {
          this.conversionCache.set(key, typeof factor === 'number' || factor === null ? factor : null);
        }
      });
    } catch {
      localStorage.removeItem(UnitConversionResolverService.STORAGE_KEY);
    }
  }

  private setEndpointUnavailable(): void {
    this.endpointUnavailable = true;
    this.persistEndpointState(true);
  }

  private persistEndpointState(isUnavailable: boolean): void {
    try {
      const payload = {
        savedAt: Date.now(),
        unavailable: isUnavailable
      };
      localStorage.setItem(UnitConversionResolverService.ENDPOINT_STATE_KEY, JSON.stringify(payload));
    } catch {
    }
  }

  private loadPersistedEndpointState(): void {
    try {
      const raw = localStorage.getItem(UnitConversionResolverService.ENDPOINT_STATE_KEY);
      if (!raw) return;

      const payload = JSON.parse(raw) as { savedAt?: number; unavailable?: boolean };
      if (!payload?.savedAt || typeof payload.unavailable !== 'boolean') {
        localStorage.removeItem(UnitConversionResolverService.ENDPOINT_STATE_KEY);
        return;
      }

      const age = Date.now() - payload.savedAt;
      if (age > UnitConversionResolverService.ENDPOINT_STATE_TTL_MS) {
        localStorage.removeItem(UnitConversionResolverService.ENDPOINT_STATE_KEY);
        return;
      }

      this.endpointUnavailable = payload.unavailable;
    } catch {
      localStorage.removeItem(UnitConversionResolverService.ENDPOINT_STATE_KEY);
    }
  }
}
