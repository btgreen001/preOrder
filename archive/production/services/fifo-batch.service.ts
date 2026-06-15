import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * FIFO Batch DTO - Batch ordered by expiration date
 */
export interface FIFOBatchDto {
  ExternalId: string;
  BatchNumber: string;
  ProductExternalId: string;
  QuantityAvailable: number;
  ProductionDate: Date;
  ExpirationDate: Date;
  CostPerUnit: number;
  DaysUntilExpiration: number;
  ExpirationStatus: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'GOOD';
  TotalCost: number;
}

/**
 * FIFO Batch Selection DTO - Selected batch for production
 */
export interface FIFOBatchSelectionDto {
  BatchExternalId: string;
  QuantitySelected: number;
  ExpirationDate: Date;
  DaysUntilExpiration: number;
  TotalCost: number;
}

/**
 * FIFO Rotation Request
 */
export interface FIFORotationRequest {
  ProductExternalId: string;
  QuantityNeeded: number;
}

/**
 * Batch Expiration Info DTO
 */
export interface BatchExpirationInfoDto {
  DaysUntilExpiration: number;
  IsExpired: boolean;
  PercentageTimeRemaining: number;
  ExpirationStatus: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'GOOD';
}

@Injectable({
  providedIn: 'root'
})
export class FIFOBatchService {
  private readonly apiUrl = `${environment.apiUrl}/batches`;

  constructor(private http: HttpClient) {}

  /**
   * Get FIFO-ordered batches for a product
   * Returns batches ordered by expiration date (oldest first)
   */
  getFIFOBatches(productExternalId: string, quantityNeeded: number): Observable<FIFOBatchDto[]> {
    let params = new HttpParams();
    params = params.set('productId', productExternalId);
    params = params.set('quantityNeeded', quantityNeeded.toString());

    return this.http.get<FIFOBatchDto[]>(`${window.__env.NG_APP_API_URL}/fifo`, { params });
  }

  /**
   * Apply FIFO rotation to select batches for production
   */
  rotateBatchesForProduction(request: FIFORotationRequest): Observable<FIFOBatchSelectionDto[]> {
    return this.http.post<FIFOBatchSelectionDto[]>(`${window.__env.NG_APP_API_URL}/fifo-rotate`, request);
  }

  /**
   * Get detailed expiration information for a batch
   */
  getBatchExpirationInfo(batchExternalId: string): Observable<BatchExpirationInfoDto> {
    return this.http.get<BatchExpirationInfoDto>(`${window.__env.NG_APP_API_URL}/${batchExternalId}/expiration-info`);
  }
}
