import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TerminalService, Terminal } from '../services/terminal.service';

@Component({
  selector: 'app-terminal-delete-confirm',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './terminal-delete-confirm.component.html',
  styleUrls: ['./terminal-delete-confirm.component.scss']
})
export class TerminalDeleteConfirmComponent implements OnInit {
  terminal: Terminal | null = null;
  isLoading = false;
  isDeleting = false;
  errorMessage: string | null = null;
  terminalUid: string | null = null;

  private terminalService = inject(TerminalService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.terminalUid = this.route.snapshot.paramMap.get('id');
    if (this.terminalUid) {
      this.loadTerminal();
    }
  }

  private loadTerminal(): void {
    if (!this.terminalUid) return;

    this.isLoading = true;
    this.terminalService.getTerminal(this.terminalUid).subscribe({
      next: (terminal) => {
        this.isLoading = false;
        this.terminal = terminal;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load terminal details.';
        console.error('Error loading terminal:', error);
      }
    });
  }

  confirm(): void {
    if (!this.terminalUid) return;

    this.isDeleting = true;
    this.errorMessage = null;

    this.terminalService.deactivateTerminal(this.terminalUid).subscribe({
      next: () => {
        this.isDeleting = false;
        // Navigate back to list after successful delete
        this.router.navigate(['/terminals']);
      },
      error: (error) => {
        this.isDeleting = false;
        this.errorMessage = 'Failed to delete terminal. Please try again.';
        console.error('Error deleting terminal:', error);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/terminals']);
  }
}
