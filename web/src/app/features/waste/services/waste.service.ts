import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface WasteEvent {
  externalId: string;
  batchId?: number;
  inventoryItemId?: number;
  quantityWasted: number;
  unit: string;
  wasteReason: string;
  wasteCost: number;
  recordedBy: string;
  recordedAt: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface LogWasteEventRequest {
  batchId?: number;
  inventoryItemId?: number;
  quantityWasted: number;
  unit?: string;
  wasteReason?: string;
  wasteCost?: number;
  notes?: string;
}

export interface WasteReasonBreakdown {
  reason: string;
  count: number;
  totalCost: number;
  totalQuantity: number;
}

export interface WasteAnalytics {
  organizationId: string;
  startDate: string;
  endDate: string;
  totalWasteCost: number;
  totalWasteQuantity: number;
  totalWasteEvents: number;
  averageCostPerEvent: number;
  reasonBreakdown: WasteReasonBreakdown[];
}

@Injectable({
  providedIn: 'root'
})
export class WasteService {
  private readonly apiUrl = `${environment.apiUrl}/waste`;

  constructor(private http: HttpClient) {}

  /**
   * Get all waste events for the organization
   */
  getWasteEvents(reason?: string, pageNumber?: number, pageSize?: number): Observable<WasteEvent[]> {
    let params = new HttpParams();
    if (reason) params = params.set('reason', reason);
    if (pageNumber !== undefined) params = params.set('pageNumber', pageNumber.toString());
    if (pageSize !== undefined) params = params.set('pageSize', pageSize.toString());

    return this.http.get<WasteEvent[]>(this.apiUrl, { params });
  }

  /**
   * Get a specific waste event by external ID
   */
  getWasteEventById(externalId: string): Observable<WasteEvent> {
    return this.http.get<WasteEvent>(`${this.apiUrl}/${externalId}`);
  }

  /**
   * Log a new waste event
   */
  logWasteEvent(request: LogWasteEventRequest): Observable<WasteEvent> {
    return this.http.post<WasteEvent>(this.apiUrl, request);
  }

  /**
   * Get waste analytics and summary
   */
  getWasteAnalytics(startDate?: Date, endDate?: Date): Observable<WasteAnalytics> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());

    return this.http.get<WasteAnalytics>(`${this.apiUrl}/analytics`, { params });
  }
}
