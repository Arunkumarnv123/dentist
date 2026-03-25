import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-register',
  template: `
    <div class="register-page">
      <div class="register-container fade-in">
        <div class="register-header">
          <div class="register-icon">🦷</div>
          <h1>Dental Screening Registration</h1>
          <p *ngIf="campName">{{ campName }}</p>
        </div>

        <!-- Success State -->
        <div *ngIf="registered" class="success-card">
          <div class="success-icon">✅</div>
          <h2>Registration Successful!</h2>
          <div class="patient-id-display">
            <span class="pid-label">Your Patient ID</span>
            <span class="pid-value">{{ patientId }}</span>
          </div>
          <p class="success-msg">Please remember your Patient ID. You will be called for screening shortly.</p>
          <div *ngIf="duplicateWarning" class="warning-msg">
            ⚠️ {{ duplicateWarning.message }}
          </div>
          <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
            <button class="btn btn-primary btn-lg btn-block" (click)="goToLiveStatus()">📡 View Live Status</button>
            <button class="btn btn-outline btn-lg btn-block" (click)="resetForm()">Register Another</button>
          </div>
        </div>

        <!-- Registration Form -->
        <form *ngIf="!registered" [formGroup]="form" (ngSubmit)="register()">
          <div class="form-group">
            <label class="form-label">Full Name *</label>
            <input type="text" class="form-control" formControlName="full_name"
                   placeholder="Enter full name" [class.error]="isInvalid('full_name')">
            <div class="form-error" *ngIf="isInvalid('full_name')">Full name is required</div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Age *</label>
              <input type="number" class="form-control" formControlName="age"
                     placeholder="Age" min="0" max="120" [class.error]="isInvalid('age')">
              <div class="form-error" *ngIf="isInvalid('age')">Age must be 0-120</div>
            </div>
            <div class="form-group">
              <label class="form-label">Gender *</label>
              <select class="form-control" formControlName="gender" [class.error]="isInvalid('gender')">
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input type="tel" class="form-control" formControlName="phone"
                   placeholder="+91 9876543210">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Address</label>
              <input type="text" class="form-control" formControlName="address"
                     placeholder="House No, Street, Locality">
            </div>
            <div class="form-group">
              <label class="form-label">City</label>
              <input type="text" class="form-control" formControlName="city"
                     placeholder="Mumbai, Delhi...">
            </div>
          </div>



          <div class="form-group">
            <label class="form-label">Priority</label>
            <div class="toggle-group">
              <button type="button" class="toggle-btn" [class.active]="form.get('priority')?.value === 'normal'"
                      (click)="form.patchValue({priority: 'normal'})">Normal</button>
              <button type="button" class="toggle-btn" [class.active]="form.get('priority')?.value === 'urgent'"
                      (click)="form.patchValue({priority: 'urgent'})" style="border-color: var(--coral);">🚨 Urgent</button>
              <button type="button" class="toggle-btn" [class.active]="form.get('priority')?.value === 'mobility_issues'"
                      (click)="form.patchValue({priority: 'mobility_issues'})">♿ Mobility Issues</button>
            </div>
          </div>

          <div *ngIf="error" class="error-msg">{{ error }}</div>

          <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="loading || form.invalid">
            {{ loading ? 'Registering...' : '✅ Register Patient' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .register-page {
      min-height: 100vh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 1.5rem 1rem;
    }
    .register-container {
      width: 100%;
      max-width: 520px;
      background: rgba(30, 41, 59, 0.85);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 2rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .register-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .register-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .register-header h1 { font-size: 1.4rem; color: var(--text-primary); }
    .register-header p { color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem; }

    .success-card { text-align: center; }
    .success-icon { font-size: 3rem; margin-bottom: 0.5rem; }
    .success-card h2 { color: var(--success); margin-bottom: 1rem; }
    .patient-id-display {
      background: var(--bg-tertiary);
      border: 2px solid var(--primary);
      border-radius: 12px;
      padding: 1.25rem;
      margin: 1rem 0;
    }
    .pid-label { display: block; font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .pid-value { display: block; font-size: 2rem; font-weight: 800; color: var(--primary-light); margin-top: 0.25rem; }
    .success-msg { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem; }
    .warning-msg {
      background: rgba(234, 179, 8, 0.15);
      border: 1px solid rgba(234, 179, 8, 0.3);
      border-radius: 8px;
      padding: 0.75rem;
      color: var(--warning);
      font-size: 0.85rem;
      margin-bottom: 1rem;
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
  `]
})
export class RegisterComponent implements OnInit {
  form!: FormGroup;
  campId = '';
  campName = '';
  loading = false;
  error = '';
  registered = false;
  patientId = '';
  duplicateWarning: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private api: ApiService
  ) { }

  ngOnInit(): void {
    this.campId = this.route.snapshot.params['campId'];
    this.initForm();
    this.api.getCamp(this.campId).subscribe({
      next: (res) => { this.campName = res.camp.name; },
      error: () => { }
    });
  }

  initForm(): void {
    this.form = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2)]],
      age: ['', [Validators.required, Validators.min(0), Validators.max(120)]],
      gender: ['', Validators.required],
      phone: [''],
      address: [''],
      city: [''],
      priority: ['normal'],
      idempotency_key: [this.generateKey()],
    });
  }

  generateKey(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  register(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error = '';
    this.loading = true;

    this.api.registerPatient(this.campId, this.form.value).subscribe({
      next: (res) => {
        this.loading = false;
        this.registered = true;
        this.patientId = res.patient.patient_id;
        this.duplicateWarning = res.duplicate_warning || null;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Registration failed. Please try again.';
      }
    });
  }

  resetForm(): void {
    this.registered = false;
    this.patientId = '';
    this.duplicateWarning = null;
    this.initForm();
  }

  goToLiveStatus(): void {
    this.router.navigate(['/status', this.campId, this.patientId]);
  }
}
