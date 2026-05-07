import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CdkDropList, CdkDrag, CdkDragDrop } from '@angular/cdk/drag-drop';
import { RecipeService, RecipeDetail } from '../../services/recipe.service';

interface SectionItem {
  id: string;
  type: 'step' | 'recipe'; // recipe = subrecipe
  title?: string;
  stepText?: string;
  recipeName?: string;
  recipeAmount?: string;
  recipeNote?: string;
  stepNumber?: number;
  externalId?: string;
}

interface Section {
  id: string;
  title: string;
  collapsed: boolean;
  items: SectionItem[];
  externalId?: string;
}

@Component({
  selector: 'app-composition-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatListModule,
    MatCardModule,
    MatTabsModule,
    MatDialogModule,
    MatMenuModule,
    MatTooltipModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    CdkDropList,
    CdkDrag
  ],
  template: `
    <div class="composition-panel" [class.drag-disabled-mode]="dragDisabled">
      <div class="panel-header">
        <div class="header-title" (click)="toggleSectionsCollapsed()" style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
          <h3>Instructions & Sub-Recipes</h3>
          <mat-icon>{{ sectionsCollapsed ? 'expand_more' : 'expand_less' }}</mat-icon>
        </div>
        <div class="header-actions" *ngIf="!readOnly">
          <button mat-icon-button [matMenuTriggerFor]="addMenu" title="Add group or item">
            <mat-icon>add_circle</mat-icon>
          </button>
          <mat-menu #addMenu="matMenu">
            <button mat-menu-item (click)="addSection()">
              <mat-icon>folder_special</mat-icon>
              <span>Add Instruction Group</span>
            </button>
            <button mat-menu-item (click)="addStepToLast()">
              <mat-icon>description</mat-icon>
              <span>Add Instruction</span>
            </button>
            <button mat-menu-item (click)="addRecipeToLast()">
              <mat-icon>layers</mat-icon>
              <span>Add Sub-Recipe</span>
            </button>
          </mat-menu>
        </div>
      </div>

      <div *ngIf="!sectionsCollapsed">
        <div *ngIf="sections.length === 0" class="empty-state">
          <mat-icon>dashboard</mat-icon>
          <p>No instruction group yet.<span *ngIf="!readOnly"> Add one to get started.</span></p>
          <button mat-stroked-button (click)="addSection()" *ngIf="!readOnly">
            <mat-icon>add</mat-icon>
            Create First Group
          </button>
        </div>

        <div *ngIf="sections.length > 0" 
             class="sections-list" 
             cdkDropList
             [cdkDropListData]="sections"
             [cdkDropListDisabled]="dragDisabled"
             [attr.aria-disabled]="dragDisabled ? 'true' : null"
             (cdkDropListDropped)="onSectionDrop($event)">
          <div *ngFor="let section of sections; let idx = index"
              class="section-card"
              cdkDrag
              [cdkDragData]="section"
              [cdkDragDisabled]="dragDisabled"
              [attr.aria-disabled]="dragDisabled ? 'true' : null"
              [class.drag-disabled]="dragDisabled">

          
          <div class="section-header" (click)="editingSectionId !== section.id && toggleSection(idx)">
            <mat-icon
              class="drag-handle"
              cdkDragHandle
              [class.disabled]="dragDisabled"
              [attr.aria-disabled]="dragDisabled ? 'true' : 'false'"
              [attr.aria-label]="dragDisabled ? 'Group drag disabled' : 'Drag group'">
              drag_indicator
            </mat-icon>
            <mat-icon class="expand-icon" [class.collapsed]="section.collapsed">
              {{ section.collapsed ? 'expand_more' : 'expand_less' }}
            </mat-icon>

            <ng-container *ngIf="editingSectionId !== section.id; else sectionEditMode">
              <h4>{{ section.title }}</h4>
            </ng-container>
            <ng-template #sectionEditMode>
              <input class="section-title-input" [formControl]="inlineSectionTitle"
                     (click)="$event.stopPropagation()"
                     (keydown.enter)="saveEditSectionTitle(section); $event.stopPropagation()"
                     (keydown.escape)="cancelEditSectionTitle(); $event.stopPropagation()">
              <button mat-icon-button color="primary" matTooltip="Save" (click)="saveEditSectionTitle(section); $event.stopPropagation()">
                <mat-icon>check</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Cancel" (click)="cancelEditSectionTitle(); $event.stopPropagation()">
                <mat-icon>close</mat-icon>
              </button>
            </ng-template>

            <span class="item-count" *ngIf="editingSectionId !== section.id">{{ section.items.length }} {{ section.items.length === 1 ? 'item' : 'items' }}</span>
            <div class="section-actions" *ngIf="!readOnly && editingSectionId !== section.id">
              <button mat-icon-button (click)="startEditSectionTitle(section); $event.stopPropagation()" 
                      matTooltip="Edit group name">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button (click)="deleteSection(idx); $event.stopPropagation()" 
                      matTooltip="Delete group">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>

          <div *ngIf="!section.collapsed" class="section-content">
            <div cdkDropList 
                 [cdkDropListData]="section.items"
                 class="items-list"
                [cdkDropListDisabled]="dragDisabled"
                [attr.aria-disabled]="dragDisabled ? 'true' : null"
                 (cdkDropListDropped)="onItemDrop($event, idx)">
              
              <div *ngFor="let item of section.items; let itemIdx = index"
                   class="item-row"
                   [class.editing]="editingItemId === item.id"
                   cdkDrag
                   [cdkDragDisabled]="dragDisabled || editingItemId === item.id"
                   [attr.aria-disabled]="(dragDisabled || editingItemId === item.id) ? 'true' : null"
                   [cdkDragData]="item">

                <!-- ── Display mode ── -->
                <ng-container *ngIf="editingItemId !== item.id">
                  <mat-icon
                    class="item-handle"
                    cdkDragHandle
                    [class.disabled]="dragDisabled || editingItemId === item.id"
                    [attr.aria-disabled]="(dragDisabled || editingItemId === item.id) ? 'true' : 'false'"
                    [attr.aria-label]="(dragDisabled || editingItemId === item.id) ? 'Instruction drag disabled' : 'Drag instruction'">
                    drag_indicator
                  </mat-icon>
                  <div class="item-content">
                    <div class="item-type-badge" [class]="item.type">
                      {{ item.type === 'step' ? '📝 Instruction' : '🔀 Recipe' }}
                    </div>
                    <div *ngIf="item.type === 'recipe'" class="item-text">
                      <strong><span *ngIf="item.recipeAmount">Make ({{item.recipeAmount}})  </span>{{item.recipeName}}</strong>
                      <div class="item-meta">
                        <span *ngIf="item.recipeNote"> • {{ item.recipeNote }}</span>
                      </div>

                    </div>
                    <div *ngIf="item.type === 'step'" class="item-text">
                      <strong>{{ item.stepText || '&lt;add instruction&gt;'}}</strong>
                      <div class="item-meta">
                      </div>
                    </div>




                    </div>
                  <div class="item-actions" *ngIf="!readOnly">
                    <button mat-icon-button (click)="startEditItem(item); $event.stopPropagation()" matTooltip="Edit">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button (click)="moveItemUp(idx, itemIdx); $event.stopPropagation()"
                            [disabled]="itemIdx === 0" matTooltip="Move up">
                      <mat-icon>arrow_upward</mat-icon>
                    </button>
                    <button mat-icon-button (click)="moveItemDown(idx, itemIdx); $event.stopPropagation()"
                            [disabled]="itemIdx === section.items.length - 1" matTooltip="Move down">
                      <mat-icon>arrow_downward</mat-icon>
                    </button>
                    <button mat-icon-button (click)="deleteItem(idx, itemIdx); $event.stopPropagation()" matTooltip="Delete" [disabled]="dragDisabled">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                </ng-container>

                <!-- ── Inline edit mode ── -->
                <div *ngIf="editingItemId === item.id" class="inline-edit-form" (click)="$event.stopPropagation()">
                  <!-- Step fields -->
                  <ng-container *ngIf="item.type === 'step'">
                    <mat-form-field appearance="outline" class="inline-full">
                      <mat-label>Instruction</mat-label>
                      <textarea matInput [formControl]="inlineStepText" rows="3" cdkTextareaAutosize></textarea>
                    </mat-form-field>
                  </ng-container>

                  <!-- Sub-recipe fields -->
                  <ng-container *ngIf="item.type === 'recipe'">
                    <mat-form-field appearance="outline" class="inline-full">
                      <mat-label>Recipe Name</mat-label>
                      <input matInput
                             [formControl]="inlineRecipeName"
                             [matAutocomplete]="recipeAuto"
                             placeholder="Type to search recipes…">
                      <mat-spinner *ngIf="recipesLoading" matSuffix diameter="16"></mat-spinner>
                      <mat-autocomplete #recipeAuto="matAutocomplete"
                                        [displayWith]="recipeDisplayFn"
                                        (optionSelected)="onRecipeSelected($event.option.value)">
                        <mat-option *ngFor="let r of filteredRecipes" [value]="r">
                          <span>{{ r.recipeName }}</span>
                          <span class="recipe-option-status"> &mdash; {{ r.recipeStatusCd === 'A' ? 'Active' : r.recipeStatusCd === 'D' ? 'Draft' : r.recipeStatusCd }}</span>
                        </mat-option>
                      </mat-autocomplete>
                    </mat-form-field>
                    <div class="inline-row">
                      <mat-form-field appearance="outline" class="inline-half">
                        <mat-label>Amount</mat-label>
                        <input matInput [formControl]="inlineRecipeAmount" placeholder="e.g. 2 cups">
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="inline-half">
                        <mat-label>Notes</mat-label>
                        <input matInput [formControl]="inlineRecipeNote" placeholder="e.g. sifted">
                      </mat-form-field>
                    </div>
                  </ng-container>

                  <div class="inline-actions">
                    <button mat-flat-button color="primary" (click)="saveEditItem(idx, itemIdx)">
                      <mat-icon>check</mat-icon> Apply
                    </button>
                    <button mat-stroked-button (click)="cancelEditItem()">
                      Cancel
                    </button>
                  </div>
                </div>

              </div>
            </div>

            <div class="section-footer" *ngIf="!readOnly">
              <button mat-button (click)="addItemToSection(idx, 'step')">
                <mat-icon>add</mat-icon> Add Instruction
              </button>
              <button mat-button (click)="addItemToSection(idx, 'recipe')">
                <mat-icon>add</mat-icon> Add Sub-Recipe
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>

    </div>
  
  `,
  styles: [`
    .composition-panel {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 24px 20px 24px 20px;
      background: #fafbfc;
      height: 100%;
      overflow-y: auto;
      font-family: 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
      font-size: 0.95rem;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .panel-header h3 {
      margin: 0;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: #6b7280;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .panel-header h3::before {
      content: '';
      display: inline-block;
      width: 3px;
      height: 13px;
      background: #1976d2;
      border-radius: 2px;
    }

    .header-actions {
      display: flex;
      gap: 4px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 40px 20px;
      color: #999;
      text-align: center;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #ddd;
    }

    .sections-list {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .section-card {
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 4px 16px rgba(60,60,90,0.07), 0 1.5px 4px rgba(60,60,90,0.04);
      overflow: hidden;
      border: 1px solid #f0f1f3;
      transition: box-shadow 0.2s, border 0.2s;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 18px 20px 14px 20px;
      background: #f7f8fa;
      border-bottom: 1px solid #f0f1f3;
      cursor: pointer;
      user-select: none;
      transition: background 0.2s;
    }
    .section-header:hover {
      background: #f0f4fa;
    }

    .drag-handle {
      cursor: grab;
      color: #999;
      font-size: 18px;
    }

    .drag-handle:active {
      cursor: grabbing;
    }

    .drag-handle.disabled,
    .item-handle.disabled {
      cursor: not-allowed;
      color: #c3cad6;
      opacity: 0.55;
      pointer-events: none;
    }

    .expand-icon {
      transition: transform 0.3s ease;
      &.collapsed {
        transform: rotate(-90deg);
      }
    }

    .section-header h4 {
      margin: 0;
      flex: 1;
      font-size: 14px;
      font-weight: 600;
    }

    .item-count {
      font-size: 12px;
      color: #999;
      background: #f0f0f0;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .section-actions {
      display: flex;
      gap: 4px;
      button {
        width: 32px;
        height: 32px;
        mat-icon {
          font-size: 16px;
        }
      }
    }

    .section-content {
      padding: 8px;
    }

    .items-list {
      min-height: 40px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 4px;
    }

    .item-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      background: #fcfcfe;
      border-radius: 8px;
      border: 1.5px solid #f0f1f3;
      cursor: pointer;
      user-select: none;
      box-shadow: 0 1px 2px rgba(60,60,90,0.03);
      transition: background 0.18s, border 0.18s, box-shadow 0.18s;
    }
    .item-row:hover {
      background: #f5f8fd;
      border-color: #b3d0fa;
      box-shadow: 0 2px 8px rgba(60,60,90,0.07);
    }
    .item-row.selected {
      border-color: #1976d2;
      background: #e3f0ff;
      box-shadow: 0 2px 8px rgba(25,118,210,0.08);
    }
    .item-row.editing {
      border-color: #1976d2;
      background: #f0f7ff;
      padding: 14px 18px;
    }

    .inline-edit-form {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .inline-full { width: 100%; }
    .inline-row { display: flex; gap: 12px; }
    .inline-half { flex: 1; }
    .inline-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-top: 2px;
    }

    .section-title-input {
      flex: 1;
      font-size: 14px;
      font-weight: 600;
      border: 1px solid #1976d2;
      border-radius: 4px;
      padding: 4px 8px;
      outline: none;
      background: white;
    }

    .item-handle {
      flex-shrink: 0;
      color: #bbb;
      font-size: 16px;
      cursor: grab;
    }

    .item-handle:active {
      cursor: grabbing;
    }

    .composition-panel.drag-disabled-mode .section-card.drag-disabled {
      opacity: 0.92;
    }

    .composition-panel.drag-disabled-mode .item-row {
      cursor: default;
    }

    .item-content {
      flex: 1;
      min-width: 0;
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }

    .item-type-badge {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 500;
      letter-spacing: 0.02em;
      white-space: nowrap;
      box-shadow: 0 1px 2px rgba(60,60,90,0.04);
      margin-right: 8px;
    }
    .item-type-badge.step {
      background: #e3fbe7;
      color: #1b7f3a;
      border: 1px solid #b6e7c7;
    }
    .item-type-badge.recipe {
      background: #f3e8fd;
      color: #6a1b9a;
      border: 1px solid #d1b3fa;
    }

    .item-text {
      flex: 1;
      min-width: 0;
      strong {
        display: block;
        font-size: 13px;
        color: #333;
        word-break: break-word;
      }
    }

    .item-meta {
      font-size: 11px;
      color: #999;
      margin-top: 2px;
    }

    .item-actions {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
    }
    .item-actions button {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #f7f8fa;
      transition: background 0.15s;
      box-shadow: 0 1px 2px rgba(60,60,90,0.04);
      margin-left: 2px;
    }
    .item-actions button:hover {
      background: #e3f0ff;
    }

    .section-footer {
      display: flex;
      gap: 12px;
      padding: 12px 20px 16px 20px;
      border-top: 1px solid #f0f1f3;
    }
    .section-footer button {
      font-size: 13px;
      padding: 6px 14px;
      border-radius: 6px;
      background: #f7f8fa;
      transition: background 0.15s;
    }
    .section-footer button:hover {
      background: #e3f0ff;
    }



    .full-width {
      width: 100%;
      margin-bottom: 12px;
    }

    .form-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    .cdk-drop-list-dragging .item-row:last-child {
      border-bottom: 2px solid #0a84ff;
    }

    .recipe-option-status {
      font-size: 12px;
      color: #999;
    }
  `]
})
export class CompositionPanelComponent implements OnInit, OnDestroy {
  @Input() sections: Section[] = [];
  @Input() readOnly = false;
  @Output() sectionsChanged = new EventEmitter<Section[]>();
  @Output() itemAdded = new EventEmitter<{ sectionIdx: number; item: SectionItem }>();
  @Output() itemRemoved = new EventEmitter<{ sectionIdx: number; itemIdx: number }>();
  @Output() itemSelected = new EventEmitter<SectionItem | null>();

  selectedItem: SectionItem | null = null;
  detailsForm!: FormGroup;
  sectionsCollapsed = false;

  // Inline editing state
  editingItemId: string | null = null;
  editingSectionId: string | null = null;
  inlineStepText = new FormControl('');
  inlineRecipeName = new FormControl<string | RecipeDetail>('');
  inlineRecipeAmount = new FormControl('');
  inlineRecipeNote = new FormControl('');
  inlineSectionTitle = new FormControl('');

  // Recipe autocomplete
  filteredRecipes: RecipeDetail[] = [];
  recipesLoading = false;
  private recipeSearchSub?: Subscription;
  private selectedRecipeExternalId: string | null = null;

  constructor(private fb: FormBuilder, private recipeService: RecipeService) {
    this.detailsForm = this.fb.group({
      stepText: [''],
      recipeName: [''],
      recipeAmount: [''],
      recipeNote: ['']
    });
  }

  ngOnDestroy(): void {
    this.recipeSearchSub?.unsubscribe();
  }

  ngOnInit(): void {
    // Initialize with demo data if empty
    if (this.sections.length === 0) {
      this.sections = [];
    }
  }

  private generateId(): string {
    return 'id_' + Math.random().toString(36).slice(2, 9);
  }

  addSection(): void {
    const section: Section = {
      id: this.generateId(),
      title: `Group ${this.sections.length + 1}`,
      collapsed: false,
      items: []
    };
    this.sections.push(section);
    this.sectionsChanged.emit(this.sections);
  }

  toggleSection(idx: number): void {
    this.sections[idx].collapsed = !this.sections[idx].collapsed;
  }

  editSectionTitle(section: Section): void {
    this.startEditSectionTitle(section);
  }

  startEditSectionTitle(section: Section): void {
    this.editingSectionId = section.id;
    this.inlineSectionTitle.setValue(section.title);
  }

  saveEditSectionTitle(section: Section): void {
    const title = this.inlineSectionTitle.value?.trim();
    if (title) {
      section.title = title;
      this.sectionsChanged.emit(this.sections);
    }
    this.editingSectionId = null;
  }

  cancelEditSectionTitle(): void {
    this.editingSectionId = null;
  }

  deleteSection(idx: number): void {
    if (confirm('Delete this group and all its items?')) {
      this.sections.splice(idx, 1);
      this.sectionsChanged.emit(this.sections);
    }
  }

  addItemToSection(sectionIdx: number, type: 'step' | 'recipe'): void {
    const item: SectionItem = {
      id: this.generateId(),
      type,
      ...(type === 'step' ? { stepText: '' } : { recipeName: '', recipeAmount: '', recipeNote: '' })
    };
    this.sections[sectionIdx].collapsed = false;
    this.sections[sectionIdx].items.push(item);
    this.itemAdded.emit({ sectionIdx, item });
    this.sectionsChanged.emit(this.sections);
    // Auto-open inline editor for the new item
    this.startEditItem(item);
  }

  addStepToLast(): void {
    if (this.sections.length === 0) {
      this.addSection();
    }
    this.addItemToSection(this.sections.length - 1, 'step');
  }

  addRecipeToLast(): void {
    if (this.sections.length === 0) {
      this.addSection();
    }
    this.addItemToSection(this.sections.length - 1, 'recipe');
  }

  selectItem(item: SectionItem): void {
    this.selectedItem = item;
    this.itemSelected.emit(item);
  }

  startEditItem(item: SectionItem): void {
    this.editingItemId = item.id;
    if (item.type === 'step') {
      this.inlineStepText.setValue(item.stepText || '');
    } else {
      this.selectedRecipeExternalId = item.externalId ?? null;
      this.inlineRecipeName.setValue(item.recipeName || '');
      this.inlineRecipeAmount.setValue(item.recipeAmount || '');
      this.inlineRecipeNote.setValue(item.recipeNote || '');
      this.filteredRecipes = [];
      this.subscribeRecipeSearch();
    }
  }

  saveEditItem(sectionIdx: number, itemIdx: number): void {
    const item = this.sections[sectionIdx].items[itemIdx];
    if (item.type === 'step') {
      item.stepText = this.inlineStepText.value || '';
    } else {
      const nameVal = this.inlineRecipeName.value;
      item.recipeName = typeof nameVal === 'string' ? nameVal : (nameVal as RecipeDetail)?.recipeName ?? '';
      item.externalId = this.selectedRecipeExternalId ?? item.externalId;
      item.recipeAmount = this.inlineRecipeAmount.value || '';
      item.recipeNote = this.inlineRecipeNote.value || '';
    }
    this.editingItemId = null;
    this.recipeSearchSub?.unsubscribe();
    this.sectionsChanged.emit(this.sections);
  }

  cancelEditItem(): void {
    this.editingItemId = null;
    this.recipeSearchSub?.unsubscribe();
  }

  saveSelectedItem(): void {
    // Kept for compatibility — no longer called from template
  }

  deleteItem(sectionIdx: number, itemIdx: number): void {
    if (confirm('Delete this item?')) {
      this.sections[sectionIdx].items.splice(itemIdx, 1);
      this.itemRemoved.emit({ sectionIdx, itemIdx });
      this.sectionsChanged.emit(this.sections);
      this.selectedItem = null;
    }
  }

  moveItemUp(sectionIdx: number, itemIdx: number): void {
    if (itemIdx > 0) {
      const section = this.sections[sectionIdx];
      [section.items[itemIdx - 1], section.items[itemIdx]] = [section.items[itemIdx], section.items[itemIdx - 1]];
      this.sectionsChanged.emit(this.sections);
    }
  }

  moveItemDown(sectionIdx: number, itemIdx: number): void {
    const section = this.sections[sectionIdx];
    if (itemIdx < section.items.length - 1) {
      [section.items[itemIdx], section.items[itemIdx + 1]] = [section.items[itemIdx + 1], section.items[itemIdx]];
      this.sectionsChanged.emit(this.sections);
    }
  }

  toggleSectionsCollapsed(): void {
    this.sectionsCollapsed = !this.sectionsCollapsed;
  }

  recipeDisplayFn = (value: RecipeDetail | string | null): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.recipeName ?? '';
  };

  onRecipeSelected(recipe: RecipeDetail): void {
    this.selectedRecipeExternalId = recipe.externalId ?? null;
  }

  private subscribeRecipeSearch(): void {
    this.recipeSearchSub?.unsubscribe();
    this.recipeSearchSub = this.inlineRecipeName.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged()
    ).subscribe(val => {
      if (typeof val === 'string') {
        this.selectedRecipeExternalId = null;
        if (val.trim().length === 0) { this.filteredRecipes = []; return; }
        this.recipesLoading = true;
        this.recipeService.getRecipes(1, 50).subscribe({
          next: (result) => {
            const q = val.toLowerCase();
            this.filteredRecipes = result.data.filter((r: RecipeDetail) =>
              r.recipeName?.toLowerCase().includes(q)
            );
            this.recipesLoading = false;
          },
          error: () => { this.recipesLoading = false; }
        });
      }
    });
  }

  openRecipePicker(): void {
    // Dialog will be handled by parent component
    // For now, show a simple text input to demonstrate functionality
    const recipeName = prompt('Enter sub-recipe name:');
    if (recipeName && this.selectedItem && this.selectedItem.type === 'recipe') {
      this.selectedItem.recipeName = recipeName;
      this.detailsForm.patchValue({
        recipeName: recipeName
      });
    }
  }

  onSectionDrop(event: any): void {
    // Reorder sections
    const { previousIndex, currentIndex } = event as CdkDragDrop<Section[], any, Section>;
    if (previousIndex !== currentIndex) {
      const [movedSection] = this.sections.splice(previousIndex, 1);
      this.sections.splice(currentIndex, 0, movedSection);
      this.sectionsChanged.emit(this.sections);
    }
  }

  onItemDrop(event: any, sectionIdx: number): void {
    // Reorder items within section
    const { previousIndex, currentIndex } = event as CdkDragDrop<SectionItem[], any, SectionItem>;
    if (previousIndex !== currentIndex) {
      const section = this.sections[sectionIdx];
      const [movedItem] = section.items.splice(previousIndex, 1);
      section.items.splice(currentIndex, 0, movedItem);
      this.sectionsChanged.emit(this.sections);
    }
  }
  get dragDisabled(): boolean {
    return this.sectionsCollapsed || this.readOnly;
  }

}
