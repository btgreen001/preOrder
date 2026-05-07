import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

import { RecipeService, RecipeDetail } from '../services/recipe.service';
import { RoleService } from '../../../../shared-data-services/role.service';

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './recipe-list.component.html',
  styleUrls: ['./recipe-list.component.css']
})
export class RecipeListComponent implements OnInit, AfterViewInit {
  private static readonly EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

  @ViewChild(MatSort) sort!: MatSort;
  
  recipes: RecipeDetail[] = [];
  loading = true;
  error = '';
  displayedColumns: string[] = ['name', 'description', 'yieldServingCnt', 'status', 'actions'];
  pageSize = 10;
  pageIndex = 0;
  totalRecipes = 0;
  sortActive = '';
  sortDirection: 'asc' | 'desc' | '' = '';
  private isInitialLoad = true;
  private sortStateApplied = false;

  private readonly STORAGE_KEY = 'recipe-list-sort';
  isAdmin = false;

  getStatusLabel(statusCode: string): string {
    const statusMap: { [key: string]: string } = {
      'D': 'Draft',
      'A': 'Active',
      'X': 'Archived',
      'B': 'Abandoned'
    };
    return statusMap[statusCode] || 'Unknown';
  }

  getStatusClass(statusCode: string): string {
    const classMap: { [key: string]: string } = {
      'D': 'draft-badge',
      'A': 'active-badge',
      'X': 'archived-badge',
      'B': 'abandoned-badge'
    };
    return classMap[statusCode] || 'unknown-badge';
  }

  getNormalizedBatchYield(recipe: RecipeDetail | null | undefined): number {
    const servings = Number(recipe?.yieldServingCnt) || 0;
    const unitsPerServing = Number(recipe?.unitsPerServing) || 0;
    return servings * unitsPerServing;
  }

  getNormalizedYieldLabel(recipe: RecipeDetail | null | undefined): string {
    const servings = Number(recipe?.yieldServingCnt) || 0;
    const unitsPerServing = Number(recipe?.unitsPerServing) || 0;
    const yieldUnit = String(recipe?.yieldUnit || 'g');
    const normalized = this.getNormalizedBatchYield(recipe);
    return `${normalized.toLocaleString()} ${yieldUnit} (${servings} × ${unitsPerServing} ${yieldUnit})`;
  }

  hasLinkedProduct(recipe: RecipeDetail | null | undefined): boolean {
    const productExternalId = String(recipe?.productExternalId ?? '').trim();
    if (productExternalId == null) return false;
    if (productExternalId == '') return false;
    if (!productExternalId) return false;
    if (productExternalId === RecipeListComponent.EMPTY_GUID) return false;
    return true;
  }

  constructor(
    private recipeService: RecipeService,
    private roleService: RoleService,
    private router: Router
  ) {
    // Load saved sort state from localStorage
    const savedSort = localStorage.getItem(this.STORAGE_KEY);
    console.log('Loading saved sort from localStorage:', savedSort);
    if (savedSort) {
      try {
        const sortState = JSON.parse(savedSort);
        // Only apply if we have both active column and valid direction
        if (sortState.active && sortState.direction && (sortState.direction === 'asc' || sortState.direction === 'desc')) {
          this.sortActive = sortState.active;
          this.sortDirection = sortState.direction;
          console.log('Loaded sort state:', { active: this.sortActive, direction: this.sortDirection });
        } else {
          console.log('Invalid sort state in localStorage, ignoring');
        }
      } catch (e) {
        console.error('Error parsing saved sort state:', e);
      }
    }

    const role = this.roleService.getCurrentRole();
    const rawRole = this.roleService.getCurrentUser()?.role;
    this.isAdmin = role === 'admin' || role === 'SystemAdmin'
      || rawRole === 'CompanyAdmin' || rawRole === 'SystemAdmin' || rawRole === 'admin';
  }

  ngOnInit(): void {
    this.loadRecipes();
  }

  ngAfterViewInit(): void {
    // Sort state will be applied after the first data load when the table is rendered
    this.isInitialLoad = false;
    console.log('ngAfterViewInit - Component initialized');
  }

  onSortChange(sort: Sort): void {
    console.log('onSortChange triggered:', { 
      sort, 
      isInitialLoad: this.isInitialLoad
    });
    
    this.sortActive = sort.active;
    this.sortDirection = sort.direction as 'asc' | 'desc' | '';
    this.pageIndex = 0; // Reset to first page when sorting changes
    
    // Save sort state to localStorage (only if there's an active sort)
    if (this.sortDirection) {
      const stateToSave = {
        active: this.sortActive,
        direction: this.sortDirection
      };
      console.log('Saving to localStorage:', stateToSave);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stateToSave));
    } else {
      // Clear saved sort when user clears the sort
      console.log('Clearing localStorage - sort was cleared');
      localStorage.removeItem(this.STORAGE_KEY);
    }
    
    // Only reload if this is not the initial load
    if (!this.isInitialLoad) {
      console.log('Loading recipes with new sort...');
      this.loadRecipes(); // Reload with new sort parameters
    } else {
      console.log('Skipping data reload - isInitialLoad:', this.isInitialLoad);
    }
  }

  /**
   * Map frontend column names to backend sort field names
   */
  private mapSortColumn(columnName: string): string {
    const columnMap: { [key: string]: string } = {
      'name': 'name',
      'description': 'description',
      'yieldServingCnt': 'yieldquantity',
      'status': 'status'
    };
    return columnMap[columnName] || columnName;
  }

  loadRecipes(): void {
    this.loading = true;
    this.error = '';
    
    // Map the frontend column name to the backend expected format
    const backendSortColumn = this.sortActive ? this.mapSortColumn(this.sortActive) : '';
    
    this.recipeService.getRecipes(
      this.pageIndex + 1, 
      this.pageSize,
      backendSortColumn,
      this.sortDirection
    ).subscribe({
      next: (response) => {
        this.recipes = response.data;
        this.totalRecipes = response.totalCount;
        this.loading = false;
        
        // Mark sort state as applied on first load
        // The template bindings [matSortActive] and [matSortDirection] handle visual state automatically
        if (!this.sortStateApplied) {
          this.sortStateApplied = true;
          console.log('First load complete - sort state applied via template bindings');
        }
      },
      error: (err) => {
        console.error('Error loading recipes:', err);
        this.error = err.error?.message || 'Failed to load recipes';
        this.loading = false;
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadRecipes();
  }

  editRecipe(recipeId: string): void {
    this.router.navigate(['/recipes/edit', recipeId]);
  }

  viewRecipe(recipeId: string): void {
    this.router.navigate(['/recipes/view', recipeId]);
  }

  deleteRecipe(recipeId: string): void {
    if (confirm('Are you sure you want to delete this recipe?')) {
      this.recipeService.deleteRecipe(recipeId).subscribe({
        next: () => {
          this.loadRecipes();
        },
        error: (err) => {
          console.error('Error deleting recipe:', err);
          this.error = err.error?.message || 'Failed to delete recipe';
        }
      });
    }
  }

  addNewRecipe(): void {
    this.router.navigate(['/recipes/add']);
  }
}
