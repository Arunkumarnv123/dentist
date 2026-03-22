import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-screening',
    template: `
    <div class="main-content fade-in">
      <div class="container" style="max-width: 800px;">
        <!-- Loading -->
        <div *ngIf="loading" class="loading-overlay">
          <div class="spinner"></div>
          <span>Loading patient...</span>
        </div>

        <!-- Success State -->
        <div *ngIf="submitted" class="card success-state fade-in">
          <div class="success-icon">🎉</div>
          <h2>Screening Submitted!</h2>
          <p class="success-msg">The screening for <strong>{{ patient?.full_name }}</strong> has been saved and the PDF report is being generated.</p>
          <div style="display: flex; gap: 0.75rem; justify-content: center; margin-top: 1.5rem; flex-wrap: wrap;">
            <button class="btn btn-primary btn-lg" (click)="router.navigate(['/queue', campId])">
              📋 Back to Queue
            </button>
            <button class="btn btn-outline" (click)="router.navigate(['/dashboard'])">
              📊 Dashboard
            </button>
          </div>
        </div>

        <!-- Screening Form -->
        <div *ngIf="!loading && !submitted && patient">
          <div class="page-header">
            <div>
              <h1 class="page-title">Dental Screening</h1>
              <p class="page-subtitle">{{ patient.full_name }} — {{ patient.patient_id }}</p>
            </div>
            <button class="btn btn-outline btn-sm" (click)="router.navigate(['/queue', campId])">
              ← Back to Queue
            </button>
          </div>

          <!-- Patient Info Card -->
          <div class="card patient-card">
            <div class="patient-grid">
              <div class="patient-field">
                <span class="field-label">Patient ID</span>
                <span class="field-value pid">{{ patient.patient_id }}</span>
              </div>
              <div class="patient-field">
                <span class="field-label">Full Name</span>
                <span class="field-value">{{ patient.full_name }}</span>
              </div>
              <div class="patient-field">
                <span class="field-label">Age</span>
                <span class="field-value">{{ patient.age }}</span>
              </div>
              <div class="patient-field">
                <span class="field-label">Gender</span>
                <span class="field-value">{{ patient.gender | titlecase }}</span>
              </div>
              <div class="patient-field" *ngIf="patient.address">
                <span class="field-label">Address</span>
                <span class="field-value">{{ patient.address }}</span>
              </div>
              <div class="patient-field" *ngIf="patient.city">
                <span class="field-label">City</span>
                <span class="field-value">{{ patient.city }}</span>
              </div>
              <div class="patient-field" *ngIf="patient.phone">
                <span class="field-label">Phone</span>
                <span class="field-value">{{ patient.phone }}</span>
              </div>
            </div>
          </div>

          <!-- Screening Form -->
          <div class="card screening-form">
            <h3 style="margin-bottom: 1.25rem;">🪥 Oral Examination</h3>

            <!-- Oral Hygiene -->
            <div class="form-group">
              <label class="form-label">Oral Hygiene *</label>
              <div class="toggle-group">
                <button type="button" class="toggle-btn"
                        [class.active]="screening.oral_hygiene === 'good'"
                        (click)="screening.oral_hygiene = 'good'">😁 Good</button>
                <button type="button" class="toggle-btn"
                        [class.active]="screening.oral_hygiene === 'fair'"
                        (click)="screening.oral_hygiene = 'fair'">😐 Fair</button>
                <button type="button" class="toggle-btn"
                        [class.active]="screening.oral_hygiene === 'poor'"
                        (click)="screening.oral_hygiene = 'poor'">😟 Poor</button>
              </div>
            </div>

            <!-- Clinical Findings -->
            <h3 style="margin: 1.5rem 0 1rem;">🔍 Clinical Findings</h3>

            <div class="findings-grid">
              <div class="form-group">
                <label class="form-label">Dental Caries?</label>
                <div class="toggle-group">
                  <button type="button" class="toggle-btn" [class.active-yes]="screening.caries === true"
                          (click)="screening.caries = true">Yes</button>
                  <button type="button" class="toggle-btn" [class.active-no]="screening.caries === false"
                          (click)="screening.caries = false">No</button>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Gingivitis?</label>
                <div class="toggle-group">
                  <button type="button" class="toggle-btn" [class.active-yes]="screening.gingivitis === true"
                          (click)="screening.gingivitis = true">Yes</button>
                  <button type="button" class="toggle-btn" [class.active-no]="screening.gingivitis === false"
                          (click)="screening.gingivitis = false">No</button>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Malocclusion?</label>
                <div class="toggle-group">
                  <button type="button" class="toggle-btn" [class.active-yes]="screening.malocclusion === true"
                          (click)="screening.malocclusion = true">Yes</button>
                  <button type="button" class="toggle-btn" [class.active-no]="screening.malocclusion === false"
                          (click)="screening.malocclusion = false">No</button>
                </div>
              </div>
            </div>

            <!-- Other Findings -->
            <div class="form-group">
              <label class="form-label">Other Findings</label>
              <textarea class="form-control" [(ngModel)]="screening.other_findings"
                        placeholder="Any additional observations..." rows="3"></textarea>
            </div>

            <!-- Treatment Recommendations -->
            <h3 style="margin: 1.5rem 0 1rem;">💊 Treatment Recommendations</h3>

            <div class="checkbox-group">
              <label class="checkbox-btn" *ngFor="let t of treatmentOptions"
                     [class.checked]="screening.treatments.includes(t)">
                <input type="checkbox" [checked]="screening.treatments.includes(t)"
                       (change)="toggleTreatment(t)">
                {{ t }}
              </label>
            </div>

            <!-- Actions -->
            <div *ngIf="error" class="error-msg" style="margin-top: 1.25rem;">{{ error }}</div>
            <div *ngIf="draftSaved" class="draft-msg">✅ Draft saved</div>

            <div class="form-actions">
              <button class="btn btn-outline" (click)="saveDraft()" [disabled]="saving">
                {{ saving ? 'Saving...' : '💾 Save Draft' }}
              </button>
              <button class="btn btn-primary btn-lg" (click)="submitScreening()" [disabled]="submitting">
                {{ submitting ? 'Submitting...' : '✅ Submit Screening' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Patient Not Found -->
        <div *ngIf="!loading && !patient && !submitted" class="card" style="text-align: center; padding: 3rem;">
          <h2>Patient Not Found</h2>
          <p style="color: var(--text-secondary); margin: 1rem 0;">Could not find the patient in this camp.</p>
          <button class="btn btn-primary" (click)="router.navigate(['/queue', campId])">Back to Queue</button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .success-state {
      text-align: center;
      padding: 3rem 2rem;
      margin-top: 2rem;
    }
    .success-icon { font-size: 4rem; margin-bottom: 1rem; }
    .success-state h2 { color: var(--success); margin-bottom: 0.5rem; }
    .success-msg { color: var(--text-secondary); font-size: 1rem; }

    .patient-card { margin-bottom: 1.25rem; }
    .patient-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1rem;
    }
    .patient-field { display: flex; flex-direction: column; gap: 0.2rem; }
    .field-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .field-value { font-size: 1rem; font-weight: 600; }
    .field-value.pid { color: var(--primary-light); font-family: 'Courier New', monospace; font-size: 1.1rem; }

    .screening-form { margin-bottom: 2rem; }
    .findings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .error-msg {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      padding: 0.75rem;
      color: #f87171;
      font-size: 0.85rem;
      text-align: center;
    }

    .draft-msg {
      margin-top: 1rem;
      padding: 0.6rem 1rem;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.2);
      border-radius: 8px;
      color: var(--success);
      font-size: 0.85rem;
      text-align: center;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
      justify-content: flex-end;
      flex-wrap: wrap;
    }

    @media (max-width: 768px) {
      .patient-grid { grid-template-columns: 1fr 1fr; }
      .findings-grid { grid-template-columns: 1fr; }
      .form-actions { flex-direction: column; }
      .form-actions .btn { width: 100%; }
    }
  `]
})
export class ScreeningComponent implements OnInit {
    campId = '';
    patientId = '';
    patient: any = null;
    loading = true;
    saving = false;
    submitting = false;
    submitted = false;
    error = '';
    draftSaved = false;
    screeningId = '';

    screening: any = {
        oral_hygiene: null,
        caries: null,
        gingivitis: null,
        malocclusion: null,
        other_findings: '',
        treatments: [] as string[],
    };

    treatmentOptions = [
        'Filling', 'Extraction', 'Scaling', 'Root Canal',
        'Fluoride Treatment', 'Orthodontic Referral', 'Crown',
        'Bridge', 'Denture', 'Sealant', 'Medication', 'No immediate treatment'
    ];

    constructor(
        private route: ActivatedRoute,
        public router: Router,
        private api: ApiService,
        public auth: AuthService
    ) { }

    ngOnInit(): void {
        if (!this.auth.isLoggedIn) {
            this.router.navigate(['/login']);
            return;
        }
        this.campId = this.route.snapshot.params['campId'];
        this.patientId = this.route.snapshot.params['patientId'];
        this.loadPatient();
    }

    loadPatient(): void {
        this.loading = true;
        this.api.getPatient(this.campId, this.patientId).subscribe({
            next: (res) => {
                this.patient = res.patient;
                this.loading = false;
            },
            error: () => {
                this.loading = false;
                this.patient = null;
            }
        });
    }

    toggleTreatment(treatment: string): void {
        const idx = this.screening.treatments.indexOf(treatment);
        if (idx >= 0) {
            this.screening.treatments.splice(idx, 1);
        } else {
            this.screening.treatments.push(treatment);
        }
    }

    saveDraft(): void {
        this.error = '';
        this.saving = true;
        this.draftSaved = false;

        const data = {
            patient_id: this.patientId,
            ...this.screening,
        };

        this.api.saveScreening(this.campId, data).subscribe({
            next: (res) => {
                this.saving = false;
                this.draftSaved = true;
                this.screeningId = res.screening.id;
                setTimeout(() => { this.draftSaved = false; }, 3000);
            },
            error: (err) => {
                this.saving = false;
                this.error = err.error?.error || 'Failed to save draft.';
            }
        });
    }

    submitScreening(): void {
        if (!this.screening.oral_hygiene) {
            this.error = 'Please select oral hygiene level before submitting.';
            return;
        }

        this.error = '';
        this.submitting = true;

        // First save, then submit
        const data = {
            patient_id: this.patientId,
            ...this.screening,
        };

        this.api.saveScreening(this.campId, data).subscribe({
            next: (saveRes) => {
                this.screeningId = saveRes.screening.id;
                this.api.submitScreening(this.campId, this.screeningId).subscribe({
                    next: () => {
                        this.submitting = false;
                        this.submitted = true;
                    },
                    error: (err) => {
                        this.submitting = false;
                        this.error = err.error?.error || 'Failed to submit screening.';
                    }
                });
            },
            error: (err) => {
                this.submitting = false;
                this.error = err.error?.error || 'Failed to save screening.';
            }
        });
    }
}
