import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Order {
  id: number;
  externalId: string; // UUID for API routing and display
  orderNumber: string;
  customerId: string;
  eventToken?: string;
  eventName?: string;
  orderDate: string;
  orderStatus: string;  // PENDING, CONFIRMED, COMPLETED, CANCELLED
  totalAmount: number;
  organizationId: string;
  specialInstructionTxt?: string;
  customerName?: string;
  items?: OrderLineItem[] | null;
  pickupSlot?: OrderPickupSlot | null;
  organization?: OrganizationDtl | null; // Organization details including registration token
}

export interface OrganizationDtl {
  organizationId?: string | null;
  organizationName?: string | null;
  registrationToken?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}


export interface OrderLineItem {
  id: number;
  externalId: string;
  menuItemId: number;
  menuItemExternalId?: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  customizations?: string;
}

export interface OrderPickupSlot {
  id: number;
  externalId: string;
  slotStartAt: string;
  slotEndAt: string;
}

export interface AvailablePickupSlot {
  externalId: string;
  holidayEventId: number;
  slotStartAt: string;
  slotEndAt: string;
  capacity: number;
  reservedCount: number;
  isActive: boolean;
}

export interface CreateOrderRequest {
  customerId: string;
  orderItems: OrderItemRequest[];
}

export interface OrderItemRequest {
  productId: string;
  quantity: number;
  unitPrice: number;
}
export interface UpdateOrderRequest {
  customerId?: string;
  specialInstructionTxt?: string;
}
export interface UpdateOrderStatusRequest {
  newStatus: string;
}

export interface ChangePickupSlotRequest {
  pickupSlotExternalId: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrdersService {
  private readonly apiBaseUrl = window.__env.NG_APP_API_URL;
  private readonly http = inject(HttpClient);
  private apiUrl: string;  
  private apiOrdersUrl: string;  

  constructor() {
    this.apiUrl = `${this.apiBaseUrl}/public/preorders`;
    this.apiOrdersUrl = `${this.apiBaseUrl}/orders`;
  }

  /**
   * Get a specific order by external ID (UUID)
   * @param externalId - The UUID external_id from database
   */
  getOrderByExternalId(externalId: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${externalId}`);
  }

  /**
   * Update order status
   * @param externalId - The UUID external_id from database
   */
  updateOrderStatus(externalId: string, request: UpdateOrderStatusRequest): Observable<Order> {
    return this.http.put<Order>(`${this.apiUrl}/${externalId}/status`, request);
  }

  // ===== Phase 2: Business Logic Methods =====

  getAvailablePickupSlots(organizationToken: string, holidayEventExternalId: string): Observable<AvailablePickupSlot[]> {
    return this.http.get<AvailablePickupSlot[]>(`${this.apiUrl}/pickup-slots`, {
      params: {
        org: organizationToken,
        holidayEventExternalId
      }
    });
  }

  changePickupSlot(externalId: string, request: ChangePickupSlotRequest): Observable<Order> {
    console.log('Changing pickup slot for order', externalId, 'to slot', request.pickupSlotExternalId);
    return this.http.put<Order>(`${this.apiOrdersUrl}/${externalId}/pickup-slot`, request);
  }

  /**
   * Cancel an order
   * @param externalId - The UUID external_id from database
   */
  cancelOrder(externalId: string): Observable<Order> {
    return this.http.put<Order>(`${this.apiOrdersUrl}/${externalId}/cancel`, {});
  }

}

export interface CreateOrderItemRequest {
  sellableProductExternalId: string;
  quantity: number;
  customizations?: string;
}

export interface AvailabilityCheckResponse {
  allItemsAvailable: boolean;
  items: ItemAvailability[];
  message: string;
}

export interface ItemAvailability {
  inventoryItemId: string;
  productId: string;
  productName: string;
  requestedQuantity: number;
  availableQuantity: number;
  isAvailable: boolean;
}

export interface PickListDto {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  items: PickListItemDto[];
  totalQuantity: number;
  specialInstructions: string;
}

export interface PickListItemDto {
  orderItemId: string;
  inventoryItemId: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitOfMeasure: string;
  warehouseLocation?: string;
  batchNumber?: string;
  expirationDate?: string;
  customizations?: string;
}
