import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-queue',
    template: `
    <div class="main-content fade-in">
      <div class="container">
        <div class="page-header">
          <div>
            <h1 class="page-title">Patient Queue</h1>
            <p class="page-subtitle" *ngIf="campName">{{ campName }}</p>
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <span class="auto-refresh-badge" *ngIf="autoRefresh">🔄 Auto-refresh ON</span>
            <button class="btn btn-outline btn-sm" (click)="toggleAutoRefresh()">
              {{ autoRefresh ? 'Pause' : '▶ Auto-refresh' }}
            </button>
            <button class="btn btn-primary btn-sm" (click)="loadQueue()">🔄 Refresh</button>
          </div>
        </div>

        <!-- Stats Bar -->
        <div class="stats-grid" *ngIf="!loading">
          <div class="stat-card primary">
            <div class="stat-label">Total</div>
            <div class="stat-value">{{ pagination.total }}</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-label">Pending</div>
            <div class="stat-value">{{ countByStatus('pending') }}</div>
          </div>
          <div class="stat-card info">
            <div class="stat-label">In Progress</div>
            <div class="stat-value">{{ countByStatus('in_progress') }}</div>
          </div>
          <div class="stat-card success">
            <div class="stat-label">Screened</div>
            <div class="stat-value">{{ countByStatus('screened') }}</div>
          </div>
        </div>

        <!-- Filters -->
        <div class="card filter-bar">
          <div class="filter-group">
            <button class="toggle-btn" [class.active]="statusFilter === ''" (click)="setFilter('')">All</button>
            <button class="toggle-btn" [class.active]="statusFilter === 'pending'" (click)="setFilter('pending')">⏳ Pending</button>
            <button class="toggle-btn" [class.active]="statusFilter === 'in_progress'" (click)="setFilter('in_progress')">🔒 In Progress</button>
            <button class="toggle-btn" [class.active]="statusFilter === 'screened'" (click)="setFilter('screened')">✅ Screened</button>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="loading-overlay">
          <div class="spinner"></div>
          <span>Loading queue...</span>
        </div>

        <!-- Queue Table -->
        <div class="table-container" *ngIf="!loading && queue.length > 0">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Age / Gender</th>
                <th>City</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Locked By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let entry of queue; let i = index" [class.row-urgent]="entry.priority === 'urgent'">
                <td>{{ i + 1 }}</td>
                <td><span class="pid-tag">{{ entry.patient?.patient_id }}</span></td>
                <td class="name-cell">{{ entry.patient?.full_name }}</td>
                <td>{{ entry.patient?.age }} / {{ entry.patient?.gender | titlecase }}</td>
                <td>{{ entry.patient?.city || '-' }}</td>
                <td>
                  <span class="badge" [ngClass]="{
                    'badge-danger': entry.priority === 'urgent',
                    'badge-info': entry.priority === 'mobility_issues',
                    'badge-primary': entry.priority === 'normal'
                  }">
                    {{ entry.priority === 'urgent' ? '🚨 Urgent' : entry.priority === 'mobility_issues' ? '♿ Mobility' : 'Normal' }}
                  </span>
                </td>
                <td>
                  <span class="badge" [ngClass]="{
                    'badge-warning': entry.status === 'pending',
                    'badge-info': entry.status === 'in_progress',
                    'badge-success': entry.status === 'screened'
                  }">{{ entry.status | titlecase }}</span>
                </td>
                <td>
                  <span *ngIf="entry.lockedByUser" class="locked-by">🔒 {{ entry.lockedByUser.name }}</span>
                  <span *ngIf="!entry.lockedByUser && entry.status !== 'screened'" class="text-muted">—</span>
                </td>
                <td>
                  <div class="action-btns">
                    <!-- Start Screening — lock and navigate -->
                    <button class="btn btn-primary btn-sm"
                            *ngIf="entry.status === 'pending' && auth.hasRole('dentist', 'camp_admin', 'system_admin')"
                            (click)="startScreening(entry)"
                            [disabled]="locking">
                      🦷 Screen
                    </button>

                    <!-- Continue — already locked by me -->
                    <button class="btn btn-accent btn-sm"
                            *ngIf="entry.status === 'in_progress' && entry.locked_by === auth.currentUser?.id"
                            (click)="router.navigate(['/screening', campId, entry.patient_id])">
                      ▶ Continue
                    </button>

                    <!-- Force Take — locked by someone else -->
                    <button class="btn btn-danger btn-sm"
                            *ngIf="entry.status === 'in_progress' && entry.locked_by !== auth.currentUser?.id && auth.hasRole('camp_admin', 'system_admin')"
                            (click)="forceTake(entry)">
                      ⚡ Take Over
                    </button>

                    <!-- Unlock -->
                    <button class="btn btn-outline btn-sm"
                            *ngIf="entry.status === 'in_progress' && (entry.locked_by === auth.currentUser?.id || auth.hasRole('camp_admin', 'system_admin'))"
                            (click)="unlockPatient(entry)">
                      🔓 Unlock
                    </button>

                    <!-- Download PDF -->
                    <button class="btn btn-outline btn-sm"
                            *ngIf="entry.status === 'screened'"
                            (click)="downloadPDF(entry)"
                            [disabled]="downloadingId === entry.patient_id">
                      {{ downloadingId === entry.patient_id ? '⏳ Downloading...' : '⬇️ Download PDF' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty -->
        <div *ngIf="!loading && queue.length === 0" class="card" style="text-align: center; padding: 3rem;">
          <h2>Queue is Empty</h2>
          <p style="color: var(--text-secondary); margin: 1rem 0;">No patients in the queue{{ statusFilter ? ' with status "' + statusFilter + '"' : '' }}.</p>
          <button class="btn btn-accent btn-lg" (click)="openRegistration()">➕ Register a Patient</button>
        </div>

        <!-- Toast -->
        <div class="toast" [ngClass]="toastType" *ngIf="toast">{{ toast }}</div>
      </div>
    </div>
  `,
    styles: [`
    .filter-bar {
      padding: 0.75rem 1rem;
      margin-bottom: 1.25rem;
    }
    .filter-group {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
    .auto-refresh-badge {
      font-size: 0.75rem;
      color: var(--success);
      background: rgba(34, 197, 94, 0.1);
      padding: 0.3rem 0.7rem;
      border-radius: 999px;
      font-weight: 600;
    }
    .pid-tag {
      font-family: 'Courier New', monospace;
      font-weight: 700;
      color: var(--primary-light);
      font-size: 0.85rem;
    }
    .name-cell { font-weight: 600; }
    .locked-by {
      font-size: 0.8rem;
      color: var(--warning);
      font-weight: 500;
    }
    .text-muted { color: var(--text-muted); }
    .action-btns { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .row-urgent {
      background: rgba(244, 63, 94, 0.06) !important;
      border-left: 3px solid var(--coral);
    }

    @media (max-width: 768px) {
      .table-container { font-size: 0.8rem; }
    }
  `]
})
export class QueueComponent implements OnInit, OnDestroy {
    campId = '';
    campName = '';
    queue: any[] = [];
    allQueue: any[] = [];
    loading = false;
    locking = false;
    downloadingId = '';
    statusFilter = '';
    autoRefresh = true;
    refreshInterval: any;
    toast = '';
    toastType = 'toast-info';
    pagination = { total: 0, page: 1, limit: 100, pages: 1 };

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
        this.loadCampName();
        this.loadQueue();
        this.startAutoRefresh();
    }

    ngOnDestroy(): void {
        this.stopAutoRefresh();
    }

    loadCampName(): void {
        this.api.getCamp(this.campId).subscribe({
            next: (res) => { this.campName = res.camp.name; },
            error: () => { }
        });
    }

    loadQueue(): void {
        this.loading = this.allQueue.length === 0;
        this.api.getQueue(this.campId, { limit: 200 }).subscribe({
            next: (res) => {
                this.allQueue = res.queue;
                this.pagination = res.pagination;
                this.applyFilter();
                this.loading = false;
            },
            error: () => { this.loading = false; }
        });
    }

    setFilter(status: string): void {
        this.statusFilter = status;
        this.applyFilter();
    }

    applyFilter(): void {
        if (this.statusFilter) {
            this.queue = this.allQueue.filter((e: any) => e.status === this.statusFilter);
        } else {
            this.queue = [...this.allQueue];
        }
    }

    countByStatus(status: string): number {
        return this.allQueue.filter((e: any) => e.status === status).length;
    }

    startScreening(entry: any): void {
        this.locking = true;
        this.api.lockPatient(this.campId, entry.patient_id).subscribe({
            next: () => {
                this.locking = false;
                this.router.navigate(['/screening', this.campId, entry.patient_id]);
            },
            error: (err) => {
                this.locking = false;
                if (err.status === 423) {
                    this.showToast('Patient is locked by ' + (err.error?.locked_by || 'another dentist'), 'toast-error');
                } else {
                    this.showToast(err.error?.error || 'Failed to lock patient', 'toast-error');
                }
            }
        });
    }

    forceTake(entry: any): void {
        if (!confirm('This patient is locked by another dentist. Are you sure you want to take over?')) return;
        this.api.lockPatient(this.campId, entry.patient_id, true).subscribe({
            next: () => {
                this.router.navigate(['/screening', this.campId, entry.patient_id]);
            },
            error: (err) => {
                this.showToast(err.error?.error || 'Failed to take over', 'toast-error');
            }
        });
    }

    unlockPatient(entry: any): void {
        this.api.unlockPatient(this.campId, entry.patient_id).subscribe({
            next: () => {
                this.showToast('Patient unlocked', 'toast-success');
                this.loadQueue();
            },
            error: (err) => {
                this.showToast(err.error?.error || 'Failed to unlock', 'toast-error');
            }
        });
    }

    downloadPDF(entry: any): void {
        this.downloadingId = entry.patient_id;
        this.api.downloadPatientReport(this.campId, entry.patient_id).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `report_${entry.patient?.patient_id || entry.patient_id}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                this.downloadingId = '';
                this.showToast('PDF downloaded successfully', 'toast-success');
            },
            error: (err) => {
                this.downloadingId = '';
                const msg = err.error?.error || 'Report not available. It may still be generating.';
                this.showToast(msg, 'toast-error');
            }
        });
    }

    openRegistration(): void {
        window.open(`/register/${this.campId}`, '_blank');
    }

    toggleAutoRefresh(): void {
        this.autoRefresh = !this.autoRefresh;
        if (this.autoRefresh) {
            this.startAutoRefresh();
        } else {
            this.stopAutoRefresh();
        }
    }

    startAutoRefresh(): void {
        this.refreshInterval = setInterval(() => {
            if (this.autoRefresh) this.loadQueue();
        }, 15000);
    }

    stopAutoRefresh(): void {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
    }

    showToast(msg: string, type = 'toast-info'): void {
        this.toast = msg;
        this.toastType = type;
        setTimeout(() => { this.toast = ''; }, 3500);
    }
}
