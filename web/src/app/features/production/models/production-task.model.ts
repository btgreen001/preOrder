export interface ProductionTaskDto {
  ExternalId: string;
  RecipeExternalId: string;
  ProductExternalId: string;
  QuantityToProduce: number;
  AssignedStaffId?: string;
  TaskStatus: string;
  StartTime?: Date;
  ExpectedCompletion?: Date;
  ActualCompletion?: Date;
  QualityNotes?: string;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface CreateProductionTaskRequest {
  RecipeExternalId: string;
  ProductExternalId: string;
  QuantityToProduce: number;
  ExpectedCompletion?: Date;
}

export interface UpdateTaskStatusRequest {
  NewStatus: string;
  ActualCompletion?: Date;
  QualityNotes?: string;
}

export interface AssignTaskRequest {
  StaffId: string;
}

export interface UpdateProductionTaskRequest {
  QuantityToProduce?: number;
  ExpectedCompletion?: Date;
  QualityNotes?: string;
}
