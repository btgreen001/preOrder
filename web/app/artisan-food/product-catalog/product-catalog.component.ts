import { RoleService } from '../../../shared-data-services/role.service';
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductsService } from '../../features/products/services/products.service';
import { OrganizationService } from '../../../shared-data-services/organization.service';

interface Product {
  id: string;
  externalId: string;  // ← UUID for API calls
  name: string;
  category: string;
  unitPrice: number;
  description?: string;
  customizable?: boolean;
  options?: {
    sizes?: { name: string; multiplier: number }[];
    flavors?: string[];
    toppings?: { name: string; price: number }[];
  };
  allergens?: string[];
  preparationTime?: string;
  servings?: string;
  sku?: string;
  isActive?: boolean;
  organizationId?: string;
}

@Component({
  selector: 'app-product-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-catalog.component.html',
  styleUrls: ['./product-catalog.component.scss']
})
export class ProductCatalogComponent implements OnInit {
  private roleService = inject(RoleService);
  private productsService = inject(ProductsService);
  private organizationService = inject(OrganizationService);

  isAdmin = false;
  showAddForm = false;
  newProduct: Partial<Product> = {};
  editIndex: string | null = null;
  deleteIndex: string | null = null;
  isLoading = false;
  errorMessage: string | null = null;

  editProductData: Partial<Product> = {};
  searchTerm = '';
  selectedCategory = 'all';
  categories: string[] = [];

  products: Product[] = [];

  get filteredProducts() {
    return this.products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           (product.description?.toLowerCase().includes(this.searchTerm.toLowerCase()) ?? false);
      const categoryFromDb = product.category?.toLowerCase() || '';
      const matchesCategory = this.selectedCategory === 'all' || categoryFromDb === this.selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }

  constructor() {
    this.isAdmin = this.roleService.getCurrentRole() === 'admin';
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  /**
   * Load products from the API
   */
  loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.productsService.getAllProducts().subscribe({
      next: (data) => {
        console.log('Products loaded successfully:', data);
        // Convert API products to local Product interface
        this.products = data.map(p => ({
          id: p.id,
          externalId: p.externalId,  // ← Capture externalId from API
          name: p.name,
          category: (p.category || 'other').toLowerCase(),
          unitPrice: p.unitPrice,
          sku: p.sku,
          description: p.description || '',
          isActive: p.isActive,
          organizationId: p.organizationId,
          customizable: false,
          allergens: [],
          preparationTime: '',
          servings: ''
        }));
        
        // Extract unique categories for filter dropdown
        const uniqueCategories = Array.from(new Set(this.products.map(p => p.category).filter(c => c)));
        this.categories = ['all', ...uniqueCategories.sort()];
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.errorMessage = `Failed to load products: ${error.statusText || error.message}`;
        this.isLoading = false;
      }
    });
  }

  addProduct() {
    if (this.newProduct.name && this.newProduct.category && this.newProduct.unitPrice !== undefined) {
      this.productsService.createProduct({
        name: this.newProduct.name!,
        sku: this.newProduct.sku || '',
        category: this.newProduct.category!,
        description: this.newProduct.description || '',
        unitPrice: Number(this.newProduct.unitPrice)
      }).subscribe({
        next: (newProd) => {
          console.log('Product created successfully:', newProd);
          this.products = [...this.products, {
            id: newProd.id,
            externalId: newProd.externalId,  // ← Include externalId
            name: newProd.name,
            category: (newProd.category || 'other').toLowerCase(),
            unitPrice: newProd.unitPrice,
            sku: newProd.sku,
            description: newProd.description || '',
            isActive: newProd.isActive,
            organizationId: newProd.organizationId,
            customizable: false,
            allergens: [],
            preparationTime: '',
            servings: ''
          }];
          this.newProduct = {};
          this.showAddForm = false;
        },
        error: (error) => {
          console.error('Error creating product:', error);
          this.errorMessage = `Failed to create product: ${error.statusText || error.message}`;
        }
      });
    }
  }

  editProduct(productId: string) {
    this.editIndex = productId;
    const product = this.products.find(p => p.id === productId);
    if (product) {
      this.editProductData = { ...product };
    }
  }

  saveEditProduct() {
    if (this.editIndex !== null && this.editProductData.name && this.editProductData.unitPrice !== undefined) {
      // Find the product to get the externalId
      const product = this.products.find(p => p.id === this.editIndex);
      if (!product) {
        console.error('Product not found for ID:', this.editIndex);
        return;
      }
      
      const externalId = product.externalId;  // ← Use externalId for API call
      this.productsService.updateProduct(externalId, {
        name: this.editProductData.name,
        sku: this.editProductData.sku,
        category: this.editProductData.category,
        description: this.editProductData.description,
        unitPrice: Number(this.editProductData.unitPrice)
      }).subscribe({
        next: (updatedProd) => {
          console.log('Product updated successfully:', updatedProd);
          this.products = this.products.map(p => p.id === this.editIndex ? {
            ...p,
            name: updatedProd.name,
            unitPrice: updatedProd.unitPrice,
            sku: updatedProd.sku,
            category: (updatedProd.category || 'other').toLowerCase(),
            description: updatedProd.description
          } : p);
          this.editIndex = null;
          this.editProductData = {};
        },
        error: (error) => {
          console.error('Error updating product:', error);
          this.errorMessage = `Failed to update product: ${error.statusText || error.message}`;
        }
      });
    }
  }

  cancelEdit() {
    this.editIndex = null;
    this.editProductData = {};
  }

  showDeleteConfirm(productId: string) {
    this.deleteIndex = productId;
  }

  cancelDelete() {
    this.deleteIndex = null;
  }

  confirmDeleteProduct() {
    if (this.deleteIndex !== null) {
      // Find the product to get the externalId
      const product = this.products.find(p => p.id === this.deleteIndex);
      if (!product) {
        console.error('Product not found for ID:', this.deleteIndex);
        return;
      }
      
      const externalId = product.externalId;  // ← Use externalId for API call
      this.productsService.deleteProduct(externalId).subscribe({
        next: () => {
          console.log('Product deleted successfully:', externalId);
          this.products = this.products.filter(p => p.id !== this.deleteIndex);
          if (this.editIndex === this.deleteIndex) {
            this.cancelEdit();
          }
          this.cancelDelete();
        },
        error: (error) => {
          console.error('Error deleting product:', error);
          this.errorMessage = `Failed to delete product: ${error.statusText || error.message}`;
        }
      });
    }
  }

  deleteProduct(productId: string) {
    this.products = this.products.filter(p => p.id !== productId);
    if (this.editIndex === productId) {
      this.cancelEdit();
    }
  }
  addToCart(product: Product) {
    alert(`Added ${product.name} to cart!`);
  }
}