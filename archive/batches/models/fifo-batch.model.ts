/**
 * FIFO Inventory Rotation Models
 * Interfaces matching backend DTOs for type-safe batch management
 */

export interface FIFOBatchDto {
  externalId: string;
  batchNumber: string;
  quantityAvailable: number;
  productionDate: Date;
  expirationDate: Date;
  daysUntilExpiration: number;
  expirationStatus: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'GOOD';
  costPerUnit: number;
  productId: string;
  productName?: string;
}

export interface FIFOBatchSelectionDto {
  batchExternalId: string;
  batchNumber: string;
  quantitySelected: number;
  expirationDate: Date;
  daysUntilExpiration: number;
  costPerUnit: number;
  totalCost: number;
}

export interface BatchExpirationInfoDto {
  batchExternalId: string;
  batchNumber: string;
  daysUntilExpiration: number;
  isExpired: boolean;
  percentageTimeRemaining: number;
  expirationStatus: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'GOOD';
  productionDate: Date;
  expirationDate: Date;
  quantityAvailable: number;
}

export interface FIFORotationRequest {
  productId: string;
  quantityNeeded: number;
}

export interface SellableProduct {
  id?: number;
  externalId: string;
  name: string;
  sku: string;
  category?: string;
  description?: string;
  unitPrice: number;
  unitCost?: number;
  quantityOnHand?: number;
  isActive: boolean;
  organizationId?: string;
}
