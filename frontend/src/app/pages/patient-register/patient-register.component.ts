import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-patient-register',
    template: `
    <div class="auth-page">
      <div class="auth-card fade-in">
        <div class="auth-header">
          <span class="auth-logo">🦷</span>
          <h1>Patient Registration</h1>
          <p>Create your account to book dental appointments</p>
        </div>

        <div *ngIf="success" class="success-box">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎉</div>
          <h3>Account Created!</h3>
          <p>You can now log in and book appointments.</p>
          <button class="btn btn-primary btn-lg" (click)="router.navigate(['/login'])" style="margin-top: 1rem;">
            Go to Login
          </button>
        </div>

        <form *ngIf="!success" (ngSubmit)="register()">
          <div class="form-group">
            <label class="form-label">Full Name *</label>
            <input type="text" class="form-control" [(ngModel)]="form.name" name="name"
                   placeholder="Enter your full name" required>
          </div>

          <div class="form-group">
            <label class="form-label">Email *</label>
            <input type="email" class="form-control" [(ngModel)]="form.email" name="email"
                   placeholder="your@email.com" required>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Phone</label>
              <input type="tel" class="form-control" [(ngModel)]="form.phone" name="phone"
                     placeholder="10-digit mobile number" pattern="[0-9]*" maxlength="10"
                     (input)="sanitizePhone()">
            </div>
            <div class="form-group">
              <label class="form-label">City</label>
              <input type="text" class="form-control" [(ngModel)]="form.city" name="city"
                     placeholder="Mumbai, Delhi...">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Address</label>
            <input type="text" class="form-control" [(ngModel)]="form.address" name="address"
                   placeholder="House No, Street, Locality">
          </div>

          <div class="form-group">
            <label class="form-label">Password *</label>
            <input type="password" class="form-control" [(ngModel)]="form.password" name="password"
                   placeholder="Min 6 characters" required>
          </div>

          <div class="form-group">
            <label class="form-label">Confirm Password *</label>
            <input type="password" class="form-control" [(ngModel)]="confirmPassword" name="confirm"
                   placeholder="Re-enter password" required>
          </div>

          <div *ngIf="error" class="error-msg">{{ error }}</div>

          <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;" [disabled]="loading">
            {{ loading ? 'Creating Account...' : 'Create Account' }}
          </button>

          <p class="auth-footer">
            Already have an account? <a routerLink="/login">Sign In</a>
          </p>
        </form>
      </div>
    </div>
  `,
    styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
    }
    .auth-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 2.5rem;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    }
    .auth-header { text-align: center; margin-bottom: 2rem; }
    .auth-logo { font-size: 3rem; display: block; margin-bottom: 0.5rem; }
    .auth-header h1 {
      font-size: 1.5rem;
      background: linear-gradient(135deg, #14b8a6, #f97316);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent; background-clip: text;
    }
    .auth-header p { color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .error-msg {
      background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px; padding: 0.75rem; color: #f87171; font-size: 0.85rem;
      margin-bottom: 1rem; text-align: center;
    }
    .success-box { text-align: center; padding: 1rem 0; }
    .success-box h3 { color: var(--success); margin-bottom: 0.5rem; }
    .success-box p { color: var(--text-secondary); }
    .auth-footer { text-align: center; margin-top: 1.25rem; color: var(--text-secondary); font-size: 0.85rem; }
    .auth-footer a { color: var(--primary-light); text-decoration: none; font-weight: 600; }

    @media (max-width: 500px) {
      .form-row { grid-template-columns: 1fr; }
      .auth-card { padding: 1.5rem; }
    }
  `]
})
export class PatientRegisterComponent {
    form: any = { name: '', email: '', password: '', phone: '', address: '', city: '' };
    confirmPassword = '';
    loading = false;
    error = '';
    success = false;

    constructor(
        private api: ApiService,
        private auth: AuthService,
        public router: Router
    ) { }

    sanitizePhone(): void {
        if (this.form.phone) {
            this.form.phone = this.form.phone.replace(/[^0-9]/g, '');
        }
    }

    register(): void {
        if (this.form.password !== this.confirmPassword) {
            this.error = 'Passwords do not match.';
            return;
        }
        if (this.form.password.length < 6) {
            this.error = 'Password must be at least 6 characters.';
            return;
        }
        if (this.form.phone && !/^[0-9]{10}$/.test(this.form.phone)) {
            this.error = 'Please enter a valid 10-digit phone number.';
            return;
        }

        this.error = '';
        this.loading = true;

        this.api.registerPatientAccount(this.form).subscribe({
            next: (res) => {
                this.loading = false;
                this.success = true;
            },
            error: (err) => {
                this.loading = false;
                this.error = err.error?.error || 'Registration failed. Please try again.';
            }
        });
    }
}
