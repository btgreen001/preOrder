import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, catchError, throwError } from 'rxjs';

export interface InventoryItem {
  id?: number;
  externalId: string;
  name: string;
  sku?: string;
  categoryId: number;
  quantityOnHand: number;
  quantityReserved?: number;
  quantityAvailable?: number;
  unitOfMeasure: string;
  reorderPoint: number;
  unitCost: number;
  expirationDate?: string;
  supplierName?: string;
  lastUpdated?: string;
  description?: string;
  barcode?: string;
  location?: string;
  batchNumber?: string;
}

export interface InventoryMovement {
  id: number;
  externalId: string;
  movementType: string;
  quantityChange: number;
  reason?: string;
  referenceId?: string;
  createdAt: string;
}

export interface CreateInventoryItemRequest {
  name: string;
  description?: string;
  sku?: string;
  quantity: number;
  unitOfMeasure: string;
  unitCost: number;
  categoryId: number;
  reorderPoint?: number;
  warehouseLocation?: string;
  batchNumber?: string;
  expirationDate?: string;
}

export interface UpdateInventoryItemRequest {
  name: string;
  description?: string;
  sku?: string;
  categoryId: number;
  quantityOnHand: number;
  unitOfMeasure: string;
  unitCost: number;
  reorderPoint?: number;
  warehouseLocation?: string;
  batchNumber?: string;
  expirationDate?: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  createdDate: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  paymentTerms: string;
  leadTime: number; // in days
  active: boolean;
  createdDate: string;
}

export interface Batch {
  id: string;
  itemId: string;
  itemName: string;
  batchNumber: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  supplier: string;
  receivedDate: string;
  expirationDate?: string;
  location: string;
  status: 'active' | 'expired' | 'used';
}

export interface InventorySummary {
  totalItems: number;
  lowStock: number;
  expiringSoon: number;
  totalValue: number;
  categoriesCount: number;
  suppliersCount: number;
}

export interface InventoryAlert {
  id: string;
  type: 'low-stock' | 'expiring-soon' | 'out-of-stock';
  itemId: string;
  itemName: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  createdDate: string;
}

export interface RecipeIngredient {
  id?: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  cost?: number;
  notes?: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  category: string;
  yield: number;
  yieldUnit: string;
  prepTime: number; // in minutes
  cookTime: number; // in minutes
  costPerUnit: number;
  ingredients: RecipeIngredient[];
  instructions: string[];
  createdDate: string;
  lastModified: string;
}

export interface WasteRecord {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  reason: 'expired' | 'damaged' | 'spoilage' | 'theft' | 'other';
  cost: number;
  recordedBy: string;
  recordedDate: string;
  notes?: string;
}

export interface ReconciliationRecord {
  id: string;
  itemId: string;
  itemName: string;
  systemCount: number;
  physicalCount: number;
  variance: number;
  unit: string;
  reconciledBy: string;
  reconciledDate: string;
  notes?: string;
}

export interface InventorySettings {
  defaultReorderPoint: number;
  lowStockThreshold: number;
  expiringSoonDays: number;
  autoReorderEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  notificationEmail: string;
  currency: string;
  dateFormat: string;
  autoBackupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/inventory`;

  constructor() {}

  // Inventory Items
  getItems(): Observable<InventoryItem[]> {
    return this.http.get<any[]>(`${import.meta.env.NG_APP_API_URL}`).pipe(
      map(items => this.mapDtoToInventoryItem(items)),
      catchError((error) => throwError(() => error))
    );
  }

  getItem(id: string): Observable<InventoryItem> {
    return this.http.get<any>(`${import.meta.env.NG_APP_API_URL}/${id}`).pipe(
      map(dto => this.normalizeInventoryItem(dto))
    );
  }

  createItem(item: CreateInventoryItemRequest): Observable<InventoryItem> {
    return this.http.post<any>(`${import.meta.env.NG_APP_API_URL}/receive`, item).pipe(
      map(dto => this.normalizeInventoryItem(dto))
    );
  }

  updateItem(id: string, item: UpdateInventoryItemRequest): Observable<InventoryItem> {
    return this.http.put<any>(`${import.meta.env.NG_APP_API_URL}/${id}`, item).pipe(
      map(dto => this.normalizeInventoryItem(dto))
    );
  }

  deleteItem(id: string): Observable<void> {
    return this.http.delete<void>(`${import.meta.env.NG_APP_API_URL}/${id}`);
  }

  getMovements(id: string): Observable<InventoryMovement[]> {
    return this.http.get<InventoryMovement[]>(`${import.meta.env.NG_APP_API_URL}/${id}/movements`);
  }

  // Categories
  getCategories(): Observable<InventoryCategory[]> {
    return this.http.get<InventoryCategory[]>(`${import.meta.env.NG_APP_API_URL}/categories`).pipe(
      catchError(() => this.getMockCategories())
    );
  }

  getCategory(id: string): Observable<InventoryCategory> {
    return this.http.get<InventoryCategory>(`${import.meta.env.NG_APP_API_URL}/categories/${id}`);
  }

  createCategory(category: Omit<InventoryCategory, 'id' | 'itemCount' | 'createdDate'>): Observable<InventoryCategory> {
    return this.http.post<InventoryCategory>(`${import.meta.env.NG_APP_API_URL}/categories`, category);
  }

  updateCategory(id: string, category: Partial<InventoryCategory>): Observable<InventoryCategory> {
    return this.http.put<InventoryCategory>(`${import.meta.env.NG_APP_API_URL}/categories/${id}`, category);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${import.meta.env.NG_APP_API_URL}/categories/${id}`);
  }

  // Suppliers
  getSuppliers(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(`${import.meta.env.NG_APP_API_URL}/suppliers`).pipe(
      catchError(() => this.getMockSuppliers())
    );
  }

  getSupplier(id: string): Observable<Supplier> {
    return this.http.get<Supplier>(`${import.meta.env.NG_APP_API_URL}/suppliers/${id}`);
  }

  createSupplier(supplier: Omit<Supplier, 'id' | 'createdDate'>): Observable<Supplier> {
    return this.http.post<Supplier>(`${import.meta.env.NG_APP_API_URL}/suppliers`, supplier);
  }

  updateSupplier(id: string, supplier: Partial<Supplier>): Observable<Supplier> {
    return this.http.put<Supplier>(`${import.meta.env.NG_APP_API_URL}/suppliers/${id}`, supplier);
  }

  deleteSupplier(id: string): Observable<void> {
    return this.http.delete<void>(`${import.meta.env.NG_APP_API_URL}/suppliers/${id}`);
  }

  // Batches
  getBatches(): Observable<Batch[]> {
    return this.http.get<Batch[]>(`${import.meta.env.NG_APP_API_URL}/batches`).pipe(
      catchError(() => this.getMockBatches())
    );
  }

  getBatch(id: string): Observable<Batch> {
    return this.http.get<Batch>(`${import.meta.env.NG_APP_API_URL}/batches/${id}`).pipe(
      catchError(() => this.getMockBatches().pipe(map(list => list.find(b => b.id === id) as Batch)))
    );
  }

  createBatch(batch: Omit<Batch, 'id'>): Observable<Batch> {
    return this.http.post<Batch>(`${import.meta.env.NG_APP_API_URL}/batches`, batch);
  }

  updateBatch(id: string, batch: Partial<Batch>): Observable<Batch> {
    return this.http.put<Batch>(`${import.meta.env.NG_APP_API_URL}/batches/${id}`, batch).pipe(
      catchError(() => {
        // Mock update: merge with a matching mock batch
        return this.getMockBatches().pipe(
          map(list => {
            const current = list.find(b => b.id === id);
            return { ...(current as Batch), ...(batch as Partial<Batch>) } as Batch;
          })
        );
      })
    );
  }

  deleteBatch(id: string): Observable<void> {
    return this.http.delete<void>(`${import.meta.env.NG_APP_API_URL}/batches/${id}`).pipe(
      catchError(() => of(void 0))
    );
  }

  // Recipes
  getRecipes(): Observable<Recipe[]> {
    return this.http.get<Recipe[]>(`${import.meta.env.NG_APP_API_URL}/recipes`);
  }

  getRecipe(id: string): Observable<Recipe> {
    return this.http.get<Recipe>(`${import.meta.env.NG_APP_API_URL}/recipes/${id}`);
  }

  createRecipe(recipe: Omit<Recipe, 'id' | 'createdDate' | 'lastModified'>): Observable<Recipe> {
    return this.http.post<Recipe>(`${import.meta.env.NG_APP_API_URL}/recipes`, recipe);
  }

  updateRecipe(id: string, recipe: Partial<Recipe>): Observable<Recipe> {
    return this.http.put<Recipe>(`${import.meta.env.NG_APP_API_URL}/recipes/${id}`, recipe);
  }

  deleteRecipe(id: string): Observable<void> {
    return this.http.delete<void>(`${import.meta.env.NG_APP_API_URL}/recipes/${id}`);
  }

  // Waste Tracking
  getWasteRecords(): Observable<WasteRecord[]> {
    return this.http.get<WasteRecord[]>(`${import.meta.env.NG_APP_API_URL}/waste`).pipe(
      catchError(() => this.getMockWasteRecords())
    );
  }

  createWasteRecord(wasteRecord: Omit<WasteRecord, 'id' | 'recordedDate'>): Observable<WasteRecord> {
    return this.http.post<WasteRecord>(`${import.meta.env.NG_APP_API_URL}/waste`, wasteRecord);
  }

  // Reconciliation
  getReconciliationRecords(): Observable<ReconciliationRecord[]> {
    return this.http.get<ReconciliationRecord[]>(`${import.meta.env.NG_APP_API_URL}/reconciliation`).pipe(
      catchError(() => this.getMockReconciliationRecords())
    );
  }

  createReconciliationRecord(record: Omit<ReconciliationRecord, 'id' | 'reconciledDate'>): Observable<ReconciliationRecord> {
    return this.http.post<ReconciliationRecord>(`${import.meta.env.NG_APP_API_URL}/reconciliation`, record);
  }

  // Settings
  getSettings(): Observable<InventorySettings> {
    return this.http.get<InventorySettings>(`${import.meta.env.NG_APP_API_URL}/settings`).pipe(
      catchError(() => this.getMockSettings())
    );
  }

  updateSettings(settings: InventorySettings): Observable<InventorySettings> {
    return this.http.put<InventorySettings>(`${import.meta.env.NG_APP_API_URL}/settings`, settings);
  }

  // Mock data methods for development
  private getMockItems(): Observable<InventoryItem[]> {
    const mockItems: any[] = [
      {
        id: 'item-001',
        name: 'All-Purpose Flour',
        category: 'Dry Goods',
        currentStock: 15,
        unit: 'lbs',
        reorderPoint: 25,
        costPerUnit: 0.25,
        supplier: 'Premium Flour Co.',
        lastUpdated: new Date().toISOString(),
        description: 'High-quality all-purpose flour for baking',
        barcode: '123456789012',
        location: 'Dry Storage A1'
      },
      {
        id: 'item-002',
        name: 'Whole Milk',
        category: 'Dairy',
        currentStock: 8,
        unit: 'gallons',
        reorderPoint: 10,
        costPerUnit: 3.50,
        supplier: 'Fresh Dairy Farms',
        lastUpdated: new Date().toISOString(),
        description: 'Fresh whole milk for baking and beverages',
        expirationDate: '2025-01-18',
        barcode: '123456789013',
        location: 'Refrigerator R1'
      },
      {
        id: 'item-003',
        name: 'Brown Sugar',
        category: 'Dry Goods',
        currentStock: 8,
        unit: 'lbs',
        reorderPoint: 15,
        costPerUnit: 1.20,
        supplier: 'Sweet Supplies Inc.',
        lastUpdated: new Date().toISOString(),
        description: 'Light brown sugar for recipes',
        barcode: '123456789014',
        location: 'Dry Storage A2'
      },
      {
        id: 'item-004',
        name: 'Heavy Cream',
        category: 'Dairy',
        currentStock: 12,
        unit: 'pints',
        reorderPoint: 8,
        costPerUnit: 2.75,
        supplier: 'Fresh Dairy Farms',
        lastUpdated: new Date().toISOString(),
        description: 'Heavy whipping cream for desserts',
        expirationDate: '2025-01-20',
        barcode: '123456789015',
        location: 'Refrigerator R2'
      },
      {
        id: 'item-005',
        name: 'Vanilla Extract',
        category: 'Flavorings',
        currentStock: 0,
        unit: 'bottles',
        reorderPoint: 3,
        costPerUnit: 8.50,
        supplier: 'Flavor Masters',
        lastUpdated: new Date().toISOString(),
        description: 'Pure vanilla extract',
        barcode: '123456789016',
        location: 'Pantry P1'
      },
      {
        id: 'item-006',
        name: 'Butter',
        category: 'Dairy',
        currentStock: 25,
        unit: 'lbs',
        reorderPoint: 20,
        costPerUnit: 4.25,
        supplier: 'Fresh Dairy Farms',
        lastUpdated: new Date().toISOString(),
        description: 'Unsalted butter for baking',
        expirationDate: '2025-02-15',
        barcode: '123456789017',
        location: 'Freezer F1'
      },
      {
        id: 'item-007',
        name: 'Eggs',
        category: 'Dairy',
        currentStock: 60,
        unit: 'dozen',
        reorderPoint: 40,
        costPerUnit: 3.75,
        supplier: 'Farm Fresh Eggs',
        lastUpdated: new Date().toISOString(),
        description: 'Large grade A eggs',
        expirationDate: '2025-01-25',
        barcode: '123456789018',
        location: 'Refrigerator R3'
      },
      {
        id: 'item-008',
        name: 'Granulated Sugar',
        category: 'Dry Goods',
        currentStock: 45,
        unit: 'lbs',
        reorderPoint: 30,
        costPerUnit: 0.45,
        supplier: 'Sweet Supplies Inc.',
        lastUpdated: new Date().toISOString(),
        description: 'White granulated sugar',
        barcode: '123456789019',
        location: 'Dry Storage A3'
      }
    ];
    return of(mockItems.map(item => ({
      externalId: item.id,
      name: item.name,
      categoryId: item.categoryId,
      quantityOnHand: item.currentStock,
      unitOfMeasure: item.unit,
      reorderPoint: item.reorderPoint,
      unitCost: item.costPerUnit,
      expirationDate: item.expirationDate,
      supplierName: item.supplier,
      lastUpdated: item.lastUpdated,
      description: item.description,
      barcode: item.barcode,
      location: item.location,
      batchNumber: item.batchNumber
    })));
  }

  private getMockCategories(): Observable<InventoryCategory[]> {
    const mockCategories: InventoryCategory[] = [
      {
        id: 'cat-001',
        name: 'Dry Goods',
        description: 'Flours, sugars, and dry baking ingredients',
        itemCount: 12,
        createdDate: '2024-01-15T00:00:00Z'
      },
      {
        id: 'cat-002',
        name: 'Dairy',
        description: 'Milk, cream, butter, eggs, and dairy products',
        itemCount: 8,
        createdDate: '2024-01-15T00:00:00Z'
      },
      {
        id: 'cat-003',
        name: 'Flavorings',
        description: 'Extracts, spices, and flavor enhancers',
        itemCount: 15,
        createdDate: '2024-01-15T00:00:00Z'
      },
      {
        id: 'cat-004',
        name: 'Fruits',
        description: 'Fresh and preserved fruits for baking',
        itemCount: 6,
        createdDate: '2024-01-15T00:00:00Z'
      },
      {
        id: 'cat-005',
        name: 'Packaging',
        description: 'Boxes, bags, and packaging materials',
        itemCount: 9,
        createdDate: '2024-01-15T00:00:00Z'
      }
    ];
    return of(mockCategories);
  }

  private getMockBatches(): Observable<Batch[]> {
    const mockBatches: Batch[] = [
      {
        id: 'batch-001',
        itemId: 'item-001',
        itemName: 'All-Purpose Flour',
        batchNumber: 'BATCH-2025-001',
        quantity: 100,
        unit: 'lbs',
        costPerUnit: 0.25,
        supplier: 'Premium Flour Co.',
        receivedDate: '2025-01-10',
        expirationDate: '2025-07-10',
        location: 'Dry Storage A1',
        status: 'active'
      },
      {
        id: 'batch-002',
        itemId: 'item-002',
        itemName: 'Whole Milk',
        batchNumber: 'BATCH-2025-002',
        quantity: 20,
        unit: 'gallons',
        costPerUnit: 3.50,
        supplier: 'Fresh Dairy Farms',
        receivedDate: '2025-01-08',
        expirationDate: '2025-01-18',
        location: 'Refrigerator R1',
        status: 'active'
      },
      {
        id: 'batch-003',
        itemId: 'item-003',
        itemName: 'Brown Sugar',
        batchNumber: 'BATCH-2025-003',
        quantity: 25,
        unit: 'lbs',
        costPerUnit: 1.20,
        supplier: 'Sweet Supplies Inc.',
        receivedDate: '2025-01-05',
        expirationDate: '2025-12-05',
        location: 'Dry Storage A2',
        status: 'active'
      },
      {
        id: 'batch-004',
        itemId: 'item-004',
        itemName: 'Heavy Cream',
        batchNumber: 'BATCH-2025-004',
        quantity: 15,
        unit: 'pints',
        costPerUnit: 2.75,
        supplier: 'Fresh Dairy Farms',
        receivedDate: '2025-01-07',
        expirationDate: '2025-01-20',
        location: 'Refrigerator R2',
        status: 'active'
      },
      {
        id: 'batch-005',
        itemId: 'item-006',
        itemName: 'Butter',
        batchNumber: 'BATCH-2025-005',
        quantity: 50,
        unit: 'lbs',
        costPerUnit: 4.25,
        supplier: 'Fresh Dairy Farms',
        receivedDate: '2025-01-03',
        expirationDate: '2025-02-15',
        location: 'Freezer F1',
        status: 'active'
      },
      {
        id: 'batch-006',
        itemId: 'item-007',
        itemName: 'Eggs',
        batchNumber: 'BATCH-2025-006',
        quantity: 120,
        unit: 'dozen',
        costPerUnit: 3.75,
        supplier: 'Farm Fresh Eggs',
        receivedDate: '2025-01-09',
        expirationDate: '2025-01-25',
        location: 'Refrigerator R3',
        status: 'active'
      },
      {
        id: 'batch-007',
        itemId: 'item-008',
        itemName: 'Granulated Sugar',
        batchNumber: 'BATCH-2025-007',
        quantity: 75,
        unit: 'lbs',
        costPerUnit: 0.45,
        supplier: 'Sweet Supplies Inc.',
        receivedDate: '2025-01-02',
        expirationDate: '2025-12-02',
        location: 'Dry Storage A3',
        status: 'active'
      },
      {
        id: 'batch-008',
        itemId: 'item-002',
        itemName: 'Whole Milk',
        batchNumber: 'BATCH-2024-045',
        quantity: 10,
        unit: 'gallons',
        costPerUnit: 3.50,
        supplier: 'Fresh Dairy Farms',
        receivedDate: '2024-12-15',
        expirationDate: '2024-12-25',
        location: 'Refrigerator R1',
        status: 'expired'
      },
      {
        id: 'batch-009',
        itemId: 'item-001',
        itemName: 'All-Purpose Flour',
        batchNumber: 'BATCH-2024-030',
        quantity: 80,
        unit: 'lbs',
        costPerUnit: 0.25,
        supplier: 'Premium Flour Co.',
        receivedDate: '2024-11-20',
        expirationDate: '2025-05-20',
        location: 'Dry Storage A1',
        status: 'used'
      },
      {
        id: 'batch-010',
        itemId: 'item-005',
        itemName: 'Vanilla Extract',
        batchNumber: 'BATCH-2025-008',
        quantity: 5,
        unit: 'bottles',
        costPerUnit: 8.50,
        supplier: 'Flavor Masters',
        receivedDate: '2025-01-01',
        expirationDate: '2026-01-01',
        location: 'Pantry P1',
        status: 'active'
      }
    ];
    return of(mockBatches);
  }

  private getMockSuppliers(): Observable<Supplier[]> {
    const mockSuppliers: Supplier[] = [
      {
        id: 'sup-001',
        name: 'Premium Flour Co.',
        contactName: 'John Smith',
        email: 'john@premiumflour.com',
        phone: '(555) 123-4567',
        address: '123 Industrial Blvd, Milling City, MC 12345',
        paymentTerms: 'Net 30',
        leadTime: 7,
        active: true,
        createdDate: '2024-01-15T00:00:00Z'
      },
      {
        id: 'sup-002',
        name: 'Fresh Dairy Farms',
        contactName: 'Sarah Johnson',
        email: 'sarah@freshdairy.com',
        phone: '(555) 234-5678',
        address: '456 Farm Road, Dairy Valley, DV 23456',
        paymentTerms: 'Net 15',
        leadTime: 3,
        active: true,
        createdDate: '2024-01-15T00:00:00Z'
      },
      {
        id: 'sup-003',
        name: 'Sweet Supplies Inc.',
        contactName: 'Mike Davis',
        email: 'mike@sweetsupplies.com',
        phone: '(555) 345-6789',
        address: '789 Sweet Street, Sugar Town, ST 34567',
        paymentTerms: 'Net 30',
        leadTime: 5,
        active: true,
        createdDate: '2024-01-15T00:00:00Z'
      },
      {
        id: 'sup-004',
        name: 'Flavor Masters',
        contactName: 'Lisa Chen',
        email: 'lisa@flavormasters.com',
        phone: '(555) 456-7890',
        address: '321 Flavor Ave, Essence City, EC 45678',
        paymentTerms: 'Net 45',
        leadTime: 10,
        active: true,
        createdDate: '2024-01-15T00:00:00Z'
      },
      {
        id: 'sup-005',
        name: 'Farm Fresh Eggs',
        contactName: 'Robert Wilson',
        email: 'robert@farmfresh.com',
        phone: '(555) 567-8901',
        address: '654 Egg Farm Lane, Poultry Valley, PV 56789',
        paymentTerms: 'Net 15',
        leadTime: 2,
        active: true,
        createdDate: '2024-01-15T00:00:00Z'
      },
      {
        id: 'sup-006',
        name: 'Organic Produce Co.',
        contactName: 'Emma Rodriguez',
        email: 'emma@organicproduce.com',
        phone: '(555) 678-9012',
        address: '987 Green Valley Rd, Organic City, OC 67890',
        paymentTerms: 'Net 30',
        leadTime: 4,
        active: false,
        createdDate: '2024-01-15T00:00:00Z'
      },
      {
        id: 'sup-007',
        name: 'Packaging Solutions Ltd.',
        contactName: 'David Brown',
        email: 'david@packagingsolutions.com',
        phone: '(555) 789-0123',
        address: '147 Package Parkway, Box City, BC 78901',
        paymentTerms: 'Net 60',
        leadTime: 14,
        active: true,
        createdDate: '2024-01-15T00:00:00Z'
      },
      {
        id: 'sup-008',
        name: 'Spice Traders Inc.',
        contactName: 'Maria Garcia',
        email: 'maria@spicetraders.com',
        phone: '(555) 890-1234',
        address: '258 Spice Route, Flavor Town, FT 89012',
        paymentTerms: 'Net 30',
        leadTime: 8,
        active: true,
        createdDate: '2024-01-15T00:00:00Z'
      }
    ];
    return of(mockSuppliers);
  }

  private getMockSummary(): Observable<InventorySummary> {
    const mockSummary: InventorySummary = {
      totalItems: 247,
      lowStock: 12,
      expiringSoon: 8,
      totalValue: 15420.50,
      categoriesCount: 15,
      suppliersCount: 8
    };
    return of(mockSummary);
  }

  private getMockWasteRecords(): Observable<WasteRecord[]> {
    const mockWasteRecords: WasteRecord[] = [
      {
        id: 'waste-001',
        itemId: 'item-002',
        itemName: 'Whole Milk',
        quantity: 5,
        unit: 'gallons',
        reason: 'expired',
        cost: 17.50,
        recordedBy: 'John Baker',
        recordedDate: '2025-01-05T10:30:00Z',
        notes: 'Expired during storage'
      },
      {
        id: 'waste-002',
        itemId: 'item-006',
        itemName: 'Butter',
        quantity: 2,
        unit: 'lbs',
        reason: 'spoilage',
        cost: 8.50,
        recordedBy: 'Sarah Johnson',
        recordedDate: '2025-01-08T14:15:00Z',
        notes: 'Melted during power outage'
      },
      {
        id: 'waste-003',
        itemId: 'item-007',
        itemName: 'Eggs',
        quantity: 12,
        unit: 'dozen',
        reason: 'damaged',
        cost: 22.50,
        recordedBy: 'Mike Davis',
        recordedDate: '2025-01-10T09:45:00Z',
        notes: 'Cracked during delivery'
      },
      {
        id: 'waste-004',
        itemId: 'item-001',
        itemName: 'All-Purpose Flour',
        quantity: 10,
        unit: 'lbs',
        reason: 'other',
        cost: 2.50,
        recordedBy: 'Lisa Chen',
        recordedDate: '2025-01-12T16:20:00Z',
        notes: 'Contaminated during storage'
      },
      {
        id: 'waste-005',
        itemId: 'item-003',
        itemName: 'Brown Sugar',
        quantity: 3,
        unit: 'lbs',
        reason: 'spoilage',
        cost: 3.60,
        recordedBy: 'Robert Wilson',
        recordedDate: '2025-01-14T11:10:00Z',
        notes: 'Hardened and unusable'
      }
    ];
    return of(mockWasteRecords);
  }

  private getMockReconciliationRecords(): Observable<ReconciliationRecord[]> {
    const mockReconciliationRecords: ReconciliationRecord[] = [
      {
        id: 'recon-001',
        itemId: 'item-001',
        itemName: 'All-Purpose Flour',
        systemCount: 15,
        physicalCount: 12,
        variance: -3,
        unit: 'lbs',
        reconciledBy: 'John Baker',
        reconciledDate: '2025-01-15T10:30:00Z',
        notes: 'Counted during morning inventory check'
      },
      {
        id: 'recon-002',
        itemId: 'item-002',
        itemName: 'Whole Milk',
        systemCount: 8,
        physicalCount: 8,
        variance: 0,
        unit: 'gallons',
        reconciledBy: 'Sarah Johnson',
        reconciledDate: '2025-01-15T10:45:00Z',
        notes: 'Matches system count exactly'
      },
      {
        id: 'recon-003',
        itemId: 'item-003',
        itemName: 'Brown Sugar',
        systemCount: 8,
        physicalCount: 10,
        variance: 2,
        unit: 'lbs',
        reconciledBy: 'Mike Davis',
        reconciledDate: '2025-01-15T11:00:00Z',
        notes: 'Found extra bags in storage'
      },
      {
        id: 'recon-004',
        itemId: 'item-006',
        itemName: 'Butter',
        systemCount: 25,
        physicalCount: 23,
        variance: -2,
        unit: 'lbs',
        reconciledBy: 'Lisa Chen',
        reconciledDate: '2025-01-15T11:15:00Z',
        notes: 'Two pounds used but not recorded'
      },
      {
        id: 'recon-005',
        itemId: 'item-007',
        itemName: 'Eggs',
        systemCount: 60,
        physicalCount: 58,
        variance: -2,
        unit: 'dozen',
        reconciledBy: 'Robert Wilson',
        reconciledDate: '2025-01-15T11:30:00Z',
        notes: 'Two dozen used in production'
      }
    ];
    return of(mockReconciliationRecords);
  }

  private getMockAlerts(): Observable<InventoryAlert[]> {
    const mockAlerts: InventoryAlert[] = [
      {
        id: '1',
        type: 'low-stock',
        itemId: 'item-001',
        itemName: 'All-Purpose Flour',
        message: 'All-Purpose Flour is below reorder point (Current: 15 lbs, Reorder: 25 lbs)',
        severity: 'high',
        createdDate: new Date().toISOString()
      },
      {
        id: '2',
        type: 'expiring-soon',
        itemId: 'item-002',
        itemName: 'Whole Milk',
        message: 'Whole Milk expires in 3 days (Expires: 2025-01-18)',
        severity: 'medium',
        createdDate: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      },
      {
        id: '3',
        type: 'low-stock',
        itemId: 'item-003',
        itemName: 'Brown Sugar',
        message: 'Brown Sugar is below reorder point (Current: 8 lbs, Reorder: 15 lbs)',
        severity: 'medium',
        createdDate: new Date(Date.now() - 172800000).toISOString() // 2 days ago
      },
      {
        id: '4',
        type: 'expiring-soon',
        itemId: 'item-004',
        itemName: 'Heavy Cream',
        message: 'Heavy Cream expires in 5 days (Expires: 2025-01-20)',
        severity: 'low',
        createdDate: new Date(Date.now() - 259200000).toISOString() // 3 days ago
      },
      {
        id: '5',
        type: 'out-of-stock',
        itemId: 'item-005',
        itemName: 'Vanilla Extract',
        message: 'Vanilla Extract is out of stock',
        severity: 'high',
        createdDate: new Date(Date.now() - 345600000).toISOString() // 4 days ago
      }
    ];
    return of(mockAlerts);
  }

  private getMockSettings(): Observable<InventorySettings> {
    const mockSettings: InventorySettings = {
      defaultReorderPoint: 25,
      lowStockThreshold: 20,
      expiringSoonDays: 30,
      autoReorderEnabled: false,
      emailNotifications: true,
      smsNotifications: false,
      notificationEmail: 'inventory@bakery.com',
      currency: 'USD',
      dateFormat: 'MM/dd/yyyy',
      autoBackupEnabled: true,
      backupFrequency: 'weekly'
    };
    return of(mockSettings);
  }

  getAlerts(): Observable<InventoryAlert[]> {
    return this.http.get<InventoryAlert[]>(`${import.meta.env.NG_APP_API_URL}/alerts`).pipe(
      catchError(() => this.getMockAlerts())
    );
  }


  getSummary(): Observable<InventorySummary> {
    return this.http.get<InventorySummary>(`${import.meta.env.NG_APP_API_URL}/summary`).pipe(
      catchError(() => this.getMockSummary())
    );
  }

  // Backend endpoints for filtered data.
  getLowStockItems(): Observable<InventoryItem[]> {
    return this.http.get<any[]>(`${import.meta.env.NG_APP_API_URL}/low-stock`).pipe(
      map(items => this.mapDtoToInventoryItem(items)),
      catchError(() => {
        // Fallback to client-side filtering if endpoint unavailable
        return this.getItems().pipe(
          map(items => items.filter(item => item.quantityOnHand <= item.reorderPoint))
        );
      })
    );
  }

  getExpiringSoonItems(days: number = 30): Observable<InventoryItem[]> {
    return this.http.get<any[]>(`${import.meta.env.NG_APP_API_URL}/expiring-soon?daysUntilExpiration=${days}`).pipe(
      map(items => this.mapDtoToInventoryItem(items)),
      catchError(() => {
        // Fallback to client-side filtering if endpoint unavailable
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        return this.getItems().pipe(
          map(items => items.filter(item =>
            item.expirationDate &&
            new Date(item.expirationDate) <= futureDate &&
            new Date(item.expirationDate) >= new Date()
          ))
        );
      })
    );
  }

  getOutOfStockItems(): Observable<InventoryItem[]> {
    return this.getItems().pipe(
      map(items => items.filter(item => item.quantityOnHand === 0))
    );
  }

  // Helper to map backend DTO to frontend interface
  private mapDtoToInventoryItem(dtos: any[]): InventoryItem[] {
    return dtos.map(dto => this.normalizeInventoryItem(dto));
  }

  private normalizeInventoryItem(dto: any): InventoryItem {
    return {
      id: dto.id,
      externalId: dto.externalId,
      name: dto.name,
      sku: dto.sku,
      categoryId: Number(dto.categoryId ?? 0),
      quantityOnHand: Number(dto.quantityOnHand ?? 0),
      quantityReserved: Number(dto.quantityReserved ?? 0),
      quantityAvailable: Number(dto.quantityAvailable ?? ((dto.quantityOnHand ?? 0) - (dto.quantityReserved ?? 0))),
      unitOfMeasure: dto.unitOfMeasure,
      reorderPoint: Number(dto.reorderPoint ?? 0),
      unitCost: Number(dto.unitCost ?? 0),
      expirationDate: dto.expirationDate,
      supplierName: dto.supplierName,
      lastUpdated: dto.lastUpdated,
      description: dto.description,
      barcode: dto.barcode,
      location: dto.location,
      batchNumber: dto.batchNumber
    };
  }
}
