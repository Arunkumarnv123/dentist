import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-patient-status',
  template: `
    <div class="status-page fade-in">
      <div class="status-container">
        <div class="header">
          <div class="icon">🏥</div>
          <h1>Live Queue Status</h1>
          <p>Track your position in real-time</p>
        </div>

        <div *ngIf="loading" class="spinner"></div>

        <div *ngIf="!loading && !error" class="status-card">
          <div class="patient-info">
            <h2>{{ statusData.patient_name }}</h2>
            <div class="pid">{{ statusData.patient_id }}</div>
          </div>

          <div class="metrics">
            <div class="metric-box status-{{statusData.status}}">
              <span class="label">Status</span>
              <span class="value">{{ statusData.status | titlecase }}</span>
            </div>
            
            <div class="metric-box info" *ngIf="statusData.status !== 'screened'">
              <span class="label">People Ahead</span>
              <span class="value">{{ statusData.people_ahead }}</span>
            </div>

            <div class="metric-box warning" *ngIf="statusData.status !== 'screened'">
              <span class="label">Est. Wait Time</span>
              <span class="value">{{ statusData.estimated_wait_minutes }} min</span>
            </div>
          </div>

          <p class="live-notice" *ngIf="statusData.status !== 'screened'">
            🔄 This page automatically refreshes every 15 seconds.
          </p>

          <div *ngIf="statusData.status === 'screened'" class="success-alert">
            ✅ You have been screened. Thank you!
          </div>
        </div>

        <div *ngIf="error" class="error-msg">{{ error }}</div>
      </div>
    </div>
  `,
  styles: [`
    .status-page { min-height: 100vh; display: flex; align-items: flex-start; justify-content: center; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 2rem 1rem; }
    .status-container { width: 100%; max-width: 500px; background: rgba(30, 41, 59, 0.85); backdrop-filter: blur(20px); border: 1px solid var(--border); border-radius: 20px; padding: 2rem; box-shadow: 0 20px 60px rgba(0,0,0,0.5); text-align: center; }
    .header .icon { font-size: 3rem; margin-bottom: 0.5rem; }
    .header h1 { font-size: 1.5rem; color: var(--text-primary); }
    .header p { color: var(--text-secondary); margin-bottom: 1.5rem; }
    .patient-info { background: var(--bg-tertiary); padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem; }
    .patient-info h2 { font-size: 1.25rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem; }
    .patient-info .pid { font-family: 'Courier New', monospace; font-weight: 700; font-size: 1.2rem; color: var(--primary-light); }
    .metrics { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; }
    .metric-box { background: var(--bg-secondary); border: 1px solid var(--border); padding: 1.25rem; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; }
    .metric-box .label { font-size: 0.9rem; color: var(--text-secondary); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
    .metric-box .value { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); }
    .status-pending { border-color: var(--warning); background: rgba(234, 179, 8, 0.1); }
    .status-in_progress { border-color: var(--primary); background: rgba(59, 130, 246, 0.1); }
    .status-screened { border-color: var(--success); background: rgba(34, 197, 94, 0.1); }
    .live-notice { color: var(--text-muted); font-size: 0.85rem; margin-top: 1rem; }
    .success-alert { background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); color: var(--success); padding: 1rem; border-radius: 12px; font-weight: 600; margin-top: 1rem; }
    .error-msg { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; padding: 1rem; border-radius: 12px; }
  `]
})
export class PatientStatusComponent implements OnInit, OnDestroy {
  campId = '';
  patientId = '';
  statusData: any = null;
  loading = true;
  error = '';
  refreshInterval: any;

  constructor(private route: ActivatedRoute, private api: ApiService) { }

  ngOnInit() {
    this.campId = this.route.snapshot.params['campId'];
    this.patientId = this.route.snapshot.params['patientId'];
    this.fetchStatus();
    this.refreshInterval = setInterval(() => {
      this.fetchStatus();
    }, 15000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  fetchStatus() {
    this.api.getPatientLiveStatus(this.campId, this.patientId).subscribe({
      next: (res) => {
        this.statusData = res;
        this.loading = false;
        this.error = '';
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to load live status';
        this.loading = false;
      }
    });
  }
}
