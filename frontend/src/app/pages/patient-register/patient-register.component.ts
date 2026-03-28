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
          <p>Register to view your dental report after screening</p>
        </div>

        <div *ngIf="success" class="success-box">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎉</div>
          <h3>Account Created!</h3>
          <p>You can now log in with your <strong>phone number</strong> and <strong>passkey</strong> to view your report after the doctor completes your screening.</p>
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

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Age *</label>
              <input type="number" class="form-control" [(ngModel)]="form.age" name="age"
                     placeholder="Your age" min="0" max="120" required>
            </div>
            <div class="form-group">
              <label class="form-label">Gender *</label>
              <select class="form-control" [(ngModel)]="form.gender" name="gender" required>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Phone Number * <span class="required-note">(used to login and view your report)</span></label>
            <input appPhoneOnly class="form-control" [(ngModel)]="form.phone" name="phone"
                   placeholder="10-digit mobile number" required>
          </div>

          <div class="form-group">
            <label class="form-label">Email <span class="optional-label">(optional)</span></label>
            <input type="email" class="form-control" [(ngModel)]="form.email" name="email"
                   placeholder="your@email.com (optional)">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">City <span class="optional-label">(optional)</span></label>
              <input type="text" class="form-control" [(ngModel)]="form.city" name="city"
                     placeholder="Mumbai, Delhi...">
            </div>
            <div class="form-group">
              <label class="form-label">Address <span class="optional-label">(optional)</span></label>
              <input type="text" class="form-control" [(ngModel)]="form.address" name="address"
                     placeholder="House No, Street...">
            </div>
          </div>

          <div class="passkey-section">
            <div class="passkey-info">
              🔑 <strong>Create a Passkey</strong> — Remember this to login and view your dental report
            </div>
            <div class="form-group">
              <label class="form-label">Passkey * <span class="required-note">(4–20 characters, letters & numbers)</span></label>
              <input type="password" class="form-control" [(ngModel)]="form.passkey" name="passkey"
                     placeholder="Create a passkey (e.g. John1234)" required minlength="4" maxlength="20">
            </div>
            <div class="form-group">
              <label class="form-label">Confirm Passkey *</label>
              <input type="password" class="form-control" [(ngModel)]="confirmPasskey" name="confirm"
                     placeholder="Re-enter your passkey" required>
            </div>
          </div>

          <div *ngIf="error" class="error-msg">{{ error }}</div>

          <button type="submit" id="patient-register-btn" class="btn btn-primary btn-lg" style="width: 100%;" [disabled]="loading">
            {{ loading ? 'Creating Account...' : 'Create Account' }}
          </button>

          <p class="auth-footer">
            Already registered? <a routerLink="/login">Sign In</a>
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
      max-width: 500px;
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
    .required-note, .optional-label {
      font-size: 0.75rem;
      font-weight: 400;
      color: var(--text-muted);
    }
    .passkey-section {
      background: rgba(20, 184, 166, 0.06);
      border: 1px solid rgba(20, 184, 166, 0.2);
      border-radius: 12px;
      padding: 1rem;
      margin: 1rem 0;
    }
    .passkey-info {
      color: #14b8a6;
      font-size: 0.85rem;
      margin-bottom: 0.75rem;
    }
    .error-msg {
      background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px; padding: 0.75rem; color: #f87171; font-size: 0.85rem;
      margin-bottom: 1rem; text-align: center;
    }
    .success-box { text-align: center; padding: 1rem 0; }
    .success-box h3 { color: var(--success); margin-bottom: 0.5rem; }
    .success-box p { color: var(--text-secondary); line-height: 1.6; }
    .auth-footer { text-align: center; margin-top: 1.25rem; color: var(--text-secondary); font-size: 0.85rem; }
    .auth-footer a { color: var(--primary-light); text-decoration: none; font-weight: 600; }

    @media (max-width: 500px) {
      .form-row { grid-template-columns: 1fr; }
      .auth-card { padding: 1.5rem; }
    }
  `]
})
export class PatientRegisterComponent {
    form: any = {
        name: '', phone: '', email: '', passkey: '',
        age: '', gender: '', address: '', city: ''
    };
    confirmPasskey = '';
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
            this.form.phone = this.form.phone.replace(/[^0-9]/g, '').slice(0, 10);
        }
    }

    register(): void {
        if (!this.form.name || !this.form.phone || !this.form.passkey || !this.form.age || !this.form.gender) {
            this.error = 'Please fill in all required fields.';
            return;
        }
        if (!/^[0-9]{10}$/.test(this.form.phone)) {
            this.error = 'Please enter a valid 10-digit phone number.';
            return;
        }
        if (this.form.passkey.length < 4) {
            this.error = 'Passkey must be at least 4 characters.';
            return;
        }
        if (this.form.passkey !== this.confirmPasskey) {
            this.error = 'Passkeys do not match.';
            return;
        }
        if (this.form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email)) {
            this.error = 'Please enter a valid email address or leave it blank.';
            return;
        }

        this.error = '';
        this.loading = true;

        const payload: any = {
            name: this.form.name,
            phone: this.form.phone,
            passkey: this.form.passkey,
            age: parseInt(this.form.age),
            gender: this.form.gender,
        };
        if (this.form.email) payload.email = this.form.email;
        if (this.form.address) payload.address = this.form.address;
        if (this.form.city) payload.city = this.form.city;

        this.api.registerPatientAccount(payload).subscribe({
            next: () => {
                this.loading = false;
                this.success = true;
            },
            error: (err) => {
                this.loading = false;
                this.error = err.error?.error || err.error?.errors?.[0]?.msg || 'Registration failed. Please try again.';
            }
        });
    }
}
