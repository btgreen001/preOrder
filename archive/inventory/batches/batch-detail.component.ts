import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryService, Batch } from '../inventory.service';

@Component({
	selector: 'app-batch-detail',
	standalone: true,
	imports: [CommonModule],
	template: `
		<div class="batch-detail-container" *ngIf="!loading && batch">
			<header class="page-header">
				<h1>Batch Details</h1>
				<div class="actions">
					<button class="btn-secondary" (click)="edit()">Edit</button>
					<button class="btn-danger" (click)="delete()">Delete</button>
					<button class="btn-secondary" (click)="back()">Back</button>
				</div>
			</header>

			<div class="detail-grid">
				<div class="detail-item"><label>Batch Number</label><p>{{ batch.batchNumber }}</p></div>
				<div class="detail-item"><label>Item</label><p>{{ batch.itemName }}</p></div>
				<div class="detail-item"><label>Quantity</label><p>{{ batch.quantity }} {{ batch.unit }}</p></div>
				<div class="detail-item"><label>Cost/Unit</label><p>{{ batch.costPerUnit | number:'1.2-2' }}</p></div>
				<div class="detail-item"><label>Supplier</label><p>{{ batch.supplier }}</p></div>
				<div class="detail-item"><label>Received</label><p>{{ batch.receivedDate | date:'mediumDate' }}</p></div>
				<div class="detail-item"><label>Expires</label><p>{{ batch.expirationDate ? (batch.expirationDate | date:'mediumDate') : 'N/A' }}</p></div>
				<div class="detail-item"><label>Status</label>
					<p><span class="status-badge" [class]="batch.status">{{ batch.status | titlecase }}</span></p>
				</div>
				<div class="detail-item"><label>Location</label><p>{{ batch.location }}</p></div>
			</div>
		</div>

		<div *ngIf="loading" class="loading">Loading batch...</div>
		<div *ngIf="error" class="error">{{ error }}</div>
	`,
	styles: [`
		.batch-detail-container { padding: 20px; background: var(--bakery-bg); color: var(--bakery-text-emph); min-height: 100vh; }
		.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
		.actions { display: flex; gap: 10px; }
		.detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; background: var(--bakery-surface); padding: 20px; border-radius: 8px; box-shadow: var(--bakery-shadow-soft); }
		.detail-item { border: 1px solid var(--bakery-accent); border-radius: 6px; padding: 12px; background: var(--bakery-bg); }
		.detail-item label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 0.85rem; color: var(--bakery-text-emph); }
		.status-badge { padding: 4px 8px; border-radius: 12px; text-transform: uppercase; font-size: 0.75rem; }
		.status-badge.active { background: var(--bakery-success); color: #fff; }
		.status-badge.expired { background: var(--bakery-error); color: #fff; }
		.status-badge.used { background: var(--bakery-text-muted); color: #fff; }
		.btn-secondary, .btn-danger { padding: 8px 12px; border-radius: 4px; border: 1px solid var(--bakery-accent); cursor: pointer; }
		.btn-danger { background: var(--bakery-error); color: #fff; border: none; }
		.loading, .error { padding: 30px; text-align: center; }
	`]
})
export class BatchDetailComponent implements OnInit {
	private route = inject(ActivatedRoute);
	private router = inject(Router);
	private inventoryService = inject(InventoryService);

	loading = true;
	error = '';
	id = '';
	batch: Batch | null = null;

	ngOnInit(): void {
		this.id = this.route.snapshot.params['id'];
		this.inventoryService.getBatch(this.id).subscribe({
			next: (b) => { this.batch = b; this.loading = false; },
			error: (err) => { this.error = 'Failed to load batch.'; this.loading = false; console.error(err); }
		});
	}

	edit() { this.router.navigate(['/inventory/batches', this.id, 'edit']); }
	back() { this.router.navigate(['/inventory/batches']); }
	delete() {
		if (confirm('Delete this batch?')) {
			this.inventoryService.deleteBatch(this.id).subscribe({
				next: () => this.router.navigate(['/inventory/batches']),
				error: (err) => alert('Failed to delete batch (mock).')
			});
		}
	}
}