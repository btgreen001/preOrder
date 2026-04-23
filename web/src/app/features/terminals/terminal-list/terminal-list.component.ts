import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { TerminalService, Terminal } from '../services/terminal.service';

@Component({
  selector: 'app-terminal-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatBadgeModule
  ],
  templateUrl: './terminal-list.component.html',
  styleUrls: ['./terminal-list.component.scss']
})
export class TerminalListComponent implements OnInit {
  terminals: Terminal[] = [];
  displayedColumns = ['terminalCode', 'location', 'status', 'createdOn', 'actions'];
  isLoading = true;
  errorMessage: string | null = null;

  private terminalService = inject(TerminalService);
  private router = inject(Router);

  ngOnInit(): void {
    this.loadTerminals();
  }

  private loadTerminals(): void {
    this.isLoading = true;
    this.errorMessage = null;
    
    this.terminalService.getAllTerminals().subscribe({
      next: (terminals) => {
        this.isLoading = false;
        this.terminals = terminals;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load terminals. Please try again.';
        console.error('Error loading terminals:', error);
      }
    });
  }

  createTerminal(): void {
    this.router.navigate(['/terminals/create']);
  }

  editTerminal(terminal: Terminal): void {
    this.router.navigate(['/terminals/edit', terminal.terminalUid]);
  }

  deactivateTerminal(terminal: Terminal): void {
    if (confirm(`Are you sure you want to deactivate terminal ${terminal.terminalCode}?`)) {
      this.terminalService.deactivateTerminal(terminal.terminalUid).subscribe({
        next: () => {
          this.loadTerminals();
        },
        error: (error) => {
          this.errorMessage = 'Failed to deactivate terminal.';
          console.error('Error deactivating terminal:', error);
        }
      });
    }
  }

  reactivateTerminal(terminal: Terminal): void {
    if (confirm(`Are you sure you want to reactivate terminal ${terminal.terminalCode}?`)) {
      this.terminalService.reactivateTerminal(terminal.terminalUid).subscribe({
        next: () => {
          this.loadTerminals();
        },
        error: (error) => {
          this.errorMessage = 'Failed to reactivate terminal.';
          console.error('Error reactivating terminal:', error);
        }
      });
    }
  }

  deleteTerminal(terminal: Terminal): void {
    this.router.navigate(['/terminals/delete', terminal.terminalUid]);
  }

  retry(): void {
    this.loadTerminals();
  }
}
