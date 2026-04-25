import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PublicHolidayEvent {
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

export interface PublicMenuItem {
  id: number;
  externalId: string;
  holidayEventId: number;
  name: string;
  description?: string | null;
  price: number;
  maxPerOrder?: number | null;
  sortOrder: number;
  isActive: boolean;
}

export interface PublicPickupSlot {
  id: number;
  externalId: string;
  holidayEventId: number;
  slotStartAt: string;
  slotEndAt: string;
  capacity: number;
  reservedCount: number;
  isActive: boolean;
}

export interface PublicPreOrderLineRequest {
  menuItemExternalId: string;
  quantity: number;
}

export interface PublicCreatePreOrderRequest {
  holidayEventExternalId: string;
  pickupSlotExternalId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
  lines: PublicPreOrderLineRequest[];
}

export interface PublicPreOrderResponse {
  externalId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  notes?: string | null;
  status: string;
  totalAmount: number;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class PublicPreorderService {
  private readonly apiUrl = `${environment.apiUrl}/public/preorders`;

  constructor(private readonly http: HttpClient) {}

  getHolidayEvents(orgToken: string): Observable<PublicHolidayEvent[]> {
    return this.http.get<unknown[]>(`${this.apiUrl}/preorder-event`, {
      params: { org: orgToken }
    }).pipe(map(events => events.map(event => this.mapHolidayEvent(event))));
  }

  getMenuItems(orgToken: string, holidayEventExternalId: string): Observable<PublicMenuItem[]> {
    return this.http.get<PublicMenuItem[]>(`${this.apiUrl}/menu-items`, {
      params: { org: orgToken, holidayEventExternalId }
    });
  }

  getPickupSlots(orgToken: string, holidayEventExternalId: string): Observable<PublicPickupSlot[]> {
    return this.http.get<unknown[]>(`${this.apiUrl}/pickup-slots`, {
      params: { org: orgToken, holidayEventExternalId }
    }).pipe(map(slots => slots.map(slot => this.mapPickupSlot(slot))));
  }

  createPreOrder(orgToken: string, request: PublicCreatePreOrderRequest): Observable<PublicPreOrderResponse> {
    return this.http.post<PublicPreOrderResponse>(`${this.apiUrl}/preorders`, request, {
      params: { org: orgToken }
    });
  }

  private mapHolidayEvent(value: unknown): PublicHolidayEvent {
    const event = value as Record<string, unknown>;

    return {
      id: Number(event['id'] ?? 0),
      externalId: String(event['externalId'] ?? event['ExternalId'] ?? ''),
      name: String(event['name'] ?? event['Name'] ?? ''),
      description: (event['description'] ?? event['Description'] ?? null) as string | null,
      opensAt: String(event['opensAt'] ?? event['OpensAt'] ?? ''),
      closesAt: String(event['closesAt'] ?? event['ClosesAt'] ?? ''),
      pickupStartDt: String(event['pickupStartDt'] ?? event['PickupStartDt'] ?? ''),
      pickupEndDt: String(event['pickupEndDt'] ?? event['PickupEndDt'] ?? ''),
      isActive: Boolean(event['isActive'] ?? event['IsActive'])
    };
  }

  private mapPickupSlot(value: unknown): PublicPickupSlot {
    const slot = value as Record<string, unknown>;

    return {
      id: Number(slot['id'] ?? 0),
      externalId: String(slot['externalId'] ?? slot['ExternalId'] ?? ''),
      holidayEventId: Number(slot['holidayEventId'] ?? slot['HolidayEventId'] ?? 0),
      slotStartAt: String(slot['slotStartAt'] ?? slot['SlotStartAt'] ?? ''),
      slotEndAt: String(slot['slotEndAt'] ?? slot['SlotEndAt'] ?? ''),
      capacity: Number(slot['capacity'] ?? slot['Capacity'] ?? 0),
      reservedCount: Number(slot['reservedCount'] ?? slot['ReservedCount'] ?? 0),
      isActive: Boolean(slot['isActive'] ?? slot['IsActive'])
    };
  }
}
