import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../core/services/auth.service';
import { AuthResponse } from '../core/models/auth.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatSidenavModule,
    MatListModule,
    MatCardModule,
    MatMenuModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);

  currentUser: AuthResponse | null = null;
  isAdmin = false;
  licenseTier: string | null = null;

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.isAdmin = user.role === 'CompanyAdmin' || user.role === 'SystemAdmin';
        this.licenseTier = user.licenseTier?.toString?.() || 'Unknown';
      }
    });
  }

  logoutThisSession() {
    this.authService.logout(false);
    this.router.navigate(['/login']);
  }

  logoutAllSessions() {
    this.authService.logout(true);
    this.router.navigate(['/login']);
  }

  getLicenseTierName(): string {
    if (!this.licenseTier) return 'Unknown';
    const t = this.licenseTier.toLowerCase();
    if (t.includes('basic')) return 'Basic';
    if (t.includes('standard')) return 'Standard';
    if (t.includes('professional')) return 'Professional';
    if (t.includes('enterprise')) return 'Enterprise';
    return this.licenseTier;
  }
}
