import { Injectable, inject } from '@angular/core';
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
  id: number;
  externalId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  notes?: string | null;
  status: string;
  totalAmount: number;
  createdAt: string;
}

export interface PublicOrganizationDtl {
  organizationId: string;
  organizationName: string;
  registrationToken?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface PublicOrderEmailLine {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface PublicSendOrderEmailRequest {
  customerName: string;
  customerEmail: string;
  orderExternalId: string;
  slotStartAt: string;
  slotEndAt: string;
  lines: PublicOrderEmailLine[];
}

@Injectable({
  providedIn: 'root'
})
export class PublicPreorderService {
  private readonly apiUrl = `${environment.apiUrl}/public/preorders`;
  private readonly http = inject(HttpClient);


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

  getOrganizationDetails(orgToken: string): Observable<PublicOrganizationDtl> {
    return this.http.get<unknown>(`${this.apiUrl}/organization-details`, {
      params: { org: orgToken }
    }).pipe(map(organization => this.mapOrganizationDetails(organization)));
  }

  createPreOrder(orgToken: string, request: PublicCreatePreOrderRequest): Observable<PublicPreOrderResponse> {
    return this.http.post<PublicPreOrderResponse>(`${this.apiUrl}/preorders`, request, {
      params: { org: orgToken }
    });
  }

  sendOrderEmail(orgToken: string, request: PublicSendOrderEmailRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/send-order-email`, request, {
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

  private mapOrganizationDetails(value: unknown): PublicOrganizationDtl {
    const organization = value as Record<string, unknown>;

    return {
      organizationId: String(organization['organizationId'] ?? organization['OrganizationId'] ?? ''),
      organizationName: String(organization['organizationName'] ?? organization['OrganizationName'] ?? ''),
      registrationToken: this.readOptionalString(organization, 'registrationToken', 'RegistrationToken'),
      addressLine1: this.readOptionalString(organization, 'addressLine1', 'AddressLine1'),
      addressLine2: this.readOptionalString(organization, 'addressLine2', 'AddressLine2'),
      city: this.readOptionalString(organization, 'city', 'City'),
      state: this.readOptionalString(organization, 'state', 'State'),
      postalCode: this.readOptionalString(organization, 'postalCode', 'PostalCode'),
      country: this.readOptionalString(organization, 'country', 'Country'),
      contactEmail: this.readOptionalString(organization, 'contactEmail', 'ContactEmail'),
      contactPhone: this.readOptionalString(organization, 'contactPhone', 'ContactPhone')
    };
  }

  private readOptionalString(source: Record<string, unknown>, camelKey: string, pascalKey: string): string | undefined {
    const value = source[camelKey] ?? source[pascalKey];
    if (value == null) {
      return undefined;
    }

    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : undefined;
  }
}
