import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
    selector: 'app-forgot-password',
    template: `
    <div class="auth-page">
      <div class="auth-card fade-in">
        <div class="auth-header">
          <span class="auth-logo">🦷</span>
          <h1>Reset Password</h1>
          <p>{{ stepDescription }}</p>
        </div>

        <!-- Step 1: Enter Email -->
        <div *ngIf="step === 1">
          <form (ngSubmit)="sendOTP()">
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" class="form-control" [(ngModel)]="email" name="email"
                     placeholder="Enter your registered email" required autocomplete="email">
            </div>

            <div *ngIf="error" class="error-msg">{{ error }}</div>
            <div *ngIf="message" class="success-msg">{{ message }}</div>

            <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;" [disabled]="loading">
              {{ loading ? 'Sending Code...' : '📧 Send Verification Code' }}
            </button>
          </form>
        </div>

        <!-- Step 2: Enter OTP -->
        <div *ngIf="step === 2">
          <div class="email-sent-badge">
            <span>📧</span> Code sent to <strong>{{ maskedEmail }}</strong>
          </div>

          <form (ngSubmit)="verifyOTP()">
            <div class="form-group">
              <label class="form-label">6-Digit Verification Code</label>
              <div class="otp-container">
                <input type="text" class="otp-input" [(ngModel)]="otp" name="otp"
                       maxlength="6" placeholder="000000" autocomplete="one-time-code"
                       (input)="onOtpInput($event)">
              </div>
              <p class="otp-hint">Check your email inbox (and spam folder)</p>
            </div>

            <div *ngIf="error" class="error-msg">{{ error }}</div>

            <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;" [disabled]="loading || otp.length !== 6">
              {{ loading ? 'Verifying...' : '✅ Verify Code' }}
            </button>

            <div style="text-align: center; margin-top: 1rem;">
              <button type="button" class="btn-link" (click)="resendOTP()" [disabled]="resendCooldown > 0">
                {{ resendCooldown > 0 ? 'Resend in ' + resendCooldown + 's' : '🔄 Resend Code' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Step 3: New Password -->
        <div *ngIf="step === 3">
          <div class="verified-badge">
            <span>✅</span> Email verified successfully
          </div>

          <form (ngSubmit)="resetPassword()">
            <div class="form-group">
              <label class="form-label">New Password</label>
              <input type="password" class="form-control" [(ngModel)]="newPassword" name="newPassword"
                     placeholder="Enter new password (min 6 chars)" required>
            </div>

            <div class="form-group">
              <label class="form-label">Confirm Password</label>
              <input type="password" class="form-control" [(ngModel)]="confirmPassword" name="confirmPassword"
                     placeholder="Re-enter new password" required>
            </div>

            <div *ngIf="error" class="error-msg">{{ error }}</div>

            <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;" [disabled]="loading">
              {{ loading ? 'Resetting...' : '🔐 Reset Password' }}
            </button>
          </form>
        </div>

        <!-- Step 4: Success -->
        <div *ngIf="step === 4" class="success-state">
          <div class="success-icon">🎉</div>
          <h2>Password Reset!</h2>
          <p class="success-text">Your password has been reset successfully. You can now log in with your new password.</p>
          <button class="btn btn-primary btn-lg" style="width: 100%; margin-top: 1.5rem;" (click)="router.navigate(['/login'])">
            🔑 Go to Login
          </button>
        </div>

        <!-- Progress Steps -->
        <div class="steps-indicator" *ngIf="step < 4">
          <div class="step-dot" [class.active]="step >= 1" [class.done]="step > 1"></div>
          <div class="step-line" [class.active]="step > 1"></div>
          <div class="step-dot" [class.active]="step >= 2" [class.done]="step > 2"></div>
          <div class="step-line" [class.active]="step > 2"></div>
          <div class="step-dot" [class.active]="step >= 3" [class.done]="step > 3"></div>
        </div>

        <!-- Back to Login -->
        <div class="back-link" *ngIf="step < 4">
          <a routerLink="/login">← Back to Login</a>
        </div>
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
      max-width: 440px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    }
    .auth-header { text-align: center; margin-bottom: 2rem; }
    .auth-logo { font-size: 3rem; display: block; margin-bottom: 0.5rem; }
    .auth-header h1 {
      font-size: 1.5rem;
      background: linear-gradient(135deg, #14b8a6, #f97316);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .auth-header p { color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem; }

    .error-msg {
      background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px; padding: 0.75rem; color: #f87171; font-size: 0.85rem;
      margin-bottom: 1rem; text-align: center;
    }
    .success-msg {
      background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2);
      border-radius: 8px; padding: 0.75rem; color: #4ade80; font-size: 0.85rem;
      margin-bottom: 1rem; text-align: center;
    }

    .email-sent-badge, .verified-badge {
      display: flex; align-items: center; gap: 0.5rem;
      background: rgba(13, 148, 136, 0.1); border: 1px solid rgba(13, 148, 136, 0.25);
      border-radius: 10px; padding: 0.75rem 1rem; margin-bottom: 1.5rem;
      color: #14b8a6; font-size: 0.85rem;
    }
    .verified-badge {
      background: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.25);
      color: #4ade80;
    }

    .otp-container { display: flex; justify-content: center; }
    .otp-input {
      width: 100%;
      text-align: center;
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: 12px;
      font-family: 'Courier New', monospace;
      background: var(--bg-tertiary);
      border: 2px solid var(--border);
      border-radius: 12px;
      padding: 1rem;
      color: #14b8a6;
      transition: border-color 0.3s ease;
    }
    .otp-input:focus {
      outline: none;
      border-color: #14b8a6;
      box-shadow: 0 0 20px rgba(20, 184, 166, 0.15);
    }
    .otp-hint {
      text-align: center; color: var(--text-muted); font-size: 0.8rem;
      margin-top: 0.5rem;
    }

    .btn-link {
      background: none; border: none; color: #14b8a6; cursor: pointer;
      font-size: 0.85rem; font-weight: 600; padding: 0;
    }
    .btn-link:disabled { color: var(--text-muted); cursor: not-allowed; }
    .btn-link:hover:not(:disabled) { text-decoration: underline; }

    .success-state { text-align: center; padding: 1rem 0; }
    .success-icon { font-size: 4rem; margin-bottom: 0.75rem; }
    .success-state h2 { color: var(--success); margin-bottom: 0.5rem; }
    .success-text { color: var(--text-secondary); font-size: 0.9rem; }

    .steps-indicator {
      display: flex; align-items: center; justify-content: center;
      gap: 0; margin-top: 2rem;
    }
    .step-dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: var(--bg-tertiary); border: 2px solid var(--border);
      transition: all 0.3s ease;
    }
    .step-dot.active { border-color: #14b8a6; background: #14b8a6; }
    .step-dot.done { background: #22c55e; border-color: #22c55e; }
    .step-line {
      width: 50px; height: 2px; background: var(--border);
      transition: background 0.3s ease;
    }
    .step-line.active { background: #14b8a6; }

    .back-link {
      text-align: center; margin-top: 1.25rem;
    }
    .back-link a {
      color: var(--text-secondary); text-decoration: none; font-size: 0.85rem;
    }
    .back-link a:hover { color: #14b8a6; }

    @media (max-width: 500px) {
      .auth-card { padding: 1.5rem; }
      .otp-input { font-size: 1.5rem; letter-spacing: 8px; }
    }
  `]
})
export class ForgotPasswordComponent {
    step = 1;
    email = '';
    otp = '';
    newPassword = '';
    confirmPassword = '';
    loading = false;
    error = '';
    message = '';
    resendCooldown = 0;
    private cooldownInterval: any;

    constructor(private api: ApiService, public router: Router) {}

    get stepDescription(): string {
        switch (this.step) {
            case 1: return 'Enter your email to receive a verification code';
            case 2: return 'Enter the 6-digit code sent to your email';
            case 3: return 'Choose a new password';
            default: return '';
        }
    }

    get maskedEmail(): string {
        if (!this.email) return '';
        const [user, domain] = this.email.split('@');
        if (user.length <= 2) return this.email;
        return user[0] + '*'.repeat(user.length - 2) + user[user.length - 1] + '@' + domain;
    }

    onOtpInput(event: any): void {
        // Only allow digits
        this.otp = event.target.value.replace(/[^0-9]/g, '').slice(0, 6);
        event.target.value = this.otp;
    }

    sendOTP(): void {
        if (!this.email) {
            this.error = 'Please enter your email address.';
            return;
        }
        this.error = '';
        this.message = '';
        this.loading = true;

        this.api.forgotPassword(this.email).subscribe({
            next: () => {
                this.loading = false;
                this.step = 2;
                this.startResendCooldown();
            },
            error: (err) => {
                this.loading = false;
                this.error = err.error?.error || 'Failed to send verification code. Please try again.';
            }
        });
    }

    verifyOTP(): void {
        if (this.otp.length !== 6) {
            this.error = 'Please enter the complete 6-digit code.';
            return;
        }
        this.error = '';
        this.loading = true;

        this.api.verifyOtp(this.email, this.otp).subscribe({
            next: () => {
                this.loading = false;
                this.step = 3;
            },
            error: (err) => {
                this.loading = false;
                this.error = err.error?.error || 'Invalid or expired code. Please try again.';
            }
        });
    }

    resetPassword(): void {
        if (this.newPassword.length < 6) {
            this.error = 'Password must be at least 6 characters.';
            return;
        }
        if (this.newPassword !== this.confirmPassword) {
            this.error = 'Passwords do not match.';
            return;
        }
        this.error = '';
        this.loading = true;

        this.api.resetPassword(this.email, this.otp, this.newPassword).subscribe({
            next: () => {
                this.loading = false;
                this.step = 4;
            },
            error: (err) => {
                this.loading = false;
                this.error = err.error?.error || 'Failed to reset password. Please try again.';
            }
        });
    }

    resendOTP(): void {
        this.otp = '';
        this.error = '';
        this.loading = true;

        this.api.forgotPassword(this.email).subscribe({
            next: () => {
                this.loading = false;
                this.message = 'A new code has been sent!';
                this.startResendCooldown();
                setTimeout(() => { this.message = ''; }, 3000);
            },
            error: (err) => {
                this.loading = false;
                this.error = err.error?.error || 'Failed to resend code.';
            }
        });
    }

    private startResendCooldown(): void {
        this.resendCooldown = 60;
        if (this.cooldownInterval) clearInterval(this.cooldownInterval);
        this.cooldownInterval = setInterval(() => {
            this.resendCooldown--;
            if (this.resendCooldown <= 0) {
                clearInterval(this.cooldownInterval);
            }
        }, 1000);
    }
}
