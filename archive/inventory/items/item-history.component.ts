import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryService, InventoryMovement, InventoryItem } from '../inventory.service';

@Component({
	selector: 'app-item-history',
	standalone: true,
	imports: [CommonModule],
	template: `
		<div class="history-container">
			<h2>Item History</h2>
			<p *ngIf="itemName">{{ itemName }}</p>

			<div class="error" *ngIf="error">{{ error }}</div>

			<div class="loading" *ngIf="loading">Loading movement history...</div>

			<table *ngIf="!loading && !error && movements.length > 0">
				<thead>
					<tr>
						<th>Type</th>
						<th>Quantity Delta</th>
						<th>Reason</th>
						<th>Timestamp</th>
					</tr>
				</thead>
				<tbody>
					<tr *ngFor="let movement of movements">
						<td>{{ movement.movementType }}</td>
						<td [class.negative]="movement.quantityChange < 0" [class.positive]="movement.quantityChange > 0">
							{{ movement.quantityChange > 0 ? '+' : '' }}{{ movement.quantityChange }}
						</td>
						<td>{{ movement.reason || 'N/A' }}</td>
						<td>{{ movement.createdAt | date:'short' }}</td>
					</tr>
				</tbody>
			</table>

			<div class="empty" *ngIf="!loading && !error && movements.length === 0">
				No movement history found for this item.
			</div>

			<div class="actions">
				<button class="btn-secondary" (click)="goBack()">Back to Items</button>
			</div>
		</div>
	`,
	styles: [`
		.history-container {
			padding: 20px;
			background: var(--bakery-bg);
			color: var(--bakery-text-emph);
			min-height: 100vh;
		}
		h2 {
			color: var(--bakery-text-emph);
			font-size: 2rem;
			margin: 0 0 0.5rem;
		}
		p {
			color: var(--bakery-text-muted);
			margin: 0 0 16px;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			background: var(--bakery-surface);
			border-radius: 8px;
			overflow: hidden;
			box-shadow: var(--bakery-shadow-soft);
		}
		th, td {
			padding: 12px;
			text-align: left;
			border-bottom: 1px solid var(--bakery-accent);
		}
		th {
			background: var(--bakery-accent-2);
			font-weight: 600;
		}
		.positive {
			color: var(--bakery-success);
			font-weight: 600;
		}
		.negative {
			color: var(--bakery-error);
			font-weight: 600;
		}
		.empty, .loading, .error {
			margin-top: 16px;
			padding: 14px;
			border-radius: 6px;
			background: var(--bakery-surface);
		}
		.error {
			color: var(--bakery-error);
		}
		.actions {
			margin-top: 16px;
			display: flex;
			justify-content: flex-end;
		}
		.btn-secondary {
			padding: 10px 16px;
			border: none;
			border-radius: 6px;
			cursor: pointer;
			font-weight: 600;
			background: var(--bakery-text-muted);
			color: white;
		}
	`]
})
export class ItemHistoryComponent implements OnInit {
	private route = inject(ActivatedRoute);
	private router = inject(Router);
	private inventoryService = inject(InventoryService);

	itemId = '';
	itemName = '';
	movements: InventoryMovement[] = [];
	loading = false;
	error = '';

	ngOnInit(): void {
		this.itemId = this.route.snapshot.paramMap.get('id') || '';
		if (!this.itemId) {
			this.error = 'Missing inventory item id.';
			return;
		}

		this.loading = true;

		this.inventoryService.getItem(this.itemId).subscribe({
			next: (item: InventoryItem) => {
				this.itemName = item.name;
			}
		});

		this.inventoryService.getMovements(this.itemId).subscribe({
			next: (movements) => {
				this.movements = movements;
				this.loading = false;
			},
			error: (err) => {
				this.error = err?.error?.error || 'Failed to load movement history.';
				this.loading = false;
			}
		});
	}

	goBack(): void {
		this.router.navigate(['/inventory/items']);
	}
}