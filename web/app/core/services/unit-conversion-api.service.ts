import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface UnitConversionDto {
  externalId: string;
  organizationGuid?: string;
  category: string;
  fromUnit: string;
  toUnit: string;
  conversionFactor: number;
  isActive: boolean;
}

export interface ConvertRequest {
  value?: number;
  quantity?: number;
  fromUnit: string;
  toUnit: string;
  category?: string;
  inventoryItemExternalId?: string;
}

export interface ConvertResponse {
  originalValue: number;
  value: number;
  quantity: number;
  fromUnit: string;
  toUnit: string;
  category?: string;
  appliedFactor?: number;
  usedOrganizationOverride?: boolean;
  usedReverseConversion?: boolean;
  convertedValue: number;
  convertedQuantity: number;
}

export interface ScaleRequest {
  quantity: number;
  multiplier: number;
  displayAsFraction?: boolean;
}

export interface ScaleResponse {
  originalQuantity: number;
  multiplier: number;
  scaledQuantity: number;
  fractionDisplay?: string;
}

export interface FractionParseRequest {
  input: string;
}

export interface FractionParseResponse {
  input: string;
  decimalValue: number;
  value: number;
}

export interface FractionFormatRequest {
  value: number;
  maxDenominator?: number;
}

export interface FractionFormatResponse {
  value: number;
  fractionDisplay: string;
  formatted: string;
}

export interface UpsertUnitConversionRequest {
  externalId?: string;
  organizationGuid?: string;
  category: string;
  fromUnit: string;
  toUnit: string;
  conversionFactor: number;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UnitConversionApiService {
  private readonly apiUrl = `${environment.apiUrl}/unit-conversions`;

  constructor(private readonly http: HttpClient) {}

  getConversions(category?: string, includeGlobal: boolean = true): Observable<UnitConversionDto[]> {
    let params = new HttpParams().set('includeGlobal', includeGlobal.toString());
    if (category) {
      params = params.set('category', category);
    }

    return this.http.get<UnitConversionDto[]>(this.apiUrl, { params });
  }

  convert(request: ConvertRequest): Observable<ConvertResponse> {
    const payload = {
      value: request.value ?? request.quantity ?? 0,
      fromUnit: request.fromUnit,
      toUnit: request.toUnit,
      category: request.category,
      inventoryItemExternalId: request.inventoryItemExternalId
    };

    return this.http.post<any>(`${this.apiUrl}/convert`, payload).pipe(
      map((response: any) => ({
        originalValue: Number(response?.originalValue ?? payload.value ?? 0),
        value: Number(response?.convertedValue ?? 0),
        quantity: Number(response?.convertedValue ?? 0),
        fromUnit: response?.fromUnit ?? payload.fromUnit,
        toUnit: response?.toUnit ?? payload.toUnit,
        category: payload.category,
        appliedFactor: response?.appliedFactor,
        usedOrganizationOverride: response?.usedOrganizationOverride,
        usedReverseConversion: response?.usedReverseConversion,
        convertedValue: Number(response?.convertedValue ?? 0),
        convertedQuantity: Number(response?.convertedValue ?? 0)
      }))
    );
  }

  scale(request: ScaleRequest): Observable<ScaleResponse> {
    return this.http.post<ScaleResponse>(`${this.apiUrl}/scale`, request);
  }

  parseFraction(input: string): Observable<FractionParseResponse> {
    const request: FractionParseRequest = { input };
    return this.http.post<any>(`${this.apiUrl}/fraction/parse`, request).pipe(
      map((response: any) => ({
        input: response?.input ?? input,
        decimalValue: Number(response?.decimalValue ?? response?.value ?? 0),
        value: Number(response?.decimalValue ?? response?.value ?? 0)
      }))
    );
  }

  formatFraction(value: number, maxDenominator?: number): Observable<FractionFormatResponse> {
    const request: FractionFormatRequest = { value, maxDenominator };
    return this.http.post<any>(`${this.apiUrl}/fraction/format`, request).pipe(
      map((response: any) => ({
        value: Number(response?.value ?? value),
        fractionDisplay: String(response?.fractionDisplay ?? response?.formatted ?? ''),
        formatted: String(response?.fractionDisplay ?? response?.formatted ?? '')
      }))
    );
  }

  upsertOrganizationConversion(request: UpsertUnitConversionRequest): Observable<UnitConversionDto> {
    return this.http.put<UnitConversionDto>(`${this.apiUrl}/organization`, request);
  }

  upsertGlobalConversion(request: UpsertUnitConversionRequest): Observable<UnitConversionDto> {
    return this.http.put<UnitConversionDto>(`${this.apiUrl}/global`, request);
  }

  deactivateConversion(externalId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${externalId}`);
  }
}