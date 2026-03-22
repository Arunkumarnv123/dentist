import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  template: `
    <!-- Navbar -->
    <nav class="navbar" *ngIf="auth.isLoggedIn">
      <div class="navbar-inner">
        <a class="navbar-brand" [routerLink]="isPatient ? '/patient-portal' : '/dashboard'">
          <span class="icon">🦷</span>
          <span>DentalCamp</span>
        </a>

        <!-- Patient Nav -->
        <div class="navbar-links" *ngIf="isPatient">
          <a routerLink="/patient-portal" routerLinkActive="active">📋 My Appointments</a>
          <a routerLink="/book-appointment" routerLinkActive="active">📅 Book</a>
        </div>

        <!-- Staff Nav -->
        <div class="navbar-links" *ngIf="!isPatient">
          <a routerLink="/dashboard" routerLinkActive="active">📊 Dashboard</a>
          <a *ngIf="activeCampId" [routerLink]="['/queue', activeCampId]" routerLinkActive="active">📋 Queue</a>
          <a routerLink="/camps" routerLinkActive="active">🏕️ Camps</a>
          <a *ngIf="auth.hasRole('system_admin')" routerLink="/admin" routerLinkActive="active">⚙️ Admin</a>
        </div>

        <div class="navbar-user" *ngIf="auth.currentUser">
          <div class="user-avatar">{{ auth.currentUser.name.charAt(0) }}</div>
          <span style="font-size: 0.85rem; color: var(--text-secondary);">{{ auth.currentUser.name }}</span>
          <button class="btn btn-outline btn-sm" (click)="logout()">Logout</button>
        </div>
      </div>
    </nav>

    <router-outlet></router-outlet>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
  `]
})
export class AppComponent {
  activeCampId: string | null = null;

  constructor(public auth: AuthService, private router: Router) {
    const stored = localStorage.getItem('dental_active_camp');
    if (stored) this.activeCampId = stored;
  }

  get isPatient(): boolean {
    return this.auth.currentUser?.role === 'patient';
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
