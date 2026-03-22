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
            <h1 class="page-title">My Appointments</h1>
            <p class="page-subtitle">Welcome, {{ auth.currentUser?.name }}</p>
          </div>
          <button class="btn btn-primary" (click)="router.navigate(['/book-appointment'])">
            ➕ Book Appointment
          </button>
        </div>

        <!-- Live Queue Cards -->
        <div class="live-section" *ngIf="liveQueues.length > 0">
          <h3 style="margin-bottom: 0.75rem; font-size: 0.95rem; color: var(--text-secondary);">
            🔴 LIVE QUEUE STATUS
          </h3>
          <div class="live-grid">
            <div class="live-card" *ngFor="let lq of liveQueues">
              <div class="live-header">{{ lq.campName }}</div>
              <div class="live-serving" *ngIf="lq.data?.currently_serving?.length > 0">
                <span class="serving-label">Now Serving</span>
                <div *ngFor="let s of lq.data.currently_serving" class="serving-row">
                  <span class="serving-token">#{{ s.token_number }}</span>
                  <span class="serving-doc">{{ s.doctor_name }}</span>
                  <span class="extended-badge" *ngIf="s.extended_minutes > 0">+{{ s.extended_minutes }}m</span>
                </div>
              </div>
              <div *ngIf="!lq.data?.currently_serving?.length" class="live-waiting">
                <span style="color: var(--text-muted);">No one being served yet</span>
              </div>
              <div class="live-stats">
                <div><span class="ls-label">Waiting</span><span class="ls-val">{{ lq.data?.upcoming_count || 0 }}</span></div>
                <div><span class="ls-label">Done</span><span class="ls-val">{{ lq.data?.completed_count || 0 }}</span></div>
                <div><span class="ls-label">Total</span><span class="ls-val">{{ lq.data?.total_count || 0 }}</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="loading-overlay"><div class="spinner"></div></div>

        <!-- Appointment List -->
        <div *ngIf="!loading">
          <div *ngFor="let apt of appointments" class="card apt-card" [class.apt-cancelled]="apt.status === 'cancelled'" [class.apt-completed]="apt.status === 'completed'">
            <div class="apt-top">
              <div class="apt-token-wrap">
                <span class="apt-token">#{{ apt.token_number }}</span>
                <span class="badge" [ngClass]="{
                  'badge-primary': apt.status === 'booked',
                  'badge-info': apt.status === 'in_progress',
                  'badge-success': apt.status === 'completed',
                  'badge-danger': apt.status === 'cancelled',
                  'badge-warning': apt.status === 'no_show'
                }">{{ apt.status | titlecase }}</span>
                <span class="badge badge-outline" *ngIf="apt.type === 'walk_in'">Walk-in</span>
              </div>
              <div class="apt-right">
                <button class="btn btn-danger btn-sm" *ngIf="canCancel(apt)" (click)="cancelAppointment(apt)">
                  ❌ Cancel
                </button>
              </div>
            </div>

            <div class="apt-details">
              <div class="apt-field">
                <span class="af-label">Doctor</span>
                <span>🩺 {{ apt.doctor?.name || 'N/A' }}</span>
              </div>
              <div class="apt-field">
                <span class="af-label">Camp</span>
                <span>🏕️ {{ apt.camp?.name || 'N/A' }}</span>
              </div>
              <div class="apt-field">
                <span class="af-label">Date</span>
                <span>📅 {{ formatDate(apt.appointment_date) }}</span>
              </div>
              <div class="apt-field">
                <span class="af-label">Time Slot</span>
                <span>⏰ {{ apt.start_time }} — {{ apt.end_time }}</span>
              </div>
            </div>

            <!-- Wait Estimate (for active appointments) -->
            <div class="wait-bar" *ngIf="apt.status === 'booked'">
              <div class="wait-info">
                <span>⏳ Estimated wait: <strong>~{{ apt.estimated_wait_minutes || 0 }} min</strong></span>
                <span *ngIf="apt.estimated_start_time_live">
                  | Your turn at approximately <strong>{{ apt.estimated_start_time_live }}</strong>
                </span>
              </div>
            </div>
            <div class="wait-bar in-progress-bar" *ngIf="apt.status === 'in_progress'">
              <span>🦷 <strong>Doctor is seeing you now!</strong></span>
              <span *ngIf="apt.extended_minutes > 0" class="extended-badge">
                Extended by {{ apt.extended_minutes }} min
              </span>
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div *ngIf="!loading && appointments.length === 0" class="card" style="text-align: center; padding: 3rem;">
          <div style="font-size: 3rem; margin-bottom: 0.75rem;">📋</div>
          <h2>No Appointments Yet</h2>
          <p style="color: var(--text-secondary); margin: 0.75rem 0;">Book your first dental appointment to get started.</p>
          <button class="btn btn-primary btn-lg" (click)="router.navigate(['/book-appointment'])">
            🦷 Book Now
          </button>
        </div>

        <!-- Toast -->
        <div class="toast" [ngClass]="toastType" *ngIf="toast">{{ toast }}</div>
      </div>
    </div>
  `,
    styles: [`
    .live-section { margin-bottom: 1.5rem; }
    .live-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .live-card {
      background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px;
      padding: 1rem 1.25rem; border-left: 4px solid var(--coral);
    }
    .live-header { font-weight: 700; font-size: 0.95rem; margin-bottom: 0.75rem; }
    .serving-label {
      font-size: 0.7rem; color: var(--coral); text-transform: uppercase;
      letter-spacing: 0.05em; font-weight: 700; display: block; margin-bottom: 0.35rem;
    }
    .serving-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }
    .serving-token { font-size: 1.4rem; font-weight: 900; color: var(--primary-light); }
    .serving-doc { color: var(--text-secondary); font-size: 0.85rem; }
    .extended-badge {
      background: rgba(249, 115, 22, 0.15); color: #f97316; padding: 0.15rem 0.4rem;
      border-radius: 4px; font-size: 0.7rem; font-weight: 700;
    }
    .live-waiting { padding: 0.5rem 0; }
    .live-stats { display: flex; gap: 1rem; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border); }
    .ls-label { display: block; font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; }
    .ls-val { font-weight: 700; font-size: 1.1rem; }

    .apt-card { margin-bottom: 1rem; }
    .apt-cancelled { opacity: 0.6; }
    .apt-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .apt-token-wrap { display: flex; align-items: center; gap: 0.5rem; }
    .apt-token { font-size: 1.5rem; font-weight: 900; color: var(--primary-light); }
    .badge-outline { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); }

    .apt-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.5rem; }
    .apt-field { font-size: 0.88rem; }
    .af-label { display: block; font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }

    .wait-bar {
      margin-top: 0.75rem; padding: 0.6rem 1rem; border-radius: 8px;
      background: rgba(13, 148, 136, 0.08); border: 1px solid rgba(13, 148, 136, 0.2);
      font-size: 0.85rem; color: var(--text-secondary);
    }
    .in-progress-bar {
      background: rgba(34, 197, 94, 0.08); border-color: rgba(34, 197, 94, 0.2);
      display: flex; align-items: center; gap: 0.75rem;
    }

    @media (max-width: 600px) {
      .apt-details { grid-template-columns: 1fr 1fr; }
      .live-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class PatientPortalComponent implements OnInit, OnDestroy {
    appointments: any[] = [];
    liveQueues: any[] = [];
    loading = false;
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
        this.loadAppointments();
        this.refreshInterval = setInterval(() => {
            this.loadAppointments();
        }, 15000);
    }

    ngOnDestroy(): void {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
    }

    loadAppointments(): void {
        this.loading = this.appointments.length === 0;
        this.api.getMyAppointments().subscribe({
            next: (res) => {
                this.appointments = res.appointments;
                this.loading = false;
                this.loadLiveQueues();
            },
            error: () => { this.loading = false; }
        });
    }

    loadLiveQueues(): void {
        const activeCampIds = new Set<string>();
        for (const apt of this.appointments) {
            if (['booked', 'in_progress'].includes(apt.status)) {
                activeCampIds.add(apt.camp_id);
            }
        }
        this.liveQueues = [];
        activeCampIds.forEach(campId => {
            const campName = this.appointments.find(a => a.camp_id === campId)?.camp?.name || 'Camp';
            this.api.getLiveQueue(campId).subscribe({
                next: (data) => {
                    this.liveQueues.push({ campId, campName, data });
                },
                error: () => { }
            });
        });
    }

    canCancel(apt: any): boolean {
        if (apt.status !== 'booked') return false;
        const aptTime = new Date(`${apt.appointment_date}T${apt.start_time}:00`);
        const now = new Date();
        return (aptTime.getTime() - now.getTime()) >= 60 * 60 * 1000;
    }

    cancelAppointment(apt: any): void {
        if (!confirm('Are you sure you want to cancel this appointment?')) return;
        this.api.cancelAppointment(apt.id).subscribe({
            next: () => {
                this.showToast('Appointment cancelled', 'toast-success');
                this.loadAppointments();
            },
            error: (err) => {
                this.showToast(err.error?.error || 'Cannot cancel', 'toast-error');
            }
        });
    }

    formatDate(d: string): string {
        if (!d) return '';
        return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    }

    showToast(msg: string, type = 'toast-info'): void {
        this.toast = msg; this.toastType = type;
        setTimeout(() => { this.toast = ''; }, 3500);
    }
}
