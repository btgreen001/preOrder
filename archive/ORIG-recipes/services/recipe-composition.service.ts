import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RecipeCompositionDto {
  externalId: string;
  recipeDetailId: string;
  compositionType: 'RECIPE' | 'STEP';
  referencedRecipeId?: string;
  sequenceNumber: number;
  stepNumber?: number;
  stepText?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CreateRecipeCompositionRequest {
  recipeDetailExternalId: string;
  compositionType: 'RECIPE' | 'STEP';
  referencedRecipeExternalId?: string;
  stepNumber?: number;
  stepText?: string;
  sequenceNumber?: number;
}

export interface UpdateRecipeCompositionRequest {
  compositionType?: 'RECIPE' | 'STEP';
  referencedRecipeExternalId?: string;
  stepNumber?: number;
  stepText?: string;
  sequenceNumber?: number;
}

export interface UpdateCompositionSequenceRequest {
  compositionExternalId: string;
  newSequenceNumber: number;
}

@Injectable({
  providedIn: 'root'
})
export class RecipeCompositionService {
  private readonly apiUrl = `${environment.apiUrl}/recipe-compositions`;

  constructor(private http: HttpClient) {}

  /**
   * Get all compositions for a recipe
   */
  getCompositions(recipeExternalId: string): Observable<RecipeCompositionDto[]> {
    return this.http.get<RecipeCompositionDto[]>(`${import.meta.env.NG_APP_API_URL}/recipe/${recipeExternalId}`);
  }

  /**
   * Get a specific composition
   */
  getComposition(externalId: string): Observable<RecipeCompositionDto> {
    return this.http.get<RecipeCompositionDto>(`${import.meta.env.NG_APP_API_URL}/${externalId}`);
  }

  /**
   * Create a new composition (step or sub-recipe)
   */
  createComposition(request: CreateRecipeCompositionRequest): Observable<RecipeCompositionDto> {
    return this.http.post<RecipeCompositionDto>(this.apiUrl, request);
  }

  /**
   * Update a composition
   */
  updateComposition(externalId: string, request: UpdateRecipeCompositionRequest): Observable<RecipeCompositionDto> {
    return this.http.put<RecipeCompositionDto>(`${import.meta.env.NG_APP_API_URL}/${externalId}`, request);
  }

  /**
   * Delete a composition
   */
  deleteComposition(externalId: string): Observable<void> {
    return this.http.delete<void>(`${import.meta.env.NG_APP_API_URL}/${externalId}`);
  }

  /**
   * Reorder compositions (batch update sequence numbers)
   */
  reorderCompositions(recipeExternalId: string, compositionUpdates: UpdateCompositionSequenceRequest[]): Observable<void> {
    return this.http.put<void>(`${import.meta.env.NG_APP_API_URL}/reorder/${recipeExternalId}`, compositionUpdates);
  }
}
