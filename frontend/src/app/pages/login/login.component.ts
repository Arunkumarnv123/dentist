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

        <form (ngSubmit)="login()" class="login-form">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-control" [(ngModel)]="email" name="email"
                   placeholder="Enter your email" required autocomplete="email">
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="form-control" [(ngModel)]="password" name="password"
                   placeholder="Enter password" required autocomplete="current-password">
            <div class="forgot-link">
              <a routerLink="/forgot-password">Forgot Password?</a>
            </div>
          </div>

          <div *ngIf="error" class="error-msg">{{ error }}</div>

          <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="loading">
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <div class="register-link">
          <p>Are you a patient? <a routerLink="/patient-register">Register here</a></p>
          <p style="margin-top: 0.5rem">Are you a dentist? <a routerLink="/dentist-register">Register here</a></p>
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
      max-width: 420px;
      background: rgba(30, 41, 59, 0.8);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(148, 163, 184, 0.15);
      border-radius: 20px;
      padding: 2.5rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    .login-header {
      text-align: center;
      margin-bottom: 2rem;
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
    .forgot-link {
      text-align: right;
      margin-top: 0.4rem;
    }
    .forgot-link a {
      color: #14b8a6;
      font-size: 0.8rem;
      text-decoration: none;
      font-weight: 500;
    }
    .forgot-link a:hover {
      text-decoration: underline;
    }
    .register-link {
      margin-top: 1.5rem;
      text-align: center;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }
    .register-link p {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
    .register-link a {
      color: #14b8a6;
      font-weight: 600;
      text-decoration: none;
    }
    .register-link a:hover {
      text-decoration: underline;
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {
    if (auth.isLoggedIn) {
      const dest = auth.currentUser?.role === 'patient' ? '/patient-portal' : '/dashboard';
      this.router.navigate([dest]);
    }
  }

  login(): void {
    this.error = '';
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
}
