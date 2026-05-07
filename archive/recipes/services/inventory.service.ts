import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface InventoryItemDto {
  id: string;
  externalId: string;
  name: string;
  sku: string;
  quantityOnHand: number;
  unitOfMeasure: string;
  unitCost: number;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private readonly apiUrl = `${environment.apiUrl}/inventory`;

  constructor(private http: HttpClient) {}

  getInventoryItems(): Observable<InventoryItemDto[]> {
    return this.http.get<InventoryItemDto[]>(this.apiUrl);
  }

  getInventoryItem(externalId: string): Observable<InventoryItemDto> {
    return this.http.get<InventoryItemDto>(`${this.apiUrl}/${externalId}`);
  }
}
