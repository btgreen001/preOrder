import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BatchDetail {
  externalId: string;
  recipeId: number;
  productId: number;
  quantityProduced: number;
  unit: string;
  productionDate: string;
  expirationDate: string;
  costPerUnit: number;
  batchNumber: string;
  status: string;
  quantitySold: number;
  quantityWasted: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CreateBatchRequest {
  recipeId: number;
  productId: number;
  quantityProduced: number;
  productionDate: string;
  expirationDate: string;
  costPerUnit?: number;
}

export interface UpdateBatchRequest {
  status?: string;
  quantitySold?: number;
  quantityWasted?: number;
}

@Injectable({
  providedIn: 'root'
})
export class BatchService {
  private readonly apiUrl = `${import.meta.env['NG_APP_API_URL']}/batches`;

  constructor(private http: HttpClient) {}

  /**
   * Get all batches for the organization
   */
  getBatches(status?: string, pageNumber?: number, pageSize?: number): Observable<BatchDetail[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (pageNumber !== undefined) params = params.set('pageNumber', pageNumber.toString());
    if (pageSize !== undefined) params = params.set('pageSize', pageSize.toString());

    return this.http.get<BatchDetail[]>(this.apiUrl, { params });
  }

  /**
   * Get a specific batch by external ID
   */
  getBatchById(externalId: string): Observable<BatchDetail> {
    return this.http.get<BatchDetail>(`${import.meta.env['NG_APP_API_URL']}/${externalId}`);
  }

  /**
   * Get batches expiring soon
   */
  getExpiringBatches(daysUntilExpiration?: number): Observable<BatchDetail[]> {
    let params = new HttpParams();
    if (daysUntilExpiration !== undefined) params = params.set('daysUntilExpiration', daysUntilExpiration.toString());

    return this.http.get<BatchDetail[]>(`${import.meta.env['NG_APP_API_URL']}/expiring`, { params });
  }

  /**
   * Create a new batch
   */
  createBatch(request: CreateBatchRequest): Observable<BatchDetail> {
    return this.http.post<BatchDetail>(this.apiUrl, request);
  }

  /**
   * Mark batch as completed
   */
  completeBatch(externalId: string): Observable<BatchDetail> {
    return this.http.put<BatchDetail>(`${import.meta.env['NG_APP_API_URL']}/${externalId}/complete`, {});
  }

  /**
   * Cancel a batch
   */
  cancelBatch(externalId: string): Observable<BatchDetail> {
    return this.http.put<BatchDetail>(`${import.meta.env['NG_APP_API_URL']}/${externalId}/cancel`, {});
  }

  /**
   * Get FIFO-ordered batches for a product
   */
  getFIFOBatches(productId: string, quantityNeeded: number): Observable<any[]> {
    let params = new HttpParams()
      .set('productId', productId)
      .set('quantityNeeded', quantityNeeded.toString());
    return this.http.get<any[]>(`${import.meta.env['NG_APP_API_URL']}/fifo`, { params });
  }

  /**
   * Apply FIFO rotation to select batches for production
   */
  rotateBatchesFIFO(productId: string, quantityNeeded: number): Observable<any[]> {
    const request = { productId, quantityNeeded };
    return this.http.post<any[]>(`${import.meta.env['NG_APP_API_URL']}/fifo-rotate`, request);
  }

  /**
   * Get detailed expiration information for a batch
   */
  getExpirationInfo(batchExternalId: string): Observable<any> {
    return this.http.get<any>(`${import.meta.env['NG_APP_API_URL']}/${batchExternalId}/expiration-info`);
  }
}
