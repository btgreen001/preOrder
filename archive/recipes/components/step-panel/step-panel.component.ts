import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { RecipeCompositionDto } from '../../services/recipe-composition.service';

@Component({
  selector: 'app-step-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatListModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    DragDropModule
  ],
  template: `
    <div class="step-panel">
      <h3>Steps & Compositions</h3>

      <mat-tab-group>
        <!-- Add Step Tab -->
        <mat-tab label="Add Step">
          <form [formGroup]="addStepForm" (ngSubmit)="onAddStep()" class="tab-content">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Instruction Description</mat-label>
              <textarea matInput formControlName="stepText" rows="4"></textarea>
              <mat-error *ngIf="addStepForm.get('stepText')?.hasError('required')">
                Instruction description is required
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Estimated Duration (minutes)</mat-label>
              <input matInput type="number" formControlName="estimatedDuration" min="1">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Temperature (°F)</mat-label>
              <input matInput type="number" formControlName="temperature">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Equipment</mat-label>
              <input matInput formControlName="equipment" placeholder="e.g., Mixer, Oven, Scale">
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit" [disabled]="!addStepForm.valid || isLoading">
              <mat-icon>add</mat-icon>
              Add Step
            </button>
          </form>
        </mat-tab>

        <!-- Add Sub-Recipe Tab -->
        <mat-tab label="Add Sub-Recipe">
          <div class="tab-content">
            <p>Link an existing recipe as a sub-component of this recipe</p>
            <form [formGroup]="addCompositionForm" (ngSubmit)="onAddSubRecipe()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Sub-Recipe</mat-label>
                <input matInput formControlName="recipeId" placeholder="Enter recipe ID">
                <mat-error *ngIf="addCompositionForm.get('recipeId')?.hasError('required')">
                  Recipe ID is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Quantity</mat-label>
                <input matInput type="number" formControlName="quantity" min="1">
              </mat-form-field>

              <button mat-raised-button color="primary" type="submit" [disabled]="!addCompositionForm.valid || isLoading">
                <mat-icon>add</mat-icon>
                Add Sub-Recipe
              </button>
            </form>
          </div>
        </mat-tab>

        <!-- View Steps Tab -->
        <mat-tab label="Steps & Compositions">
          <div class="tab-content">
            <div *ngIf="isLoading" class="loading-state">
              <mat-spinner diameter="40"></mat-spinner>
              <span>Loading steps...</span>
            </div>

            <div *ngIf="!isLoading && compositions.length === 0" class="empty-state">
              <mat-icon>list</mat-icon>
              <p>No steps or sub-recipes added yet</p>
            </div>

            <div *ngIf="!isLoading && compositions.length > 0" cdkDropList class="step-list" (cdkDropListDropped)="onDrop($event)">
              <div *ngFor="let comp of compositions; let i = index" 
                   cdkDrag 
                   class="step-item">
                <div class="step-header">
                  <span class="step-number">{{ i + 1 }}</span>
                  <span class="step-title">{{ comp.stepText || 'Unnamed Step' }}</span>
                  <button mat-icon-button (click)="onRemoveStep(comp.externalId)" [disabled]="isLoading">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .step-panel {
      padding: 16px;
      height: 100%;
      overflow-y: auto;
      background: #fafafa;
    }

    h3 {
      margin-top: 0;
      color: #333;
      font-weight: 500;
    }

    .tab-content {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .full-width {
      width: 100%;
    }

    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
      text-align: center;
      color: #999;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #ddd;
      margin-bottom: 8px;
    }

    .step-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
    }

    .step-item {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 12px;
      cursor: move;
      transition: all 0.2s ease;
    }

    .step-item:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .step-item.cdk-drag-preview {
      box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    }

    .step-item.cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .cdk-drop-list-dragging .step-item:not(.cdk-drag-preview) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .step-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .step-number {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      height: 28px;
      background: #2196f3;
      color: white;
      border-radius: 50%;
      font-weight: bold;
      font-size: 12px;
    }

    .step-title {
      flex: 1;
      font-weight: 500;
      color: #333;
    }

    .step-details {
      margin-left: 40px;
      font-size: 14px;
      color: #666;
      line-height: 1.4;
    }
  `]
})
export class StepPanelComponent implements OnInit {
  @Input() compositions: RecipeCompositionDto[] = [];
  @Output() stepAdded = new EventEmitter<{ stepText: string; estimatedDuration?: number; temperature?: number; equipment?: string }>();
  @Output() subRecipeAdded = new EventEmitter<{ recipeId: string; quantity: number }>();
  @Output() stepRemoved = new EventEmitter<string>();
  @Output() stepsReordered = new EventEmitter<{ externalId: string; sequenceNumber: number }[]>();

  addStepForm!: FormGroup;
  addCompositionForm!: FormGroup;
  isLoading = false;

  constructor(private fb: FormBuilder) {
    this.addStepForm = this.fb.group({
      stepText: ['', Validators.required],
      estimatedDuration: [''],
      temperature: [''],
      equipment: ['']
    });

    this.addCompositionForm = this.fb.group({
      recipeId: ['', Validators.required],
      quantity: [1, Validators.min(1)]
    });
  }

  ngOnInit(): void {
    // Load compositions on init
  }

  onAddStep(): void {
    if (this.addStepForm.valid) {
      this.stepAdded.emit(this.addStepForm.value);
      this.addStepForm.reset();
    }
  }

  onAddSubRecipe(): void {
    if (this.addCompositionForm.valid) {
      this.subRecipeAdded.emit(this.addCompositionForm.value);
      this.addCompositionForm.reset();
    }
  }

  onRemoveStep(externalId: string): void {
    this.stepRemoved.emit(externalId);
  }

  onDrop(event: CdkDragDrop<RecipeCompositionDto[]>): void {
    if (event.previousIndex !== event.currentIndex) {
      // Reorder compositions
      const reorderedItems = this.compositions.map((item, index) => ({
        externalId: item.externalId,
        sequenceNumber: index + 1
      }));
      this.stepsReordered.emit(reorderedItems);
    }
  }
}
