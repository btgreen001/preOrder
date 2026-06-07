import { Component } from '@angular/core';


@Component({
  selector: 'app-item-detail',
  standalone: true,
  imports: [],
  template: `
    <div class="item-detail-container">
      <h2>Item Details</h2>
      <p>View complete item information and history</p>
    </div>
  `,
  styles: [`
    .item-detail-container {
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
      margin: 0;
    }
  `]
})
export class ItemDetailComponent {}