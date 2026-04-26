import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * DATETIME SEMANTICS for PreOrder Admin:
 *
 * BUSINESS TIMES (Wall-Clock, Timezone-Less):
 * - AdminHolidayEvent: opensAt, closesAt, pickupStartDt, pickupEndDt
 * - AdminPickupSlot: slotStartAt, slotEndAt
 *
 * These represent business hours as entered by staff. They are NOT UTC-converted in this service.
 * - Forms use HTML datetime-local/date inputs; raw values are sent to API as-is.
 * - NO toISOString() conversion should occur for these fields.
 * - Backend compares these as wall-clock semantics (e.g., "is order time between open and close?").
 *
 * OPERATIONAL TIMESTAMPS (True UTC):
 * - AdminMenuItem, AdminPickupSlot: updatedAt
 * These are absolute moments and are displayed for audit/UI purposes only.
 *
 * See README.md "Datetime Semantics" for complete policy.
 */

export interface AdminHolidayEvent {
  id: number;
  externalId: string;
  name: string;
  description?: string | null;
  opensAt: string;
  closesAt: string;
  pickupStartDt: string;
  pickupEndDt: string;
  isActive: boolean;
}

export interface AdminMenuItem {
  id: number;
  externalId: string;
  holidayEventId: number;
  sellableProductId?: number | null;
  name: string;
  description?: string | null;
  price: number;
  maxPerOrder?: number | null;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface AdminPickupSlot {
  id: number;
  externalId: string;
  holidayEventId: number;
  slotStartAt: string;
  slotEndAt: string;
  capacity: number;
  reservedCount: number;
  isActive: boolean;
  updatedAt: string;
}

export interface AdminSellableProduct {
  id: number;
  externalId: string;
  name: string;
  isActive: boolean;
  isForSale: boolean;
}

export interface SaveHolidayEventRequest {
  name: string;
  description?: string | null;
  opensAt: string;
  closesAt: string;
  pickupStartDt: string;
  pickupEndDt: string;
  isActive?: boolean;
}

export interface SaveMenuItemRequest {
  holidayEventExternalId: string;
  productExternalId?: string | null;
  name: string;
  description?: string | null;
  price: number;
  maxPerOrder?: number | null;
  sortOrder: number;
  isActive?: boolean;
}

export interface SavePickupSlotRequest {
  holidayEventExternalId: string;
  slotStartAt: string;
  slotEndAt: string;
  capacity: number;
  isActive?: boolean;
}

export interface AdminPreOrderLine {
  id: number;
  externalId: string;
  preOrderId: number;
  menuItemId: number;
  quantity: number;
  unitPrice: number;
}

export interface AdminPreOrderPickupSlot {
  id: number;
  externalId: string;
  organizationId: string;
  holidayEventId: number;
  slotStartAt: string;
  slotEndAt: string;
  capacity: number;
  reservedCount: number;
  isActive: boolean;
}

export interface AdminPreOrder {
  id: number;
  externalId: string;
  organizationId: string;
  holidayEventId: number;
  pickupSlotId: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  notes?: string | null;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  pickupSlot?: AdminPreOrderPickupSlot | null;
  lines: AdminPreOrderLine[];
}

export interface AdminRegistrationCode {
  codeId: string;
  code: string;
  email?: string | null;
  userRole: string;
  expiresOn: string;
  isUsed: boolean;
  usedOn?: string | null;
  createdOn: string;
  isExpired: boolean;
  emailSent: boolean;
}

export interface CreateRegistrationCodeRequest {
  email?: string;
  expiryDays: number;
}

@Injectable({
  providedIn: 'root'
})
export class PreorderAdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/mvp`;
  private readonly productsUrl = `${environment.apiUrl}/products`;
  private readonly organizationsUrl = `${environment.apiUrl}/organization`;

  getHolidayEvents(): Observable<AdminHolidayEvent[]> {
    return this.http.get<AdminHolidayEvent[]>(`${this.baseUrl}/preorder-event`);
  }

  createHolidayEvent(request: SaveHolidayEventRequest): Observable<AdminHolidayEvent> {
    return this.http.post<AdminHolidayEvent>(`${this.baseUrl}/preorder-event`, request);
  }

  updateHolidayEvent(holidayEventExternalId: string, request: SaveHolidayEventRequest): Observable<AdminHolidayEvent> {
    return this.http.put<AdminHolidayEvent>(`${this.baseUrl}/preorder-event/${holidayEventExternalId}`, request);
  }

  getMenuItems(holidayEventExternalId: string): Observable<AdminMenuItem[]> {
    const params = new HttpParams().set('holidayEventExternalId', holidayEventExternalId);
    return this.http.get<AdminMenuItem[]>(`${this.baseUrl}/menu-items`, { params });
  }

  createMenuItem(request: SaveMenuItemRequest): Observable<AdminMenuItem> {
    return this.http.post<AdminMenuItem>(`${this.baseUrl}/menu-items`, request);
  }

  updateMenuItem(menuItemExternalId: string, request: SaveMenuItemRequest): Observable<AdminMenuItem> {
    return this.http.put<AdminMenuItem>(`${this.baseUrl}/menu-items/${menuItemExternalId}`, request);
  }

  getPickupSlots(holidayEventExternalId: string): Observable<AdminPickupSlot[]> {
    const params = new HttpParams().set('holidayEventExternalId', holidayEventExternalId);
    return this.http.get<AdminPickupSlot[]>(`${this.baseUrl}/pickup-slots`, { params });
  }

  createPickupSlot(request: SavePickupSlotRequest): Observable<AdminPickupSlot> {
    return this.http.post<AdminPickupSlot>(`${this.baseUrl}/pickup-slots`, request);
  }

  updatePickupSlot(pickupSlotExternalId: string, request: SavePickupSlotRequest): Observable<AdminPickupSlot> {
    return this.http.put<AdminPickupSlot>(`${this.baseUrl}/pickup-slots/${pickupSlotExternalId}`, request);
  }

  getSellableProducts(): Observable<AdminSellableProduct[]> {
    return this.http.get<AdminSellableProduct[]>(this.productsUrl);
  }

  getPreOrders(holidayEventExternalId?: string): Observable<AdminPreOrder[]> {
    let params = new HttpParams();
    if (holidayEventExternalId) {
      params = params.set('holidayEventExternalId', holidayEventExternalId);
    }

    return this.http.get<AdminPreOrder[]>(`${this.baseUrl}/preorders`, { params });
  }

  exportPreOrdersCsv(holidayEventExternalId?: string, pickupDateUtc?: string): Observable<Blob> {
    let params = new HttpParams();
    if (holidayEventExternalId) {
      params = params.set('holidayEventExternalId', holidayEventExternalId);
    }

    if (pickupDateUtc) {
      params = params.set('pickupDateUtc', pickupDateUtc);
    }

    return this.http.get(`${this.baseUrl}/preorders/export.csv`, {
      params,
      responseType: 'blob'
    });
  }

  getRegistrationCodes(orgId: string): Observable<AdminRegistrationCode[]> {
    return this.http.get<AdminRegistrationCode[]>(`${this.organizationsUrl}/${orgId}/registration-codes`);
  }

  createRegistrationCode(orgId: string, request: CreateRegistrationCodeRequest): Observable<AdminRegistrationCode> {
    return this.http.post<AdminRegistrationCode>(`${this.organizationsUrl}/${orgId}/registration-codes`, request);
  }

  deleteRegistrationCode(orgId: string, codeId: string): Observable<void> {
    return this.http.delete<void>(`${this.organizationsUrl}/${orgId}/registration-codes/${codeId}`);
  }

  resendRegistrationCode(orgId: string, codeId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.organizationsUrl}/${orgId}/registration-codes/${codeId}/resend`, {});
  }
}
