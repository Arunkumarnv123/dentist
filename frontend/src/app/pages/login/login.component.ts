import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-page">
      <div class="login-container fade-in">
        <div class="login-header">
          <div class="login-icon">🦷</div>
          <h1>DentalCamp</h1>
          <p>Digital Dental Camp Management System</p>
        </div>

        <div class="login-tabs">
          <button class="tab-btn" [class.active]="loginMode === 'staff'" (click)="loginMode = 'staff'">
            👨‍⚕️ Staff / Doctor
          </button>
          <button class="tab-btn" [class.active]="loginMode === 'patient'" (click)="loginMode = 'patient'">
            🧑‍💼 Patient
          </button>
        </div>

        <form (ngSubmit)="login()" class="login-form" *ngIf="loginMode === 'staff'">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-control" [(ngModel)]="email" name="email"
                   placeholder="Enter your email address" required autocomplete="email">
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="form-control" [(ngModel)]="password" name="password"
                   placeholder="Enter your password" required autocomplete="current-password">
          </div>

          <div *ngIf="error" class="error-msg">{{ error }}</div>

          <button type="submit" id="staff-login-btn" class="btn btn-primary btn-lg btn-block" [disabled]="loading">
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <form (ngSubmit)="loginPatient()" class="login-form" *ngIf="loginMode === 'patient'">
          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input appPhoneOnly class="form-control" [(ngModel)]="phone" name="phone"
                   placeholder="10-digit mobile number" required autocomplete="tel">
          </div>

          <div class="form-group">
            <label class="form-label">Passkey</label>
            <input type="password" class="form-control" [(ngModel)]="passkey" name="passkey"
                   placeholder="Enter your passkey" required autocomplete="current-password">
          </div>

          <div *ngIf="error" class="error-msg">{{ error }}</div>

          <button type="submit" id="patient-login-btn" class="btn btn-accent btn-lg btn-block" [disabled]="loading">
            {{ loading ? 'Signing in...' : 'View My Report' }}
          </button>
        </form>

        <div class="register-link">
          <p *ngIf="loginMode === 'patient'">
            Registered at camp? Use the phone number and passkey you set during registration.
          </p>
          <p *ngIf="loginMode === 'staff'">
            Are you a dentist? <a routerLink="/dentist-register">Register here</a>
          </p>
          <p style="margin-top: 0.5rem">
            Are you a patient? <a routerLink="/patient-register">Register here</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      padding: 1rem;
    }
    .login-container {
      width: 100%;
      max-width: 440px;
      background: rgba(30, 41, 59, 0.8);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(148, 163, 184, 0.15);
      border-radius: 20px;
      padding: 2.5rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    .login-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .login-icon {
      font-size: 3rem;
      margin-bottom: 0.5rem;
    }
    .login-header h1 {
      font-size: 1.75rem;
      background: linear-gradient(135deg, #14b8a6, #f97316);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .login-header p {
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin-top: 0.3rem;
    }
    .login-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      background: rgba(15, 23, 42, 0.5);
      border-radius: 12px;
      padding: 0.35rem;
    }
    .tab-btn {
      flex: 1;
      padding: 0.6rem 0.5rem;
      background: transparent;
      border: none;
      border-radius: 8px;
      color: var(--text-secondary);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-btn.active {
      background: var(--primary);
      color: white;
    }
    .error-msg {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      padding: 0.75rem;
      color: #f87171;
      font-size: 0.85rem;
      margin-bottom: 1rem;
      text-align: center;
    }
    .register-link {
      margin-top: 1.25rem;
      text-align: center;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }
    .register-link p {
      color: var(--text-secondary);
      font-size: 0.85rem;
      margin-bottom: 0.4rem;
    }
    .register-link a {
      color: #14b8a6;
      font-weight: 600;
      text-decoration: none;
    }
    .register-link a:hover {
      text-decoration: underline;
    }
    .btn-accent {
      background: linear-gradient(135deg, #f97316, #ea580c);
      color: white;
    }
    .btn-block { width: 100%; }
  `]
})
export class LoginComponent {
  loginMode: 'staff' | 'patient' = 'staff';
  email = '';
  password = '';
  phone = '';
  passkey = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {
    if (auth.isLoggedIn) {
      const dest = auth.currentUser?.role === 'patient' ? '/patient-portal' : '/dashboard';
      this.router.navigate([dest]);
    }
  }

  sanitizePhone(): void {
    this.phone = this.phone.replace(/[^0-9]/g, '').slice(0, 10);
  }

  login(): void {
    this.error = '';
    if (!this.email || !this.password) {
      this.error = 'Please enter your email and password.';
      return;
    }
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        const dest = this.auth.currentUser?.role === 'patient' ? '/patient-portal' : '/dashboard';
        this.router.navigate([dest]);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Login failed. Please check your credentials.';
      }
    });
  }

  loginPatient(): void {
    this.error = '';
    if (!this.phone || !/^[0-9]{10}$/.test(this.phone)) {
      this.error = 'Please enter a valid 10-digit phone number.';
      return;
    }
    if (!this.passkey) {
      this.error = 'Please enter your passkey.';
      return;
    }
    this.loading = true;
    this.auth.loginWithPasskey(this.phone, this.passkey).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/patient-portal']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Invalid phone number or passkey.';
      }
    });
  }
}
