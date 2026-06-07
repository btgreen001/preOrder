import { Component } from '@angular/core';


@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [],
  template: `
    <div class="reports-container">
      <h2>Inventory Reports</h2>
      <p>Analytics, turnover, costing, and efficiency metrics</p>
    </div>
  `,
  styles: [`
    .reports-container {
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
export class ReportsDashboardComponent {}