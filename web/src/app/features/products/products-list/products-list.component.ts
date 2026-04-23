import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Product, ProductsService } from '../services/products.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProductComponentCreateComponent, ProductComponentCreateModel } from '../components/product-component-create/product-component-create.component';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.css']
})
export class ProductsListComponent implements OnInit {
  products: Product[] = [];
  displayedColumns: string[] = ['name', 'sku', 'type', 'description', 'unitPrice', 'actions'];
  isLoading = true;
  errorMessage: string | null = null;

  constructor(private productsService: ProductsService, private dialog: MatDialog, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  openCreateComponentModal(): void {
    const ref = this.dialog.open(ProductComponentCreateComponent, {
      width: '560px'
    });

    const instance = ref.componentInstance as ProductComponentCreateComponent;

    const subCreate = instance.create.subscribe((payload: ProductComponentCreateModel) => {
      console.log('Component create payload (modal):', payload);
      const req = {
        name: payload.name,
        sku: payload.sku || '',
        category: 'recipe component',
        description: `Created from products list`,
        unitPrice: 0,
        IsRecipeComponent: payload.isRecipeComponent,
        isForSale: payload.isListedForSale
      };

      const attemptCreate = (requestBody: any, retryOnConflict = true) => {
        this.productsService.createProduct(requestBody).subscribe({
          next: (created) => {
            this.products = [...this.products, created];
            this.snackBar.open(`Created component product: ${created.name}`, 'Close', { duration: 3000 });
            ref.close();
            subCreate.unsubscribe();
          },
          error: (err) => {
            console.error('Error creating product:', err);
            if (err && err.status === 409 && retryOnConflict) {
              // Conflict — request a server-generated SKU and retry once
              this.productsService.suggestSku().subscribe({
                next: (sugg) => {
                  console.log('Received SKU suggestion from server:', sugg);
                  requestBody.sku = sugg?.sku || requestBody.sku;
                  attemptCreate(requestBody, false);
                },
                error: (suggErr) => {
                  console.error('SKU suggestion failed:', suggErr);
                  this.snackBar.open('Failed to generate alternative SKU; create aborted.', 'Close', { duration: 4000 });
                }
              });
            } else {
              this.snackBar.open('Failed to create product. See console for details.', 'Close', { duration: 4000 });
            }
          }
        });
      };

      attemptCreate(req);
    });

    const subCancel = instance.cancel.subscribe(() => {
      ref.close();
      subCancel.unsubscribe();
      subCreate.unsubscribe();
    });
  }

  /**
   * Load all products from the backend
   */
  loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.productsService.getAllProducts().subscribe({
      next: (data) => {
        console.log('Products loaded successfully:', data);
        this.products = data;
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
          this.errorMessage = 'You do not have permission to view products.';
        } else if (error.status === 0 || error.statusText === 'Unknown Error') {
          this.errorMessage = 'Network error or CORS issue. Check browser console for details.';
        } else {
          this.errorMessage = `Failed to load products: ${error.statusText || error.message}`;
        }
        this.isLoading = false;
      }
    });
  }

  /**
   * Delete a product
   */
  deleteProduct(id: string): void {
    if (confirm('Are you sure you want to delete this product?')) {
      // Find the product to get externalId
      const product = this.products.find(p => p.id === id);
      if (!product || !product.externalId) {
        console.error('Product or externalId not found for ID:', id);
        return;
      }
      
      this.productsService.deleteProduct(product.externalId).subscribe({
        next: () => {
          console.log('Product deleted successfully:', product.externalId);
          this.products = this.products.filter(p => p.id !== id);
        },
        error: (error) => {
          console.error('Delete error:', error);
          console.error('Error status:', error.status);
          
          // Provide user-friendly error messages
          if (error.status === 401) {
            this.errorMessage = 'Session expired. Please login again.';
          } else if (error.status === 404) {
            this.errorMessage = 'Product not found.';
          } else if (error.status === 403) {
            this.errorMessage = 'You do not have permission to delete products.';
          } else {
            this.errorMessage = `Failed to delete product: ${error.statusText || error.message}`;
          }
        }
      });
    }
  }
}
