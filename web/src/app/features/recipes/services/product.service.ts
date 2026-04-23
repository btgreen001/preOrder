import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface SellableProductDto {
  externalId: string;
  name: string;
  sku?: string;
  category?: string;
  unitPrice?: number;
  isActive?: boolean;
  unitCost?: number;
  isRecipeComponent?: boolean;
  quantityOnHand?: number;
  outputUnitMsr?: string;
  unitOfMeasure?: string;
  outputUnitCount?: number;
  baseUnitsPerOutputUnit?: number;
  servingsPerPackage?: number;  // Number of servings per package unit
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  getProducts(): Observable<SellableProductDto[]> {
    return this.http.get<SellableProductDto[]>(this.apiUrl);
  }
}
