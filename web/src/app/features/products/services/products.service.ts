import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Product {
  id: string;
  externalId: string;  // ← UUID for API calls
  name: string;
  sku: string;
  category: string;
  description?: string;
  unitPrice: number;
  organizationId: string;
  isActive: boolean;
  IsRecipeComponent?: boolean;
  isForSale?: boolean;
  outputUnitMsr?: string;
  outputUnitCount?: number;
  baseUnitsPerOutputUnit?: number;
  servingsPerPackage?: number;  // Number of servings per package
}

export interface CreateProductRequest {
  name: string;
  sku?: string;
  category?: string;
  description?: string;
  unitPrice: number;
  unitCost?: number;
  IsRecipeComponent?: boolean;
  isForSale?: boolean;
  outputUnitMsr?: string;
  outputUnitCount?: number;
  baseUnitsPerOutputUnit?: number;
  servingsPerPackage?: number;  // Number of servings per package
}

export interface UpdateProductRequest {
  name?: string;
  sku?: string;
  category?: string;
  description?: string;
  unitPrice?: number;
  unitCost?: number;
  IsRecipeComponent?: boolean;
  isForSale?: boolean;
  outputUnitMsr?: string;
  outputUnitCount?: number;
  baseUnitsPerOutputUnit?: number;
  servingsPerPackage?: number;  // Number of servings per package
}

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private readonly apiUrl = `${import.meta.env.NG_APP_API_URL}/products`;

  constructor(private http: HttpClient) {}

  /**
   * Get all products for the organization
   */
  getAllProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl);
  }

  /**
   * Get a specific product by ID
   */
  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${import.meta.env.NG_APP_API_URL}/${id}`);
  }

  /**
   * Create a new product
   */
  createProduct(request: CreateProductRequest): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, request);
  }

  /** Request a server-generated SKU suggestion */
  suggestSku(): Observable<{ sku: string }> {
    return this.http.get<{ sku: string }>(`${import.meta.env.NG_APP_API_URL}/sku-suggest`);
  }

  /**
   * Update an existing product
   */
  updateProduct(id: string, request: UpdateProductRequest): Observable<Product> {
    return this.http.put<Product>(`${import.meta.env.NG_APP_API_URL}/${id}`, request);
  }

  /**
   * Delete a product
   */
  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${import.meta.env.NG_APP_API_URL}/${id}`);
  }
}
