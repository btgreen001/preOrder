import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RecipeIngredientDto {
  externalId: string;
  recipeExternalId: string;
  sourceType: 'inventory' | 'recipe_component';
  isRecipeComponent?: boolean;
  sourceExternalId?: string;
  displayName?: string;
  inventoryItemExternalId?: string;
  inventoryItemId?: string;
  inventoryItemName?: string;
  inventoryItemSku?: string;
  recipeComponentProductExternalId?: string;
  recipeComponentProductName?: string;
  recipeComponentProductSku?: string;
  quantityRequired: number;
  unit: string;
  costPerUnit?: number;
  totalCost?: number;
  purposeTxt?: string;
  sectionName?: string;
  sequenceNumber?: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CreateRecipeIngredientRequest {
  recipeExternalId?: string;
  inventoryItemExternalId?: string;
  recipeComponentProductExternalId?: string;
  quantityRequired: number;
  unit: string;
  costPerUnit?: number;
  purposeTxt?: string;
  sectionName?: string;
}

export interface UpdateRecipeIngredientRequest {
  quantityRequired?: number;
  unit?: string;
  costPerUnit?: number;
}

export interface IngredientSequenceItem {
  externalId: string;
  sequenceNumber: number;
}

export interface ReorderIngredientsRequest {
  sequences: IngredientSequenceItem[];
}

@Injectable({
  providedIn: 'root'
})
export class RecipeIngredientService {
  private readonly apiUrl = `${environment.apiUrl}/recipe-ingredients`;

  constructor(private http: HttpClient) {}

  getIngredients(recipeExternalId: string): Observable<RecipeIngredientDto[]> {
    return this.http.get<RecipeIngredientDto[]>(`${window.__env.NG_APP_API_URL}/recipe/${recipeExternalId}`);
  }

  getIngredient(externalId: string): Observable<RecipeIngredientDto> {
    return this.http.get<RecipeIngredientDto>(`${window.__env.NG_APP_API_URL}/${externalId}`);
  }

  addIngredient(recipeExternalId: string, request: CreateRecipeIngredientRequest): Observable<RecipeIngredientDto> {
    return this.http.post<RecipeIngredientDto>(
      this.apiUrl,
      {
        ...request,
        recipeExternalId
      }
    );
  }

  updateIngredient(externalId: string, request: UpdateRecipeIngredientRequest): Observable<RecipeIngredientDto> {
    return this.http.put<RecipeIngredientDto>(`${window.__env.NG_APP_API_URL}/${externalId}`, request);
  }

  removeIngredient(externalId: string): Observable<void> {
    return this.http.delete<void>(`${window.__env.NG_APP_API_URL}/${externalId}`);
  }

  reorderIngredients(recipeExternalId: string, request: ReorderIngredientsRequest): Observable<void> {
    return this.http.put<void>(`${window.__env.NG_APP_API_URL}/recipe/${recipeExternalId}/reorder`, request);
  }
}
