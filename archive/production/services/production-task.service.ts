import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ProductionTaskDto,
  CreateProductionTaskRequest,
  UpdateTaskStatusRequest,
  AssignTaskRequest,
  UpdateProductionTaskRequest
} from '../models/production-task.model';

@Injectable({
  providedIn: 'root'
})
export class ProductionTaskService {
  private readonly apiUrl = `${environment.apiUrl}/production-tasks`;

  constructor(private http: HttpClient) {}

  /**
   * Get all production tasks with optional status filter
   */
  getTasks(status?: string, pageNumber?: number, pageSize?: number): Observable<ProductionTaskDto[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (pageNumber !== undefined) params = params.set('pageNumber', pageNumber.toString());
    if (pageSize !== undefined) params = params.set('pageSize', pageSize.toString());

    return this.http.get<ProductionTaskDto[]>(this.apiUrl, { params });
  }

  /**
   * Get specific task by external ID
   */
  getTaskById(externalId: string): Observable<ProductionTaskDto> {
    return this.http.get<ProductionTaskDto>(`${this.apiUrl}/${externalId}`);
  }

  /**
   * Create new production task
   */
  createTask(request: CreateProductionTaskRequest): Observable<ProductionTaskDto> {
    return this.http.post<ProductionTaskDto>(this.apiUrl, request);
  }

  /**
   * Update task status
   */
  updateTaskStatus(externalId: string, newStatus: string, actualCompletion?: Date, qualityNotes?: string): Observable<ProductionTaskDto> {
    const request: UpdateTaskStatusRequest = {
      NewStatus: newStatus,
      ActualCompletion: actualCompletion,
      QualityNotes: qualityNotes
    };
    return this.http.put<ProductionTaskDto>(`${this.apiUrl}/${externalId}/status`, request);
  }

  /**
   * Assign task to staff member
   */
  assignTask(externalId: string, staffId: string): Observable<ProductionTaskDto> {
    const request: AssignTaskRequest = { StaffId: staffId };
    return this.http.put<ProductionTaskDto>(`${this.apiUrl}/${externalId}/assign`, request);
  }

  /**
   * Update production task
   */
  updateTask(externalId: string, request: UpdateProductionTaskRequest): Observable<ProductionTaskDto> {
    return this.http.put<ProductionTaskDto>(`${this.apiUrl}/${externalId}`, request);
  }

  /**
   * Delete/Cancel production task
   */
  deleteTask(externalId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${externalId}`);
  }
}
