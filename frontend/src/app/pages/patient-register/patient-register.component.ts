import { Component, OnInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

declare var google: any;

@Component({
    selector: 'app-patient-register',
    template: `
    <div class="auth-page">
      <div class="auth-card fade-in">
        <div class="auth-header">
          <span class="auth-logo">🦷</span>
          <h1>Patient Registration</h1>
          <p>Create your account for personalized dental tracking</p>
        </div>

        <div *ngIf="success" class="success-box">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎉</div>
          <h3>Account Created!</h3>
          <p>You can now log in and book appointments.</p>
          <button class="btn btn-primary btn-lg" (click)="router.navigate(['/login'])" style="margin-top: 1rem;">
            Go to Login
          </button>
        </div>

        <div *ngIf="!success">
          <!-- Social Login Section -->
          <div class="social-auth-section">
            <p class="social-title">Continue with Social</p>
            
            <!-- Google Login Container -->
            <div id="google-login-btn" class="google-btn-container"></div>

            <div class="social-btn-row">
              <button class="social-btn facebook" (click)="loginWithSocial('facebook')">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Facebook</span>
              </button>
              <button class="social-btn twitter" (click)="loginWithSocial('twitter')">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span>X</span>
              </button>
            </div>
          </div>

          <div class="social-divider">
            <span>or register with email</span>
          </div>

          <!-- Email Registration Form -->
          <form (ngSubmit)="register()">
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

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Phone</label>
                <input type="tel" class="form-control" [(ngModel)]="form.phone" name="phone"
                       placeholder="10-digit number" maxlength="10">
              </div>
              <div class="form-group">
                <label class="form-label">City</label>
                <input type="text" class="form-control" [(ngModel)]="form.city" name="city"
                       placeholder="Location">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Address</label>
              <input type="text" class="form-control" [(ngModel)]="form.address" name="address"
                     placeholder="House No, Street, Locality">
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Password *</label>
                <input type="password" class="form-control" [(ngModel)]="form.password" name="password"
                       placeholder="Min 6 chars" required>
              </div>
              <div class="form-group">
                <label class="form-label">Confirm *</label>
                <input type="password" class="form-control" [(ngModel)]="confirmPassword" name="confirm"
                       placeholder="Re-enter" required>
              </div>
            </div>

            <div *ngIf="error" class="error-msg">{{ error }}</div>
            <div *ngIf="socialLoading" class="loading-overlay">
              <div class="spinner"></div>
              <span>Authenticating...</span>
            </div>

            <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;" [disabled]="loading || socialLoading">
              {{ loading ? 'Creating Account...' : 'Create Account' }}
            </button>

            <p class="auth-footer">
              Already have an account? <a routerLink="/login">Sign In</a>
            </p>
          </form>
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
      background: rgba(30, 41, 59, 0.8);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(148, 163, 184, 0.15);
      border-radius: 20px;
      padding: 2.5rem;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
      position: relative;
    }
    .auth-header { text-align: center; margin-bottom: 1.5rem; }
    .auth-logo { font-size: 3rem; display: block; margin-bottom: 0.5rem; }
    .auth-header h1 {
      font-size: 1.5rem;
      background: linear-gradient(135deg, #14b8a6, #f97316);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent; background-clip: text;
    }
    .auth-header p { color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem; }
    
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

    .error-msg {
      background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px; padding: 0.75rem; color: #f87171; font-size: 0.85rem;
      margin-bottom: 1rem; text-align: center;
    }

    .success-box { text-align: center; padding: 1rem 0; }
    .success-box h3 { color: var(--success); margin-bottom: 0.5rem; }
    .success-box p { color: var(--text-secondary); }

    /* Social Auth Section */
    .social-auth-section { text-align: center; margin-bottom: 1rem; }
    .social-title { color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
    .google-btn-container { display: flex; justify-content: center; margin-bottom: 1rem; min-height: 40px; }
    
    .social-btn-row { display: flex; gap: 0.75rem; }
    .social-btn {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      padding: 0.65rem; border-radius: 10px; border: 1px solid var(--border);
      background: var(--bg-tertiary); color: var(--text-primary);
      font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
    }
    .social-btn:hover { border-color: #94a3b8; background: rgba(148, 163, 184, 0.05); }

    .social-divider {
      display: flex; align-items: center; gap: 1rem; margin: 1.5rem 0;
    }
    .social-divider::before, .social-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
    .social-divider span { color: var(--text-muted); font-size: 0.75rem; white-space: nowrap; text-transform: uppercase; }

    .loading-overlay {
      display: flex; align-items: center; justify-content: center; gap: 0.75rem;
      margin-bottom: 1rem; color: #14b8a6; font-weight: 500; font-size: 0.9rem;
    }
    .spinner {
      width: 18px; height: 18px; border: 2px solid rgba(20, 184, 166, 0.1);
      border-top-color: #14b8a6; border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .auth-footer { text-align: center; margin-top: 1.25rem; color: var(--text-secondary); font-size: 0.85rem; }
    .auth-footer a { color: #14b8a6; text-decoration: none; font-weight: 600; }

    @media (max-width: 500px) {
      .form-grid { grid-template-columns: 1fr; }
      .auth-card { padding: 1.5rem; }
    }
  `]
})
export class PatientRegisterComponent implements OnInit {
    form: any = { name: '', email: '', password: '', phone: '', address: '', city: '' };
    confirmPassword = '';
    loading = false;
    socialLoading = false;
    error = '';
    success = false;
    
    // Using centralized config from environments/environment.ts
    private googleClientId = environment.googleClientId;

    constructor(
        private api: ApiService,
        private auth: AuthService,
        public router: Router,
        private ngZone: NgZone
    ) { }

    ngOnInit(): void {
        this.loadGoogleSDK();
    }

    private loadGoogleSDK(): void {
        if (typeof google !== 'undefined' && google.accounts) {
            this.initGoogleBtn();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            this.ngZone.run(() => this.initGoogleBtn());
        };
        document.head.appendChild(script);
    }

    private initGoogleBtn(): void {
        if (typeof google === 'undefined' || !google.accounts) return;

        google.accounts.id.initialize({
            client_id: this.googleClientId,
            callback: (response: any) => {
                this.ngZone.run(() => this.handleGoogleCallback(response));
            },
            auto_select: false,
        });

        const btnContainer = document.getElementById('google-login-btn');
        if (btnContainer) {
            google.accounts.id.renderButton(btnContainer, {
                theme: 'filled_blue',
                size: 'large',
                text: 'continue_with',
                shape: 'pill',
                width: 300
            });
        }
    }

    private handleGoogleCallback(response: any): void {
        if (!response.credential) {
            this.error = 'Google authentication failed.';
            return;
        }

        this.socialLoading = true;
        this.error = '';

        this.api.socialLogin('google', response.credential).subscribe({
            next: (res) => {
                this.socialLoading = false;
                localStorage.setItem('dental_token', res.token);
                localStorage.setItem('dental_user', JSON.stringify(res.user));
                const expiryMs = this.parseExpiresIn(res.expiresIn || '8h');
                localStorage.setItem('dental_token_expiry', (Date.now() + expiryMs).toString());
                
                // Redirect to portal
                this.router.navigate(['/patient-portal']).then(() => {
                    window.location.reload(); // Ensure header/state updates
                });
            },
            error: (err) => {
                this.socialLoading = false;
                this.error = err.error?.error || 'Google login failed. Please ensure your Google account is verified.';
            }
        });
    }

    loginWithSocial(provider: string): void {
        const names: any = { facebook: 'Facebook', twitter: 'X (Twitter)' };
        this.error = `${names[provider]} login is currently under maintenance. Please use Google or Email registration.`;
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
            this.error = 'Please enter a 10-digit phone number.';
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
                this.error = err.error?.error || 'Registration failed. Email might already be in use.';
            }
        });
    }

    private parseExpiresIn(expiresIn: string): number {
        const match = expiresIn.match(/^(\d+)(s|m|h|d)$/);
        if (!match) return 8 * 60 * 60 * 1000;
        const value = parseInt(match[1], 10);
        const unit = match[2];
        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return 8 * 60 * 60 * 1000;
        }
    }
}
