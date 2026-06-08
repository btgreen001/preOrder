import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RecipeDetail {
  externalId: string;
  masterRecipeExternalId?: string;
  productExternalId?: string;
  productName?: string;
  recipeName: string;
  description?: string;
  yieldServingCnt: number;
  yieldUnit: string;
  costPerUnit?: number | null;
  shelfLifeDayCnt?: number;
  unitsPerServing?: number;  // Number of units per serving (e.g. 100 if 1 serving = 100g)
  
  // Versioning fields
  recipeVersionNbr: number;
  recipeStatusCd: string; // D=draft, A=active, X=archived, B=abandoned
  startDt?: string;
  endDt?: string;
  approvedBy?: string;
  approvedAt?: string;
  approverName?: string;
  
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;

  // Timing metadata (optional)
  prepTimeMin?: number;
  activeTimeMin?: number;
  cookTimeMin?: number;
  restTimeMin?: number;
  inactiveTimeMin?: number;
  totalTimeMin?: number;
}

export interface CreateRecipeRequest {
  recipeName: string;
  description?: string;
  productExternalId?: string | null;
  yieldServingCnt?: number;
  yieldUnit?: string;
  costPerUnit?: number;
  prepTimeMin?: number;
  activeTimeMin?: number;
  cookTimeMin?: number;
  restTimeMin?: number;
  inactiveTimeMin?: number;
  totalTimeMin?: number;
  shelfLifeDayCnt?: number;
  unitsPerServing?: number;
}

export interface UpdateRecipeRequest {
  recipeName?: string;
  description?: string;
  yieldServingCnt?: number;
  yieldUnit?: string;
  costPerUnit?: number;
  recipeStatusCd?: string;
  prepTimeMin?: number;
  activeTimeMin?: number;
  cookTimeMin?: number;
  restTimeMin?: number;
  inactiveTimeMin?: number;
  totalTimeMin?: number;
  shelfLifeDayCnt?: number;
  unitsPerServing?: number;
}

export interface UpdateRecipeWithDetailsRequest {
  externalId: string;          // identifies which recipe to update
  recipeName: string;
  description?: string;
  productExternalId?: string | null;
  yieldServingCnt: number;
  yieldUnit?: string;
  unitsPerServing?: number;
  costPerUnit?: number;
  recipeStatusCd?: string;
  prepTimeMin?: number;
  activeTimeMin?: number;
  cookTimeMin?: number;
  restTimeMin?: number;
  inactiveTimeMin?: number;
  totalTimeMin?: number;
  shelfLifeDayCnt?: number;
  ingredients?: RecipeIngredientInput[];
  compositions?: RecipeCompositionInput[];
}

// Comprehensive recipe creation with nested details
export interface RecipeIngredientInput {
  inventoryItemExternalId?: string;
  recipeComponentProductExternalId?: string;
  quantityRequired: number;
  unit: string;
  purposeTxt?: string;
  costPerUnit: number;
  sectionName?: string;
  sequenceNumber?: number;
}

export interface RecipeCompositionInput {
  compositionType: 'STEP' | 'RECIPE';
  subRecipeExternalId?: string;
  quantity?: number;
  unit?: string;
  stepText?: string;
  sectionName: string;
  sequenceNumber: number;
}

export interface CreateRecipeWithDetailsRequest {
  recipeName: string;
  description?: string;
  productExternalId: string | null;
  yieldServingCnt?: number;
  yieldUnit?: string;
  unitsPerServing?: number;
  costPerUnit?: number;
  prepTimeMin?: number;
  activeTimeMin?: number;
  bakeTimeMin?: number;
  restTimeMin?: number;
  inactiveTimeMin?: number;
  totalTimeMin?: number;
  shelfLifeDayCnt?: number;
  recipeStatusCd?: string;
  startDt?: string;
  ingredients: RecipeIngredientInput[];
  compositions: RecipeCompositionInput[];
}

// Phase 3.2.1: Ingredient interfaces
export interface RecipeIngredientDto {
  externalId: string;
  sourceType?: 'inventory' | 'recipe_component';
  isRecipeComponent?: boolean;
  displayName?: string;
  inventoryItemExternalId?: string;
  inventoryItemName?: string;
  inventoryItemSku?: string;
  recipeComponentProductExternalId?: string;
  recipeComponentProductName?: string;
  recipeComponentProductSku?: string;
  quantityRequired: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface AddRecipeIngredientRequest {
  inventoryItemExternalId: string;
  quantityRequired: number;
  unit?: string;
  costPerUnit?: number;
}

export interface UpdateRecipeIngredientRequest {
  quantityRequired?: number;
  unit?: string;
  costPerUnit?: number;
}

export interface RecipeVersionSummaryDto {
  externalId: string;
  masterRecipeExternalId?: string;
  recipeName: string;
  versionNumber: number;
  status: string; // D=draft, A=active, X=archived, B=abandoned
  createdAt: string;
  startDt?: string;
  endDt?: string;
  yieldServingCnt: number;
  yieldUnit: string;
  costPerUnit?: number | null;
}

export interface CreateDraftFromRecipeRequest {
  recipeExternalIdToClone: string;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface RecipeUsageSummary {
  externalId: string;
  recipeName: string;
  recipeStatusCd: string;
  recipeVersionNbr: number;
}

export interface ProductUsageCheckDto {
  totalRecipeCount: number;
  activeRecipeCount: number;
  recipes: RecipeUsageSummary[];
  isLastRecipeForProduct: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private readonly apiUrl = `${environment.apiUrl}/recipes`;

  constructor(private http: HttpClient) {}

  /**
   * Get all recipes for the organization
   */
  getRecipes(
    pageNumber?: number, 
    pageSize?: number,
    sortBy?: string,
    sortDirection?: string
  ): Observable<PaginatedResult<RecipeDetail>> {
    let params = new HttpParams();
    if (pageNumber !== undefined) params = params.set('pageNumber', pageNumber.toString());
    if (pageSize !== undefined) params = params.set('pageSize', pageSize.toString());
    if (sortBy) params = params.set('sortBy', sortBy);
    if (sortDirection) params = params.set('sortDirection', sortDirection);

    return this.http.get<PaginatedResult<RecipeDetail>>(this.apiUrl, { params });
  }

  /**
   * Get a specific recipe by external ID
   */
  getRecipeById(externalId: string): Observable<RecipeDetail> {
    return this.http.get<RecipeDetail>(`${import.meta.env.NG_APP_API_URL}/${externalId}`);
  }

  /**
   * Create a new recipe
   */
  createRecipe(request: CreateRecipeRequest): Observable<RecipeDetail> {
    return this.http.post<RecipeDetail>(this.apiUrl, request);
  }

  /**
   * Create a new recipe with all nested ingredients and compositions in a single transaction
   * This is the preferred method for creating new recipes as it ensures atomicity
   */
  createRecipeWithDetails(request: CreateRecipeWithDetailsRequest): Observable<RecipeDetail> {
    return this.http.post<RecipeDetail>(`${import.meta.env.NG_APP_API_URL}/with-details`, request);
  }

  /**
   * Get computed cost-per-unit for a recipe
   */
  getRecipeCost(externalId: string) {
    return this.http.get<{ recipeExternalId: string; totalIngredientCost: number; yieldServingCnt: number; yieldUnit: string; costPerUnit: number }>(`${import.meta.env.NG_APP_API_URL}/${externalId}/cost`);
  }

  /**
   * Get detailed cost breakdown for a recipe
   */
  getRecipeCostBreakdown(externalId: string) {
    return this.http.get(`${import.meta.env.NG_APP_API_URL}/${externalId}/cost/breakdown`);
  }

  /**
   * Update an existing recipe
   */
  updateRecipe(externalId: string, request: UpdateRecipeRequest): Observable<RecipeDetail> {
    return this.http.put<RecipeDetail>(`${import.meta.env.NG_APP_API_URL}/${externalId}`, request);
  }

  updateRecipeWithDetails(request: UpdateRecipeWithDetailsRequest): Observable<RecipeDetail> {
    return this.http.put<RecipeDetail>(`${import.meta.env.NG_APP_API_URL}/with-details`, request);
  }

  /**
   * Update only the recipe's stored cost-per-unit (safe cost-only update)
   */
  updateRecipeCost(externalId: string, payload: { costPerUnit?: number | null; costPerUnitIsOverride?: boolean }): Observable<RecipeDetail> {
    return this.http.patch<RecipeDetail>(`${import.meta.env.NG_APP_API_URL}/${externalId}/cost`, payload);
  }

  /**
   * Delete a recipe
   */
  deleteRecipe(externalId: string): Observable<void> {
    return this.http.delete<void>(`${import.meta.env.NG_APP_API_URL}/${externalId}`);
  }

  /**
   * Check whether a product is used as a finished good by other recipes
   */
  checkProductUsageByRecipes(productExternalId: string): Observable<ProductUsageCheckDto> {
    return this.http.get<ProductUsageCheckDto>(`${import.meta.env.NG_APP_API_URL}/check-product-usage/${productExternalId}`);
  }

  /**
   * Get all versions of a recipe family
   */
  getRecipeVersions(externalId: string): Observable<RecipeVersionSummaryDto[]> {
    return this.http.get<RecipeVersionSummaryDto[]>(`${import.meta.env.NG_APP_API_URL}/${externalId}/versions`);
  }

  /**
   * Create a new draft by cloning an existing recipe version.
   * Returns 409 Conflict if a draft already exists for this recipe family.
   */
  createDraftFromRecipe(recipeExternalIdToClone: string): Observable<RecipeDetail> {
    const request: CreateDraftFromRecipeRequest = { recipeExternalIdToClone };
    return this.http.post<RecipeDetail>(`${import.meta.env.NG_APP_API_URL}/draft-from-recipe`, request);
  }

  /**
   * Fork (clone) a recipe into a fully independent new recipe at version 1, draft status.
   * Unlike createDraftFromRecipe, this breaks lineage — the result is its own master.
   */
  forkRecipe(recipeExternalIdToClone: string): Observable<RecipeDetail> {
    return this.http.post<RecipeDetail>(`${import.meta.env.NG_APP_API_URL}/clone`, { recipeExternalIdToClone });
  }

  // Ingredient management methods (Phase 3.2.1)

  /**
   * Add ingredient to recipe
   */
  addIngredient(recipeExternalId: string, request: AddRecipeIngredientRequest): Observable<RecipeIngredientDto> {
    return this.http.post<RecipeIngredientDto>(
      `${import.meta.env.NG_APP_API_URL}/${recipeExternalId}/ingredients`,
      request
    );
  }

  /**
   * Get all ingredients for a recipe
   */
  getIngredients(recipeExternalId: string): Observable<RecipeIngredientDto[]> {
    return this.http.get<RecipeIngredientDto[]>(
      `${import.meta.env.NG_APP_API_URL}/${recipeExternalId}/ingredients`
    );
  }

  /**
   * Get a specific ingredient
   */
  getIngredient(recipeExternalId: string, ingredientExternalId: string): Observable<RecipeIngredientDto> {
    return this.http.get<RecipeIngredientDto>(
      `${import.meta.env.NG_APP_API_URL}/${recipeExternalId}/ingredients/${ingredientExternalId}`
    );
  }

  /**
   * Update an ingredient
   */
  updateIngredient(ingredientExternalId: string, request: UpdateRecipeIngredientRequest): Observable<RecipeIngredientDto> {
    return this.http.put<RecipeIngredientDto>(
      `${import.meta.env.NG_APP_API_URL}/ingredients/${ingredientExternalId}`,
      request
    );
  }

  /**
   * Remove an ingredient from a recipe
   */
  removeIngredient(ingredientExternalId: string): Observable<void> {
    return this.http.delete<void>(
      `${import.meta.env.NG_APP_API_URL}/ingredients/${ingredientExternalId}`
    );
  }
}
