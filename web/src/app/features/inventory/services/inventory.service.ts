// (removed stray method and comments)
// ProductCategory interface for recipe components
export interface ProductCategoryApi {
  id: number;
  externalId?: string;
  categoryName?: string;
  categoryCode?: string;
  description?: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  code?: string;
  description?: string;
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

// Backend API response interface (matches backend InventoryItemDto)
export interface InventoryItemApi {
  id: string;
  externalId?: string;
  name: string;
  sku?: string;
  quantityOnHand: number;
  quantityReserved: number;
  unitOfMeasure: string;
  unitCost: number;
  categoryId?: number;
  batchNumber?: string;
  expirationDate?: string;
  supplierId?: string;
}

// Frontend model interface (with transformed/computed properties)
export interface InventoryItem {
  id: string;
  itemName: string;  // mapped from 'name'
  sku?: string;
  supplierName?: string;  // TODO: Phase 2 - get from supplier relationship
  quantity: number;  // mapped from 'quantityOnHand'
  quantityReserved: number;
  unit: string;  // mapped from 'unitOfMeasure'
  categoryId?: number;
  catName?: string;
  categoryKey?: string;
  sourceType?: 'inventory' | 'recipe-component';
  reorderPoint?: number;  // TODO: Phase 2 - add to backend
  unitCost: number;
  batchNumber?: string;
  expirationDate?: string;
  organizationId?: string;
}

export interface InventoryCategoryApi {
  id: number;
  externalId?: string;
  categoryName?: string;
  categoryCode?: string;
  description?: string;
}

// Accepts either InventoryCategoryApi or ProductCategoryApi
type AnyCategoryApi = InventoryCategoryApi | ProductCategoryApi;

export interface InventoryCategory {
  id: string;
  name: string;
  code?: string;
  description?: string;
}

export interface InventoryRecipeComponentApi {
  externalId: string;
  name: string;
  sku?: string;
  unitPrice: number;
  outputUnitMsr?: string;
  categoryId?: number;
  quantityOnHand?: number;
}

export interface ReceiveGoodsRequest {
  // PHASE 2: Receiving goods from supplier into inventory
  // Maps to: inventory_item table row creation
  // NOTE: These fields (product_id, supplier_id, warehouse_location) are DEFERRED to Phase 3
  // Current implementation: Backend must populate from headers or provide UI picker
  
  name: string;  // Ingredient name (e.g., "All-Purpose Flour")
  sku?: string;  // SKU for tracking (e.g., "FLOUR-001")
  quantity: number;  // Amount received (e.g., 50 pounds)
  unitOfMeasure: string;  // Unit type (e.g., "pounds", "kg", "units")
  unitCost: number;  // Cost per unit (e.g., $0.50/lb)
  batchNumber?: string;  // Supplier batch/lot ID (e.g., "LOT-2025-11-001") for FIFO tracking
  expirationDate?: string;  // When this batch expires (ISO 8601 format)
  
  // PHASE 3 ADDITIONS (Deferred):
  // - productId: UUID - which sellable_product this inventory belongs to
  // - supplierId: UUID - which supplier it came from
  // - warehouseLocation: string - where it's stored
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private readonly apiUrl = `${environment.apiUrl}/inventory`;

  constructor(private http: HttpClient) {}


  /**
   * Get all inventory items for the organization
   */
  getAllInventoryItems(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItemApi[]>(this.apiUrl).pipe(
      map(items => items.map(item => this.mapApiToFrontend(item)))
    );
  }

  /**
   * Get composite inventory items (inventory + recipe components)
   */
  getCompositeInventory(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItemApi[]>(`${this.apiUrl}/composite-list`).pipe(
      map(items => items.map(item => this.mapApiToFrontend(item)))
    );
  }

  /**
   * Get a specific inventory item by ID
   */
  getInventoryItemById(id: string): Observable<InventoryItem> {
    return this.http.get<InventoryItemApi>(`${this.apiUrl}/${id}`).pipe(
      map(item => this.mapApiToFrontend(item))
    );
  }

  /**
   * Get inventory items for a specific supplier
   */
  getInventoryBySupplier(supplierId: string): Observable<InventoryItem[]> {
    return this.http.get<InventoryItemApi[]>(`${this.apiUrl}/supplier/${supplierId}`).pipe(
      map(items => items.map(item => this.mapApiToFrontend(item)))
    );
  }

  /**
   * Get inventory categories (for inventory items)
   */
  getItemCategories(): Observable<InventoryCategory[]> {
    return this.http.get<InventoryCategoryApi[]>(`${this.apiUrl}/item-categories`).pipe(
      map(categories => categories.map(category => this.mapCategoryApiToFrontend(category)))
    );
  }

  /**
   * Get all categories (InventoryCategory + ProductCategory) for dropdowns
   */
  getAllCategories(): Observable<InventoryCategory[]> {
    return this.http.get<InventoryCategoryApi[]>(`${this.apiUrl}/item-categories`).pipe(
      switchMap(itemCategories =>
        this.getProductCategories().pipe(
          map(productCategories => [
            ...itemCategories.map(c => this.mapCategoryApiToFrontend(c)),
            ...productCategories.map(c => ({
              id: String(c.id),
              name: c.name,
              code: c.code,
              description: c.description
            }))
          ])
        )
      )
    );
  }


  /**
   * Get product categories (for recipe components)
   */
  getProductCategories(): Observable<ProductCategory[]> {
    return this.http.get<ProductCategoryApi[]>(`${this.apiUrl}/product-categories`).pipe(
      map(categories => categories.map(category => ({
        id: category.id,
        name: String(category.categoryName ?? ''),
        code: category.categoryCode ? String(category.categoryCode) : undefined,
        description: category.description ? String(category.description) : undefined
      })))
    );
  }
  
  /**
   * Get recipe components as inventory items, with category mapping from ProductCategory
   * Optionally pass categories for mapping; if not provided, fetch them.
   */
  /**
   * Get recipe components as inventory items, with category mapping from ProductCategory
   * Optionally pass product categories for mapping; if not provided, fetch them.
   */
  /**
   * Get recipe components as inventory items, with category mapping from ProductCategory
   * Optionally pass product categories for mapping; if not provided, fetch them.
   *
   * NOTE: For most use cases, use getCompositeInventory() to get both inventory and recipe components together.
   */
  getRecipeComponents(productCategories?: ProductCategory[]): Observable<InventoryItem[]> {
    if (productCategories) {
      return this.http.get<InventoryRecipeComponentApi[]>(`${this.apiUrl}/recipe-components`).pipe(
        map(components => components.map(component => this.mapRecipeComponentToInventoryItem(component, productCategories)))
      );
    } else {
      // Fetch product categories first, then map
      return this.getProductCategories().pipe(
        switchMap(productCategoryList =>
          this.http.get<InventoryRecipeComponentApi[]>(`${this.apiUrl}/recipe-components`).pipe(
            map(components => components.map(component => this.mapRecipeComponentToInventoryItem(component, productCategoryList)))
          )
        )
      );
    }
  }

  /**
   * Receive goods into inventory
   */
  receiveGoods(request: ReceiveGoodsRequest): Observable<InventoryItem> {
    return this.http.post<InventoryItemApi>(this.apiUrl, request).pipe(
      map(item => this.mapApiToFrontend(item))
    );
  }

  // ===== Phase 2: Business Logic Methods =====

  /**
   * Get low stock items (below reorder point)
   */
  getLowStockItems(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItemApi[]>(`${this.apiUrl}/low-stock`).pipe(
      map(items => items.map(item => this.mapApiToFrontend(item)))
    );
  }

  /**
   * Get items expiring soon
   */
  getExpiringItems(daysUntilExpiration: number = 7): Observable<InventoryItem[]> {
    return this.http.get<InventoryItemApi[]>(`${this.apiUrl}/expiring-soon`, {
      params: { daysUntilExpiration: daysUntilExpiration.toString() }
    }).pipe(
      map(items => items.map(item => this.mapApiToFrontend(item)))
    );
  }

  /**
   * Reserve inventory for an order
   */
  reserveInventory(inventoryItemId: string, quantity: number, referenceId: string): Observable<AvailabilityResponse> {
    const request = { quantity, referenceId };
    return this.http.post<AvailabilityResponse>(`${this.apiUrl}/${inventoryItemId}/reserve`, request);
  }

  /**
   * Map backend API response to frontend model
   */
  private mapApiToFrontend(apiItem: InventoryItemApi): InventoryItem {
    const item = apiItem as unknown as Record<string, unknown>;
    const quantityOnHand = Number(item['quantityOnHand'] ?? item['QuantityOnHand'] ?? 0);
    const quantityReserved = Number(item['quantityReserved'] ?? item['QuantityReserved'] ?? 0);
    const unitCost = Number(item['unitCost'] ?? item['UnitCost'] ?? 0);
    const categoryRaw = item['categoryId'] ?? item['CategoryId'] ?? item['category_id'];
    let parsedCategoryId: number | undefined = undefined;
    if (categoryRaw !== null && categoryRaw !== undefined && categoryRaw !== '') {
      const num = Number(categoryRaw);
      parsedCategoryId = Number.isNaN(num) ? undefined : num;
    }

    return {
      id: String(item['externalId'] ?? item['ExternalId'] ?? item['id'] ?? item['Id'] ?? ''),
      itemName: String(item['itemName'] ?? item['name'] ?? ''),
      sku: typeof item['sku'] === 'string' ? item['sku'] : (typeof item['Sku'] === 'string' ? item['Sku'] : undefined),
      supplierName: undefined,  // TODO: Phase 2 - fetch from supplier endpoint
      quantity: quantityOnHand,
      quantityReserved: quantityReserved,
      unit: String(item['unitOfMeasure'] ?? item['UnitOfMeasure'] ?? ''),
      categoryId: parsedCategoryId,
      reorderPoint: undefined,  // TODO: Phase 2 - add to backend
      unitCost: unitCost,
      batchNumber: typeof item['batchNumber'] === 'string' ? item['batchNumber'] : (typeof item['BatchNumber'] === 'string' ? item['BatchNumber'] : undefined),
      expirationDate: typeof item['expirationDate'] === 'string' ? item['expirationDate'] : (typeof item['ExpirationDate'] === 'string' ? item['ExpirationDate'] : undefined)
    };
  }

  /**
   * Map InventoryCategoryApi or ProductCategoryApi to InventoryCategory for dropdowns
   */
  private mapCategoryApiToFrontend(category: AnyCategoryApi): InventoryCategory {
    const record = category as unknown as Record<string, unknown>;
    const rawId = record['id'] ?? record['Id'];
    // Accept both 'categoryName' and 'name' for compatibility
    const rawName = record['categoryName'] ?? record['CategoryName'] ?? record['name'];
    const rawCode = record['categoryCode'] ?? record['CategoryCode'] ?? record['code'];
    const rawDescription = record['description'] ?? record['Description'];

    return {
      id: String(rawId ?? ''),
      name: String(rawName ?? ''),
      code: rawCode ? String(rawCode) : undefined,
      description: rawDescription ? String(rawDescription) : undefined
    };
  }

  /**
   * Map a recipe component API object to an InventoryItem, using ProductCategory for category fields.
   */
  /**
   * Map a recipe component API object to an InventoryItem, using ProductCategory for category fields.
   */
  private mapRecipeComponentToInventoryItem(
    component: InventoryRecipeComponentApi,
    productCategories?: ProductCategory[]
  ): InventoryItem {
    const record = component as unknown as Record<string, unknown>;
    const externalId = String(record['externalId'] ?? record['ExternalId'] ?? '');
    const itemName = String(record['itemName'] ?? record['name'] ?? record['Name'] ?? '');
    const sku = typeof record['sku'] === 'string' ? record['sku'] : (typeof record['Sku'] === 'string' ? record['Sku'] : undefined);
    const unitPrice = Number(record['unitPrice'] ?? record['UnitPrice'] ?? 0);
    const quantityOnHand = Number(record['quantityOnHand'] ?? record['quantity_on_hand'] ?? 0);

    const outputUnitMsr = typeof record['outputUnitMsr'] === 'string'
      ? record['outputUnitMsr']
      : (typeof record['OutputUnitMsr'] === 'string' ? record['OutputUnitMsr'] : undefined);

    // Try to get category info from the component/product category list
    let categoryId: number | undefined = undefined;
    let categoryName: string | undefined = undefined;
    let categoryKey: string | undefined = undefined;
    if (productCategories && record['categoryId'] !== undefined && record['categoryId'] !== null) {
      const catIdNum = Number(record['categoryId']);
      if (!Number.isNaN(catIdNum)) {
        const found = productCategories.find(cat => cat.id === catIdNum);
        if (found) {
          categoryId = catIdNum;
          categoryName = found.name
          categoryKey = found.code;
        } else {
          // Debug: log missing category match
          // eslint-disable-next-line no-console
          console.warn('Recipe component categoryId not found in product categories:', catIdNum, productCategories.map(c => c.id));
        }
      } else {
        // eslint-disable-next-line no-console
        console.warn('Recipe component has invalid categoryId:', record['categoryId']);
      }
    } else {
      // eslint-disable-next-line no-console
      console.warn('Recipe component missing categoryId:', record);
    }

    return {
      id: externalId,
      itemName: itemName,
      sku,
      quantity: quantityOnHand,
      quantityReserved: 0,
      unit: outputUnitMsr ?? 'units',
      unitCost: Number.isNaN(unitPrice) ? 0 : unitPrice,
      categoryId,
      catName: categoryName,
      categoryKey,
      sourceType: 'recipe-component'
    };
  }
}

export interface AvailabilityResponse {
  inventoryItemId: string;
  isAvailable: boolean;
  requestedQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  message: string;
}
