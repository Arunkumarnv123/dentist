import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-forgot',
  template: `
    <div class="auth-page">
      <div class="auth-card fade-in">
        <div class="auth-header">
          <span class="auth-logo">🔒</span>
          <h1>Find Your Account</h1>
          <p>Please enter your email or phone number to search for your account.</p>
        </div>

        <!-- Step 1: Search Account -->
        <div *ngIf="step === 1">
          <div class="form-group">
            <input type="text" class="form-control" [(ngModel)]="identifier" 
                   placeholder="Email address or phone number" (keyup.enter)="search()">
          </div>
          <div *ngIf="error" class="error-msg">{{ error }}</div>
          <button class="btn btn-primary btn-lg" style="width: 100%;" [disabled]="loading" (click)="search()">
            {{ loading ? 'Searching...' : 'Search' }}
          </button>
          <p class="auth-footer"><a routerLink="/login">Cancel</a></p>
        </div>

        <!-- Step 2: Choose Method / Send OTP -->
        <div *ngIf="step === 2">
          <div class="user-preview">
            <div class="user-avatar">{{ user.name.charAt(0) }}</div>
            <div class="user-info">
              <strong>{{ user.name }}</strong>
              <span>{{ user.email }}</span>
            </div>
          </div>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
            We will send a 6-digit code to your email address to reset your password.
          </p>
          <div *ngIf="error" class="error-msg">{{ error }}</div>
          <button class="btn btn-primary btn-lg" style="width: 100%;" [disabled]="loading" (click)="sendCode()">
            {{ loading ? 'Sending...' : 'Continue' }}
          </button>
          <p class="auth-footer"><a (click)="step = 1">Not you?</a></p>
        </div>

        <!-- Step 3: Verify OTP -->
        <div *ngIf="step === 3">
          <p style="text-align: center; margin-bottom: 1.5rem;">
            Enter the 6-digit code sent to your email.
          </p>
          <div class="form-group">
            <input type="text" class="form-control otp-input" [(ngModel)]="otp" 
                   placeholder="000 000" maxlength="6" (keyup.enter)="verify()">
          </div>
          <div *ngIf="error" class="error-msg">{{ error }}</div>
          <button class="btn btn-primary btn-lg" style="width: 100%;" [disabled]="loading" (click)="verify()">
            {{ loading ? 'Verifying...' : 'Continue' }}
          </button>
          <p class="auth-footer">
            Didn't get a code? <a (click)="sendCode()" [class.disabled]="loading">Resend</a>
          </p>
        </div>

        <!-- Step 4: Reset Password -->
        <div *ngIf="step === 4">
          <p style="text-align: center; margin-bottom: 1.5rem;">Choose a new password.</p>
          <div class="form-group">
            <label class="form-label">New Password</label>
            <input type="password" class="form-control" [(ngModel)]="newPassword" 
                   placeholder="Min 6 characters">
          </div>
          <div class="form-group">
            <label class="form-label">Confirm Password</label>
            <input type="password" class="form-control" [(ngModel)]="confirmPassword" 
                   placeholder="Same as above">
          </div>
          <div *ngIf="error" class="error-msg">{{ error }}</div>
          <button class="btn btn-primary btn-lg" style="width: 100%;" [disabled]="loading" (click)="reset()">
            {{ loading ? 'Resetting...' : 'Reset Password' }}
          </button>
        </div>

        <!-- Success -->
        <div *ngIf="step === 5" style="text-align: center;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
          <h3>Password Reset!</h3>
          <p>Your password has been updated. You can now log in.</p>
          <button class="btn btn-primary btn-lg" style="width: 100%; margin-top: 1.5rem;" routerLink="/login">
            Go to Login
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 2rem; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
    }
    .auth-card {
      background: var(--bg-secondary); border: 1px solid var(--border);
      border-radius: 20px; padding: 2.5rem; max-width: 480px; width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    }
    .auth-header { text-align: center; margin-bottom: 2rem; }
    .auth-logo { font-size: 3rem; display: block; margin-bottom: 0.5rem; }
    .user-preview {
      display: flex; align-items: center; gap: 1rem; padding: 1rem;
      background: rgba(255, 255, 255, 0.05); border-radius: 12px; margin-bottom: 1.5rem;
    }
    .user-avatar {
      width: 48px; height: 48px; border-radius: 50%; background: var(--primary);
      display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold;
    }
    .user-info { display: flex; flex-direction: column; }
    .user-info span { font-size: 0.85rem; color: var(--text-secondary); }
    .otp-input { text-align: center; font-size: 2rem; letter-spacing: 0.5rem; font-weight: bold; }
    .error-msg {
      background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px; padding: 0.75rem; color: #f87171; font-size: 0.85rem;
      margin-bottom: 1rem; text-align: center;
    }
    .auth-footer { text-align: center; margin-top: 1.5rem; font-size: 0.9rem; }
    .auth-footer a { color: var(--primary-light); cursor: pointer; text-decoration: none; font-weight: 500; }
    .disabled { opacity: 0.5; pointer-events: none; }
  `]
})
export class ForgotComponent {
  step = 1;
  identifier = '';
  user: any = null;
  otp = '';
  newPassword = '';
  confirmPassword = '';
  loading = false;
  error = '';

  constructor(private api: ApiService, private router: Router) {}

  search() {
    if (!this.identifier) return;
    this.loading = true;
    this.error = '';
    this.api.searchAccount(this.identifier).subscribe({
      next: (res) => {
        this.user = res.user;
        this.step = 2;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = 'No account found with that email or phone.';
      }
    });
  }

  sendCode() {
    this.loading = true;
    this.error = '';
    this.api.requestResetOtp(this.user.id).subscribe({
      next: () => {
        this.step = 3;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Failed to send code. Please try again.';
      }
    });
  }

  verify() {
    if (this.otp.length < 6) return;
    this.loading = true;
    this.error = '';
    this.api.verifyResetOtp(this.user.id, this.otp).subscribe({
      next: () => {
        this.step = 4;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Invalid or expired code.';
      }
    });
  }

  reset() {
    if (this.newPassword.length < 6) {
      this.error = 'Password must be at least 6 characters.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.api.resetPassword({
      userId: this.user.id,
      otp: this.otp,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.step = 5;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Reset failed. Please start over.';
      }
    });
  }
}
