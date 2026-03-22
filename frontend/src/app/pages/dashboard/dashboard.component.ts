import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-dashboard',
    template: `
    <div class="main-content fade-in">
      <div class="container">
        <div class="page-header">
          <div>
            <h1 class="page-title">Dashboard</h1>
            <p class="page-subtitle">Welcome back, {{ auth.currentUser?.name }}</p>
          </div>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-primary" (click)="router.navigate(['/camps'])">🏕️ Manage Camps</button>
          </div>
        </div>

        <!-- Camp Selector -->
        <div class="card" style="margin-bottom: 1.5rem; padding: 1rem 1.5rem;" *ngIf="camps.length > 0">
          <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
            <label class="form-label" style="margin: 0; white-space: nowrap;">Active Camp:</label>
            <select class="form-control" style="max-width: 400px;" [(ngModel)]="activeCampId" (change)="selectCamp()">
              <option *ngFor="let camp of camps" [value]="camp.id">{{ camp.name }} ({{ camp.prefix }})</option>
            </select>
            <button class="btn btn-outline btn-sm" *ngIf="activeCampId" (click)="copyRegLink()">📋 Copy Registration Link</button>
          </div>
        </div>

        <div *ngIf="loading" class="loading-overlay">
          <div class="spinner"></div>
          <span>Loading analytics...</span>
        </div>

        <!-- Analytics -->
        <div *ngIf="analytics && !loading">
          <!-- Summary Stats -->
          <div class="stats-grid">
            <div class="stat-card primary clickable-card" (click)="goToQueue('all')">
              <div class="stat-label">Total Registered</div>
              <div class="stat-value">{{ analytics.summary.total_registered }}</div>
            </div>
            <div class="stat-card success clickable-card" (click)="goToQueue('screened')">
              <div class="stat-label">Screened</div>
              <div class="stat-value">{{ analytics.summary.total_screened }}</div>
              <div class="stat-sub">{{ getPercentage(analytics.summary.total_screened, analytics.summary.total_registered) }}% complete</div>
            </div>
            <div class="stat-card warning clickable-card" (click)="goToQueue('pending')">
              <div class="stat-label">Pending</div>
              <div class="stat-value">{{ analytics.summary.total_pending }}</div>
            </div>
            <div class="stat-card info clickable-card" (click)="goToQueue('in_progress')">
              <div class="stat-label">In Progress</div>
              <div class="stat-value">{{ analytics.summary.total_in_progress }}</div>
            </div>
          </div>

          <!-- Findings -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            <div class="card">
              <h3 style="margin-bottom: 1rem;">📊 Clinical Findings</h3>
              <div class="finding-row">
                <span>Dental Caries</span>
                <div class="finding-bar">
                  <div class="finding-fill danger" [style.width.%]="analytics.findings.caries.percentage"></div>
                </div>
                <span class="finding-pct">{{ analytics.findings.caries.percentage }}%</span>
              </div>
              <div class="finding-row">
                <span>Gingivitis</span>
                <div class="finding-bar">
                  <div class="finding-fill warning" [style.width.%]="analytics.findings.gingivitis.percentage"></div>
                </div>
                <span class="finding-pct">{{ analytics.findings.gingivitis.percentage }}%</span>
              </div>
              <div class="finding-row">
                <span>Malocclusion</span>
                <div class="finding-bar">
                  <div class="finding-fill info" [style.width.%]="analytics.findings.malocclusion.percentage"></div>
                </div>
                <span class="finding-pct">{{ analytics.findings.malocclusion.percentage }}%</span>
              </div>
            </div>

            <div class="card">
              <h3 style="margin-bottom: 1rem;">🪥 Oral Hygiene Distribution</h3>
              <div class="hygiene-bars">
                <div class="hygiene-item">
                  <div class="hygiene-label">Good</div>
                  <div class="hygiene-bar good" [style.width.%]="getHygienePercent('good')"></div>
                  <span>{{ analytics.findings.oral_hygiene.good }}</span>
                </div>
                <div class="hygiene-item">
                  <div class="hygiene-label">Fair</div>
                  <div class="hygiene-bar fair" [style.width.%]="getHygienePercent('fair')"></div>
                  <span>{{ analytics.findings.oral_hygiene.fair }}</span>
                </div>
                <div class="hygiene-item">
                  <div class="hygiene-label">Poor</div>
                  <div class="hygiene-bar poor" [style.width.%]="getHygienePercent('poor')"></div>
                  <span>{{ analytics.findings.oral_hygiene.poor }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Treatment Breakdown -->
          <div class="card" *ngIf="treatmentKeys.length > 0">
            <h3 style="margin-bottom: 1rem;">💊 Treatment Recommendations</h3>
            <div class="treatment-grid">
              <div class="treatment-item" *ngFor="let key of treatmentKeys">
                <span class="treatment-count">{{ analytics.treatment_breakdown[key] }}</span>
                <span class="treatment-name">{{ key }}</span>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div style="display: flex; gap: 1rem; margin-top: 1.5rem; flex-wrap: wrap;">
            <button class="btn btn-primary btn-lg" (click)="router.navigate(['/queue', activeCampId])">
              📋 Open Queue
            </button>
            <button class="btn btn-accent btn-lg" (click)="openRegistration()">
              ➕ New Registration
            </button>
            <button class="btn btn-outline" *ngIf="auth.hasRole('camp_admin', 'system_admin')" (click)="exportCSV()">
              📥 Export CSV
            </button>
            <button class="btn btn-outline" *ngIf="auth.hasRole('camp_admin', 'system_admin')" (click)="exportPDF()">
              📄 Download PDF
            </button>
          </div>
        </div>

        <div *ngIf="!loading && !analytics && camps.length === 0" class="card" style="text-align: center; padding: 3rem;">
          <h2>No Camps Found</h2>
          <p style="color: var(--text-secondary); margin: 1rem 0;">Create your first dental camp to get started.</p>
          <button class="btn btn-primary btn-lg" (click)="router.navigate(['/camps'])">Create Camp</button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .clickable-card {
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .clickable-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    }
    .finding-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
      font-size: 0.9rem;
    }
    .finding-row > span:first-child { min-width: 110px; color: var(--text-secondary); }
    .finding-bar {
      flex: 1;
      height: 8px;
      background: var(--bg-tertiary);
      border-radius: 4px;
      overflow: hidden;
    }
    .finding-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.6s ease;
    }
    .finding-fill.danger { background: linear-gradient(90deg, var(--coral), var(--coral-light)); }
    .finding-fill.warning { background: linear-gradient(90deg, var(--warning), #facc15); }
    .finding-fill.info { background: linear-gradient(90deg, var(--info), #60a5fa); }
    .finding-pct { min-width: 45px; text-align: right; font-weight: 600; }

    .hygiene-bars { display: flex; flex-direction: column; gap: 0.75rem; }
    .hygiene-item { display: flex; align-items: center; gap: 0.75rem; }
    .hygiene-label { min-width: 50px; font-size: 0.85rem; color: var(--text-secondary); }
    .hygiene-bar {
      height: 24px;
      border-radius: 6px;
      transition: width 0.6s ease;
      min-width: 4px;
    }
    .hygiene-bar.good { background: linear-gradient(90deg, #22c55e, #4ade80); }
    .hygiene-bar.fair { background: linear-gradient(90deg, #eab308, #facc15); }
    .hygiene-bar.poor { background: linear-gradient(90deg, #ef4444, #f87171); }
    .hygiene-item > span:last-child { font-weight: 600; font-size: 0.9rem; }

    .treatment-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .treatment-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: var(--bg-tertiary);
      border-radius: 8px;
      border: 1px solid var(--border);
    }
    .treatment-count {
      font-weight: 700;
      font-size: 1.1rem;
      color: var(--primary-light);
    }
    .treatment-name { font-size: 0.85rem; color: var(--text-secondary); }
  `]
})
export class DashboardComponent implements OnInit {
    camps: any[] = [];
    activeCampId: string = '';
    analytics: any = null;
    loading = false;
    treatmentKeys: string[] = [];

    constructor(
        public auth: AuthService,
        private api: ApiService,
        public router: Router
    ) { }

    ngOnInit(): void {
        if (!this.auth.isLoggedIn) {
            this.router.navigate(['/login']);
            return;
        }
        this.loadCamps();
    }

    loadCamps(): void {
        this.api.getCamps().subscribe({
            next: (res) => {
                this.camps = res.camps;
                if (this.camps.length > 0) {
                    const stored = localStorage.getItem('dental_active_camp');
                    this.activeCampId = stored && this.camps.find((c: any) => c.id === stored) ? stored : this.camps[0].id;
                    this.selectCamp();
                }
            },
            error: (err) => console.error('Failed to load camps', err)
        });
    }

    selectCamp(): void {
        localStorage.setItem('dental_active_camp', this.activeCampId);
        this.loadAnalytics();
    }

    loadAnalytics(): void {
        if (!this.activeCampId) return;
        this.loading = true;
        this.api.getAnalytics(this.activeCampId).subscribe({
            next: (data) => {
                this.analytics = data;
                this.treatmentKeys = Object.keys(data.treatment_breakdown || {});
                this.loading = false;
            },
            error: () => { this.loading = false; }
        });
    }

    getPercentage(part: number, total: number): number {
        return total > 0 ? Math.round((part / total) * 100) : 0;
    }

    getHygienePercent(level: string): number {
        if (!this.analytics) return 0;
        const total = this.analytics.findings.total_screenings;
        if (total === 0) return 0;
        return Math.round((this.analytics.findings.oral_hygiene[level] / total) * 100);
    }

    openRegistration(): void {
        window.open(`/register/${this.activeCampId}`, '_blank');
    }

    copyRegLink(): void {
        const link = `${window.location.origin}/register/${this.activeCampId}`;
        navigator.clipboard.writeText(link);
        alert('Registration link copied!');
    }

    exportCSV(): void {
        this.api.generateExport(this.activeCampId, 'csv').subscribe({
            next: (res) => {
                alert(`Export generated! ${res.record_count} records. Download URL: ${res.download_url}`);
            },
            error: (err) => alert('Export failed: ' + (err.error?.error || 'Unknown error'))
        });
    }

    exportPDF(): void {
        this.api.generateExport(this.activeCampId, 'pdf').subscribe({
            next: (res) => {
                alert(`PDF Export generated! Download URL: ${res.download_url}`);
                window.open(res.download_url, '_blank');
            },
            error: (err) => alert('PDF Export failed: ' + (err.error?.error || 'Unknown error. Check backend support.'))
        });
    }

    goToQueue(statusStr: string): void {
        const queryParams = statusStr === 'all' ? {} : { status: statusStr };
        this.router.navigate(['/queue', this.activeCampId], { queryParams });
    }
}
