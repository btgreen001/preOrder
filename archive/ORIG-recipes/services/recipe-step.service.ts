import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface RecipeStepDto {
  externalId: string;
  recipeCompositionId: string;
  stepNumber: number;
  stepText: string;
  estimatedDuration?: number;
  temperature?: number;
  equipment?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CreateRecipeStepRequest {
  compositionExternalId: string;
  stepNumber: number;
  stepText: string;
  estimatedDuration?: number;
  temperature?: number;
  equipment?: string;
}

export interface UpdateRecipeStepRequest {
  stepNumber?: number;
  stepText?: string;
  estimatedDuration?: number;
  temperature?: number;
  equipment?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RecipeStepService {
  private readonly apiUrl = `${environment.apiUrl}/recipe-steps`;

  constructor(private http: HttpClient) {}

  /**
   * Get all steps for a composition
   */
  getSteps(compositionExternalId: string): Observable<RecipeStepDto[]> {
    const params = new HttpParams().set('compositionId', compositionExternalId);
    return this.http.get<RecipeStepDto[]>(this.apiUrl, { params });
  }

  /**
   * Get a specific step
   */
  getStep(externalId: string): Observable<RecipeStepDto> {
    return this.http.get<RecipeStepDto>(`${this.apiUrl}/${externalId}`);
  }

  /**
   * Create a new step
   */
  createStep(request: CreateRecipeStepRequest): Observable<RecipeStepDto> {
    return this.http.post<RecipeStepDto>(this.apiUrl, request);
  }

  /**
   * Update a step
   */
  updateStep(externalId: string, request: UpdateRecipeStepRequest): Observable<RecipeStepDto> {
    return this.http.put<RecipeStepDto>(`${this.apiUrl}/${externalId}`, request);
  }

  /**
   * Delete a step
   */
  deleteStep(externalId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${externalId}`);
  }

  /**
   * Batch update step numbers for a composition
   */
  reorderSteps(compositionExternalId: string, stepUpdates: { externalId: string; stepNumber: number }[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/reorder/${compositionExternalId}`, stepUpdates);
  }
}
