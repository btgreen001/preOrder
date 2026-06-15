import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DepletionHistoryDto {
  externalId: string;
  batchExternalId: string;
  inventoryItemExternalId: string;
  inventoryItemId?: number;
  depletionDate: string;
  depletedBy: string;
  depletionCost: number;
  details: string;
}

export interface DepletionSummaryDto {
  totalDepletionCost: number;
  totalBatches: number;
  averageCostPerBatch: number;
  topProductsByClost: string[];
}

export interface InventoryAlertDto {
  inventoryItemExternalId: string;
  itemName: string;
  alertType: 'LOW_STOCK' | 'EXPIRING_SOON' | 'EXPIRED';
  message: string;
  metric: number; // Days until expiration or quantity for low stock
}

@Injectable({
  providedIn: 'root'
})
export class InventoryDepletionService {
  private apiUrl = '/api/inventory-depletion';

  constructor(private http: HttpClient) {}

  /**
   * Deplete inventory when production batch completes
   */
  depletInventory(batchId: string): Observable<DepletionHistoryDto> {
    return this.http.post<DepletionHistoryDto>(`${window.__env.NG_APP_API_URL}/deplete`, { batchId });
  }

  /**
   * Get depletion history for a product
   */
  getDepletionHistory(
    productId: string,
    startDate?: Date,
    endDate?: Date
  ): Observable<DepletionHistoryDto[]> {
    let url = `${window.__env.NG_APP_API_URL}/history?productId=${productId}`;
    if (startDate) url += `&startDate=${startDate.toISOString()}`;
    if (endDate) url += `&endDate=${endDate.toISOString()}`;
    return this.http.get<DepletionHistoryDto[]>(url);
  }

  /**
   * Get depletion summary for time period
   */
  getDepletionSummary(startDate?: Date, endDate?: Date): Observable<DepletionSummaryDto> {
    let url = `${window.__env.NG_APP_API_URL}/summary`;
    if (startDate || endDate) {
      url += '?';
      if (startDate) url += `startDate=${startDate.toISOString()}`;
      if (endDate) url += `${startDate ? '&' : ''}endDate=${endDate.toISOString()}`;
    }
    return this.http.get<DepletionSummaryDto>(url);
  }

  /**
   * Get inventory alerts (low stock, expiring soon, expired)
   */
  getInventoryAlerts(): Observable<InventoryAlertDto[]> {
    return this.http.get<InventoryAlertDto[]>(`${window.__env.NG_APP_API_URL}/alerts`);
  }
}
