import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Observable, catchError, forkJoin, map, of, startWith } from 'rxjs';
import {ProductCategory, InventoryCategory, InventoryItem, InventoryService } from '../services/inventory.service';


@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatPaginatorModule
  ],
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.css']
})
export class InventoryListComponent implements OnInit {
  inventoryItems: InventoryItem[] = [];
  pagedInventoryItems: InventoryItem[] = [];
  allInventoryItems: InventoryItem[] = [];
  displayedColumns: string[] = ['itemName', 'category', 'quantity', 'unit', 'unitCost', 'batchNumber', 'expirationDate'];
  isLoading = true;
  errorMessage: string | null = null;

  nameFilter = new FormControl('', { nonNullable: true });
  categoryFilter = '';
  filteredItemNames: Observable<string[]> = new Observable<string[]>();
  categories: InventoryCategory[] = [];
  sortColumn: keyof InventoryItem | null = 'itemName';
  sortDirection: 'asc' | 'desc' = 'asc';
  pageIndex = 0;
  pageSize = 10;
  pageSizeOptions = [10, 25, 50, 100];
  private readonly uncategorizedKey = 'uncategorized';
  private readonly componentsKey = 'components';

  constructor(private inventoryService: InventoryService) {}

  ngOnInit(): void {
    this.filteredItemNames = this.nameFilter.valueChanges.pipe(
      startWith(''),
      map(value => this.getAutocompleteOptions(value))
    );
    this.loadInventory();
    // Ensure main list is sorted by itemName by default
    // (sortColumn and sortDirection are already set above)
  }

  /**
   * Load all inventory items from the backend
   */
  loadInventory(): void {
    this.isLoading = true;
    this.errorMessage = null;
    forkJoin({
      inventoryItems: this.inventoryService.getAllInventoryItems(),
      categories: this.inventoryService.getItemCategories().pipe(catchError(() => of<InventoryCategory[]>([]))),
      recipeComponents: this.inventoryService.getRecipeComponents().pipe(catchError(() => of<InventoryItem[]>([]))),
      productCategories: this.inventoryService.getProductCategories().pipe(catchError(() => of<ProductCategory[]>([]))),
    }).subscribe({
      next: ({ inventoryItems, categories, recipeComponents, productCategories }) => {
        const categoryMap = new Map<string, string>(
          categories
            .filter(c => c.id && c.name)
            .map(c => [String(c.id), c.name])
        );


        const normalizeCategoryId = (id: string | number | undefined | null): number | undefined => {
          if (id === undefined || id === null || id === '') return undefined;
          const num = Number(id);
          return Number.isNaN(num) ? undefined : num;
        };

        const normalizedInventoryItems = inventoryItems.map(item => {
          const normalizedCategoryId = normalizeCategoryId(item.categoryId);
          const categoryKey = normalizedCategoryId !== undefined ? String(normalizedCategoryId) : this.uncategorizedKey;
          return {
            ...item,
            categoryId: normalizedCategoryId,
            sourceType: 'inventory' as const,
            categoryKey,
            catName: this.getInventoryCategoryName({ ...item, categoryId: normalizedCategoryId }, categoryMap),
            itemName: item.itemName ?? ''
          };
        });

        // Also normalize categoryId for recipe components if needed
        const normalizedRecipeComponents = recipeComponents.map(item => {
          const normalizedCategoryId = normalizeCategoryId(item.categoryId);
          return {
            ...item,
            categoryId: normalizedCategoryId,
            sourceType: 'recipe-component' as const,
            categoryKey: this.componentsKey,
            catName: item.catName ||  'Recipe Component',
            itemName: item.itemName ?? ''
          };
        });

        this.categories = this.buildCategoryOptions(categories, normalizedInventoryItems, normalizedRecipeComponents.length > 0);
        this.allInventoryItems = [...normalizedInventoryItems, ...normalizedRecipeComponents];
        this.applyFiltersAndSorting();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Full error object:', error);
        console.error('Error status:', error.status);
        console.error('Error statusText:', error.statusText);
        console.error('Error message:', error.message);
        
        // Provide user-friendly error messages
        if (error.status === 401) {
          this.errorMessage = 'Session expired. Please login again.';
        } else if (error.status === 403) {
          this.errorMessage = 'You do not have permission to view inventory.';
        } else if (error.status === 0 || error.statusText === 'Unknown Error') {
          this.errorMessage = 'Network error or CORS issue. Check browser console for details.';
        } else {
          this.errorMessage = `Failed to load inventory: ${error.statusText || error.message}`;
        }
        this.isLoading = false;
      }
    });
  }

  /**
   * Check if item is low on stock
   * Phase 2: will use reorderPoint when available from backend
   */
  isLowStock(item: InventoryItem): boolean {
    // TODO: Phase 2 - implement when reorderPoint is added to backend
    return false;
  }

  /**
   * Get quantity status class
   * Phase 2: will use reorderPoint when available from backend
   */
  getQuantityStatus(item: InventoryItem): string {
    // TODO: Phase 2 - implement when reorderPoint is added to backend
    return 'normal-stock';
  }

  onCategoryFilterChange(): void {
    this.pageIndex = 0;
    this.applyFiltersAndSorting();
  }

  onNameSelected(selectedName: string): void {
    this.nameFilter.setValue(selectedName);
    this.pageIndex = 0;
    this.applyFiltersAndSorting();
  }

  onNameInputChanged(): void {
    this.pageIndex = 0;
    this.applyFiltersAndSorting();
  }

  onSortChanged(sort: Sort): void {
    if (!sort.active || !sort.direction) {
      this.sortColumn = null;
      this.sortDirection = 'asc';
      this.applyFiltersAndSorting();
      return;
    }

    this.sortColumn = sort.active as keyof InventoryItem;
    this.sortDirection = sort.direction;
    this.pageIndex = 0;
    this.applyFiltersAndSorting();
  }

  onPageChanged(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePagedItems();
  }

  getCategoryLabel(item: InventoryItem): string {
    if (item.catName) {
      return item.catName;
    }

    if (item.categoryId === undefined || item.categoryId === null) {
      return 'Uncategorized';
    }

    const found = this.categories.find(c => Number(c.id) === item.categoryId);
    return found?.name ?? `Category ${item.categoryId}`;
  }

  private buildCategoryOptions(apiCategories: InventoryCategory[], normalizedInventoryItems: InventoryItem[], hasRecipeComponents: boolean): InventoryCategory[] {
    const options = apiCategories
      .filter(c => c.id && c.name)
      .map(c => ({ id: String(c.id), name: c.name, code: c.code, description: c.description }));

    const hasUncategorizedItems = normalizedInventoryItems.some(item => item.categoryKey === this.uncategorizedKey);
    if (hasRecipeComponents) {
      options.push({ id: this.componentsKey, name: 'Recipe Component', code: undefined, description: undefined });
    }
    if (hasUncategorizedItems) {
      options.push({ id: this.uncategorizedKey, name: 'Uncategorized', code: undefined, description: undefined });
    }

    const uniqueById = new Map<string, InventoryCategory>();
    for (const option of options) {
      uniqueById.set(option.id, option);
    }

    return Array.from(uniqueById.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private getInventoryCategoryKey(item: InventoryItem): string {
    if (item.categoryId === undefined || item.categoryId === null) {
      return this.uncategorizedKey;
    }

    return item.categoryId !== undefined ? String(item.categoryId) : this.uncategorizedKey;
  }

  private getInventoryCategoryName(item: InventoryItem, categoryMap: Map<string, string>): string {
    if (item.categoryId === undefined || item.categoryId === null) {
      return 'Uncategorized';
    }

    return categoryMap.get(item.categoryId !== undefined ? String(item.categoryId) : '') ?? `Category ${item.categoryId}`;
  }

  private getAutocompleteOptions(term: string): string[] {
    const normalized = term.trim().toLowerCase();
    const uniqueNames = Array.from(new Set(this.allInventoryItems.map(i => i.itemName)));
    if (!normalized) {
      return uniqueNames.sort((a, b) => a.localeCompare(b)).slice(0, 15);
    }

    return uniqueNames
      .filter(name => name.toLowerCase().includes(normalized))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 15);
  }

  private applyFiltersAndSorting(): void {
    const nameTerm = this.nameFilter.value.trim().toLowerCase();
    const selectedCategoryKey = this.categoryFilter || null;

    const filtered = this.allInventoryItems.filter(item => {
      const matchesName = !nameTerm || (item.itemName ?? '').toLowerCase().includes(nameTerm);
      let itemCategoryKey = item.categoryKey ?? this.getInventoryCategoryKey(item);
      // Special handling: if 'Recipe Component' is selected, match all recipe components
      if (selectedCategoryKey === this.componentsKey) {
        return item.sourceType === 'recipe-component';
      }
      const matchesCategory = selectedCategoryKey === null || itemCategoryKey === selectedCategoryKey;
      return matchesName && matchesCategory;
    });

    this.inventoryItems = this.sortItems(filtered);
    this.updatePagedItems();
  }

  private updatePagedItems(): void {
    const start = this.pageIndex * this.pageSize;
    this.pagedInventoryItems = this.inventoryItems.slice(start, start + this.pageSize);
  }

  private sortItems(items: InventoryItem[]): InventoryItem[] {
    const sortColumn = this.sortColumn;
    if (!sortColumn) {
      return [...items];
    }

    return [...items].sort((a, b) => {
      const left = sortColumn === 'categoryId' ? this.getCategoryLabel(a) : a[sortColumn];
      const right = sortColumn === 'categoryId' ? this.getCategoryLabel(b) : b[sortColumn];

      if (left === right) {
        return 0;
      }

      const leftValue = left ?? '';
      const rightValue = right ?? '';

      let comparison = 0;
      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        comparison = leftValue - rightValue;
      } else {
        comparison = String(leftValue).localeCompare(String(rightValue));
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }
}
