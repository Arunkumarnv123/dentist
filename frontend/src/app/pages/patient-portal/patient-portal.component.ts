import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-patient-portal',
    template: `
    <div class="main-content fade-in">
      <div class="container" style="max-width: 900px;">
        <div class="page-header">
          <div>
            <h1 class="page-title">My Dental Reports</h1>
            <p class="page-subtitle">Welcome, {{ auth.currentUser?.name }}</p>
          </div>
          <button class="btn btn-outline" (click)="logout()">🚪 Logout</button>
        </div>

        <!-- Patient Info Card -->
        <div class="card patient-info-card" *ngIf="auth.currentUser">
          <div class="patient-info-row">
            <div class="patient-info-item">
              <span class="pi-label">Patient ID</span>
              <span class="pi-value pid">{{ auth.currentUser.patient_id || '—' }}</span>
            </div>
            <div class="patient-info-item">
              <span class="pi-label">Phone</span>
              <span class="pi-value">{{ auth.currentUser.phone || '—' }}</span>
            </div>
            <div class="patient-info-item">
              <span class="pi-label">Queue Status</span>
              <span class="pi-value">
                <span *ngIf="queueStatus" class="badge" [ngClass]="{
                  'badge-warning': queueStatus.status === 'pending',
                  'badge-info': queueStatus.status === 'in_progress',
                  'badge-success': queueStatus.status === 'screened'
                }">{{ queueStatus.status | titlecase }}</span>
                <span *ngIf="!queueStatus" class="text-muted">—</span>
              </span>
            </div>
            <div class="patient-info-item" *ngIf="queueStatus && queueStatus.status === 'pending'">
              <span class="pi-label">Est. Wait</span>
              <span class="pi-value">~{{ queueStatus.estimated_wait_minutes }} min (Position #{{ queueStatus.queue_position }})</span>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="loading-overlay"><div class="spinner"></div></div>

        <!-- Reports Section -->
        <div *ngIf="!loading">
          <div *ngIf="reports.length > 0">
            <h3 style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em;">
              📋 Your Screening Reports
            </h3>
            <div class="card report-card" *ngFor="let report of reports">
              <div class="report-header">
                <div>
                  <span class="report-date">📅 {{ formatDate(report.generated_at || report.createdAt) }}</span>
                  <span class="camp-name" *ngIf="report.camp">🏕️ {{ report.camp?.name }}</span>
                </div>
                <button class="btn btn-primary btn-sm" (click)="downloadReport(report)"
                        [disabled]="downloadingId === report.id">
                  {{ downloadingId === report.id ? '⏳ Downloading...' : '⬇️ Download PDF' }}
                </button>
              </div>

              <div class="findings-grid" *ngIf="report.screening">
                <div class="finding-item">
                  <span class="f-label">Oral Hygiene</span>
                  <span class="f-val">{{ report.screening.oral_hygiene | titlecase }}</span>
                </div>
                <div class="finding-item">
                  <span class="f-label">Dental Caries</span>
                  <span class="f-val" [ngClass]="report.screening.caries ? 'warn' : 'ok'">
                    {{ report.screening.caries ? '⚠ Yes' : '✓ No' }}
                  </span>
                </div>
                <div class="finding-item">
                  <span class="f-label">Gingivitis</span>
                  <span class="f-val" [ngClass]="report.screening.gingivitis ? 'warn' : 'ok'">
                    {{ report.screening.gingivitis ? '⚠ Yes' : '✓ No' }}
                  </span>
                </div>
                <div class="finding-item">
                  <span class="f-label">Malocclusion</span>
                  <span class="f-val" [ngClass]="report.screening.malocclusion ? 'warn' : 'ok'">
                    {{ report.screening.malocclusion ? '⚠ Yes' : '✓ No' }}
                  </span>
                </div>
              </div>

              <div class="treatments-section" *ngIf="report.screening?.treatments?.length > 0">
                <span class="f-label">Recommended Treatments</span>
                <ul class="treatment-list">
                  <li *ngFor="let t of report.screening.treatments">{{ t }}</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Empty — Screening Not Done Yet -->
          <div *ngIf="reports.length === 0" class="card" style="text-align: center; padding: 3rem;">
            <div style="font-size: 3rem; margin-bottom: 0.75rem;">🦷</div>
            <h2>No Reports Available Yet</h2>
            <p style="color: var(--text-secondary); margin: 0.75rem 0;">
              Your dental screening report will appear here once the doctor completes your examination.
            </p>
            <div class="wait-info-box" *ngIf="queueStatus">
              <p>
                <strong>Queue Status: </strong>
                <span class="badge" [ngClass]="{
                  'badge-warning': queueStatus.status === 'pending',
                  'badge-info': queueStatus.status === 'in_progress',
                  'badge-success': queueStatus.status === 'screened'
                }">{{ queueStatus.status | titlecase }}</span>
              </p>
              <p *ngIf="queueStatus.status === 'pending'" style="margin-top: 0.5rem; color: var(--text-secondary);">
                You are in position <strong>#{{ queueStatus.queue_position }}</strong> — estimated wait: <strong>~{{ queueStatus.estimated_wait_minutes }} minutes</strong>
              </p>
            </div>
          </div>
        </div>

        <!-- Toast -->
        <div class="toast" [ngClass]="toastType" *ngIf="toast">{{ toast }}</div>
      </div>
    </div>
  `,
    styles: [`
    .patient-info-card { margin-bottom: 1.5rem; }
    .patient-info-row {
      display: flex; flex-wrap: wrap; gap: 1.5rem; align-items: center;
    }
    .patient-info-item { }
    .pi-label { display: block; font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .pi-value { font-size: 1rem; font-weight: 600; }
    .pid { font-family: monospace; color: var(--primary-light); }
    .text-muted { color: var(--text-muted); }

    .report-card { margin-bottom: 1rem; }
    .report-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;
    }
    .report-date { font-weight: 600; margin-right: 1rem; }
    .camp-name { color: var(--text-secondary); font-size: 0.85rem; }

    .findings-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 0.75rem; margin-bottom: 0.75rem;
    }
    .finding-item { }
    .f-label { display: block; font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .f-val { font-weight: 600; font-size: 0.9rem; }
    .f-val.warn { color: #f97316; }
    .f-val.ok { color: var(--success); }

    .treatments-section { border-top: 1px solid var(--border); padding-top: 0.75rem; margin-top: 0.75rem; }
    .treatment-list { margin: 0.35rem 0 0 1rem; padding: 0; color: var(--text-secondary); font-size: 0.88rem; }
    .treatment-list li { margin-bottom: 0.2rem; }

    .wait-info-box {
      margin-top: 1rem; padding: 1rem;
      background: rgba(20, 184, 166, 0.06);
      border: 1px solid rgba(20, 184, 166, 0.2);
      border-radius: 10px;
    }

    @media (max-width: 600px) {
      .findings-grid { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class PatientPortalComponent implements OnInit, OnDestroy {
    reports: any[] = [];
    queueStatus: any = null;
    loading = false;
    downloadingId = '';
    toast = '';
    toastType = 'toast-info';
    refreshInterval: any;

    constructor(
        public router: Router,
        private api: ApiService,
        public auth: AuthService
    ) { }

    ngOnInit(): void {
        if (!this.auth.isLoggedIn) {
            this.router.navigate(['/login']);
            return;
        }
        // Only patient role uses this portal
        if (this.auth.currentUser?.role !== 'patient') {
            this.router.navigate(['/dashboard']);
            return;
        }
        this.loadData();
        this.refreshInterval = setInterval(() => this.loadData(), 30000);
    }

    ngOnDestroy(): void {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
    }

    loadData(): void {
        const user = this.auth.currentUser;
        if (!user) return;

        this.loading = this.reports.length === 0;

        // Load reports if patient has a camp_id and id
        if (user.camp_id && user.id) {
            this.api.getPatientReports(user.camp_id, user.id).subscribe({
                next: (res) => {
                    this.reports = res.reports || [];
                    this.loading = false;
                },
                error: () => { this.loading = false; }
            });

            // Also load queue status if patient_id available
            if (user.patient_id) {
                this.api.getPatientLiveStatus(user.camp_id, user.patient_id).subscribe({
                    next: (res) => { this.queueStatus = res; },
                    error: () => { }
                });
            }
        } else {
            this.loading = false;
        }
    }

    downloadReport(report: any): void {
        const user = this.auth.currentUser;
        if (!user?.camp_id || !user?.id) {
            this.showToast('Could not identify patient. Please log out and log in again.', 'toast-error');
            return;
        }

        this.downloadingId = report.id;
        this.api.downloadPatientReport(user.camp_id, user.id).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dental_report_${user.patient_id || user.name}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                this.downloadingId = '';
                this.showToast('Report downloaded!', 'toast-success');
            },
            error: (err) => {
                this.downloadingId = '';
                this.showToast(err.error?.error || 'Download failed. Report may not be ready yet.', 'toast-error');
            }
        });
    }

    logout(): void {
        this.auth.logout();
        this.router.navigate(['/login']);
    }

    formatDate(d: string): string {
        if (!d) return '';
        return new Date(d).toLocaleDateString('en-IN', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
        });
    }

    showToast(msg: string, type = 'toast-info'): void {
        this.toast = msg; this.toastType = type;
        setTimeout(() => { this.toast = ''; }, 3500);
    }
}
