import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-camps',
  template: `
    <div class="main-content fade-in">
      <div class="container">
        <div class="page-header">
          <div>
            <h1 class="page-title">Camp Management</h1>
            <p class="page-subtitle">Create and manage dental screening camps</p>
          </div>
          <button class="btn btn-primary" (click)="showCreateForm = !showCreateForm"
                  *ngIf="auth.hasRole('camp_admin', 'system_admin')">
            {{ showCreateForm ? '✕ Cancel' : '➕ New Camp' }}
          </button>
        </div>

        <!-- Create / Edit Camp Form -->
        <div class="card form-card" *ngIf="showCreateForm" @fadeIn>
          <h3 style="margin-bottom: 1.25rem;">{{ editingCamp ? '✏️ Edit Camp' : '🏕️ Create New Camp' }}</h3>

          <form (ngSubmit)="saveCamp()">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Camp Name *</label>
                <input type="text" class="form-control" [(ngModel)]="campForm.name" name="name"
                       placeholder="e.g. HealthFirst Dental Camp" required>
              </div>
              <div class="form-group">
                <label class="form-label">Prefix (ID Tag) *</label>
                <input type="text" class="form-control" [(ngModel)]="campForm.prefix" name="prefix"
                       placeholder="e.g. HF" maxlength="10" required style="text-transform: uppercase;">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Location *</label>
                <input type="text" class="form-control" [(ngModel)]="campForm.location" name="location"
                       placeholder="Venue address" required>
              </div>
              <div class="form-group">
                <label class="form-label">Organization</label>
                <input type="text" class="form-control" [(ngModel)]="campForm.organization" name="organization"
                       placeholder="Organizing body">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Start Date *</label>
                <input type="date" class="form-control" [(ngModel)]="campForm.start_date" name="start_date" [min]="minDate" required>
              </div>
              <div class="form-group">
                <label class="form-label">End Date *</label>
                <input type="date" class="form-control" [(ngModel)]="campForm.end_date" name="end_date" [min]="campForm.start_date || minDate" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Contact Info</label>
              <input type="text" class="form-control" [(ngModel)]="campForm.contact_info" name="contact_info"
                     placeholder="Phone or email for camp coordination">
            </div>

            <div *ngIf="formError" class="error-msg">{{ formError }}</div>

            <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem;">
              <button type="submit" class="btn btn-primary" [disabled]="saving">
                {{ saving ? 'Saving...' : (editingCamp ? 'Update Camp' : 'Create Camp') }}
              </button>
              <button type="button" class="btn btn-outline" (click)="cancelEdit()">Cancel</button>
            </div>
          </form>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="loading-overlay">
          <div class="spinner"></div>
          <span>Loading camps...</span>
        </div>

        <!-- Camp List -->
        <div *ngIf="!loading" class="camps-grid">
          <div class="card camp-card" *ngFor="let camp of camps">
            <div class="camp-card-header">
              <div>
                <h3 class="camp-name">{{ camp.name }}</h3>
                <span class="camp-prefix">{{ camp.prefix }}</span>
              </div>
              <span class="badge" [ngClass]="{
                'badge-success': camp.status === 'active',
                'badge-warning': camp.status === 'completed',
                'badge-danger': camp.status === 'cancelled'
              }">{{ camp.status }}</span>
            </div>

            <div class="camp-details">
              <div class="camp-detail-row">
                <span class="detail-icon">📍</span>
                <span>{{ camp.location }}</span>
              </div>
              <div class="camp-detail-row" *ngIf="camp.organization">
                <span class="detail-icon">🏢</span>
                <span>{{ camp.organization }}</span>
              </div>
              <div class="camp-detail-row">
                <span class="detail-icon">📅</span>
                <span>{{ formatDate(camp.start_date) }} — {{ formatDate(camp.end_date) }}</span>
              </div>
              <div class="camp-detail-row" *ngIf="camp.contact_info">
                <span class="detail-icon">📞</span>
                <span>{{ camp.contact_info }}</span>
              </div>
            </div>

            <div class="camp-actions">
              <button class="btn btn-primary btn-sm" (click)="router.navigate(['/queue', camp.id])">
                📋 Queue
              </button>
              <button class="btn btn-accent btn-sm" (click)="openRegistration(camp.id)">
                ➕ Register
              </button>
              <button class="btn btn-outline btn-sm" (click)="showQR(camp)">
                📱 QR Code
              </button>
              <button class="btn btn-outline btn-sm" (click)="copyRegLink(camp.id)">
                🔗 Copy Link
              </button>
              <button class="btn btn-outline btn-sm" (click)="editCamp(camp)"
                      *ngIf="auth.hasRole('camp_admin', 'system_admin')">
                ✏️ Edit
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="!loading && camps.length === 0" class="card" style="text-align: center; padding: 3rem;">
          <ng-container *ngIf="auth.hasRole('camp_admin', 'system_admin'); else noCamps">
            <h2>No Camps Yet</h2>
            <p style="color: var(--text-secondary); margin: 1rem 0;">Create your first dental screening camp to get started.</p>
            <button class="btn btn-primary btn-lg" (click)="showCreateForm = true">🏕️ Create Your First Camp</button>
          </ng-container>
          <ng-template #noCamps>
            <h2>No Camps Available</h2>
            <p style="color: var(--text-secondary); margin: 1rem 0;">There are currently no active dental screening camps.</p>
          </ng-template>
        </div>

        <!-- QR Code Modal -->
        <div class="qr-overlay" *ngIf="qrData" (click)="qrData = null">
          <div class="qr-modal" (click)="$event.stopPropagation()">
            <button class="qr-close" (click)="qrData = null">✕</button>
            <div class="qr-header">
              <div class="qr-icon">🦷</div>
              <h2>Scan to Register</h2>
              <p>{{ qrData.camp_name }}</p>
            </div>
            <div class="qr-image-wrap">
              <img [src]="qrData.qr_code" alt="QR Code for registration" class="qr-image">
            </div>
            <p class="qr-url">{{ qrData.registration_url }}</p>
            <div class="qr-actions">
              <button class="btn btn-primary" (click)="downloadQR()">⬇️ Download QR</button>
              <button class="btn btn-outline" (click)="printQR()">🖨️ Print</button>
            </div>
          </div>
        </div>

        <!-- Toast -->
        <div class="toast toast-success" *ngIf="toast" @fadeIn>{{ toast }}</div>
      </div>
    </div>
  `,
  styles: [`
    .form-card { margin-bottom: 1.5rem; }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
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

    .camps-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 1.25rem;
    }

    .camp-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .camp-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .camp-name {
      font-size: 1.15rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }

    .camp-prefix {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      background: rgba(13, 148, 136, 0.15);
      color: var(--primary-light);
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .camp-details {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .camp-detail-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.88rem;
      color: var(--text-secondary);
    }

    .detail-icon { font-size: 0.9rem; min-width: 20px; text-align: center; }

    .camp-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border);
    }

    /* QR Modal */
    .qr-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: fadeIn 0.2s ease;
    }
    .qr-modal {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 2.5rem;
      max-width: 440px;
      width: 100%;
      text-align: center;
      position: relative;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
    }
    .qr-close {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-close:hover { background: var(--coral); color: white; border-color: var(--coral); }
    .qr-header { margin-bottom: 1.5rem; }
    .qr-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .qr-header h2 {
      font-size: 1.4rem;
      background: linear-gradient(135deg, #14b8a6, #f97316);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .qr-header p { color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem; }
    .qr-image-wrap {
      background: white;
      border-radius: 16px;
      padding: 1rem;
      display: inline-block;
      margin-bottom: 1rem;
    }
    .qr-image { width: 280px; height: 280px; display: block; }
    .qr-url {
      font-size: 0.75rem;
      color: var(--text-muted);
      word-break: break-all;
      margin-bottom: 1.25rem;
    }
    .qr-actions { display: flex; gap: 0.75rem; justify-content: center; }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @media (max-width: 768px) {
      .form-row { grid-template-columns: 1fr; }
      .camps-grid { grid-template-columns: 1fr; }
      .qr-image { width: 220px; height: 220px; }
      .qr-modal { padding: 1.5rem; }
    }
  `]
})
export class CampsComponent implements OnInit {
  camps: any[] = [];
  loading = false;
  saving = false;
  showCreateForm = false;
  editingCamp: any = null;
  formError = '';
  toast = '';
  qrData: any = null;
  qrLoading = false;
  minDate = new Date().toISOString().split('T')[0];

  campForm: any = {
    name: '', prefix: '', location: '', organization: '',
    start_date: '', end_date: '', contact_info: ''
  };

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
    this.loading = true;
    this.api.getCamps().subscribe({
      next: (res) => {
        this.camps = res.camps;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load camps', err);
        this.loading = false;
      }
    });
  }

  saveCamp(): void {
    if (!this.campForm.name || !this.campForm.prefix || !this.campForm.location
      || !this.campForm.start_date || !this.campForm.end_date) {
      this.formError = 'Please fill in all required fields.';
      return;
    }

    const start = new Date(this.campForm.start_date);
    const end = new Date(this.campForm.end_date);

    // Only prevent past dates for completely new camps
    if (!this.editingCamp && this.campForm.start_date < this.minDate) {
      this.formError = 'Start Date must be today or in the future.';
      return;
    }

    if (end < start) {
      this.formError = 'End Date cannot be earlier than Start Date.';
      return;
    }

    this.formError = '';
    this.saving = true;

    const obs = this.editingCamp
      ? this.api.updateCamp(this.editingCamp.id, this.campForm)
      : this.api.createCamp(this.campForm);

    obs.subscribe({
      next: () => {
        this.saving = false;
        this.showCreateForm = false;
        this.editingCamp = null;
        this.resetForm();
        this.loadCamps();
        this.showToast(this.editingCamp ? 'Camp updated!' : 'Camp created successfully!');
      },
      error: (err) => {
        this.saving = false;
        this.formError = err.error?.error || 'Failed to save camp.';
      }
    });
  }

  editCamp(camp: any): void {
    this.editingCamp = camp;
    this.campForm = {
      name: camp.name,
      prefix: camp.prefix,
      location: camp.location,
      organization: camp.organization || '',
      start_date: camp.start_date ? camp.start_date.substring(0, 10) : '',
      end_date: camp.end_date ? camp.end_date.substring(0, 10) : '',
      contact_info: camp.contact_info || '',
    };
    this.showCreateForm = true;
  }

  cancelEdit(): void {
    this.showCreateForm = false;
    this.editingCamp = null;
    this.resetForm();
  }

  resetForm(): void {
    this.campForm = {
      name: '', prefix: '', location: '', organization: '',
      start_date: '', end_date: '', contact_info: ''
    };
    this.formError = '';
  }

  openRegistration(campId: string): void {
    window.open(`/register/${campId}`, '_blank');
  }

  copyRegLink(campId: string): void {
    const link = `${window.location.origin}/register/${campId}`;
    navigator.clipboard.writeText(link);
    this.showToast('Registration link copied!');
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  showToast(msg: string): void {
    this.toast = msg;
    setTimeout(() => { this.toast = ''; }, 3000);
  }

  showQR(camp: any): void {
    this.qrLoading = true;
    this.api.getCampQR(camp.id).subscribe({
      next: (res) => {
        this.qrData = res;
        this.qrLoading = false;
      },
      error: () => {
        this.qrLoading = false;
        this.showToast('Failed to generate QR code');
      }
    });
  }

  downloadQR(): void {
    if (!this.qrData) return;
    const link = document.createElement('a');
    link.href = this.qrData.qr_code;
    link.download = `QR_${this.qrData.camp_prefix}_registration.png`;
    link.click();
  }

  printQR(): void {
    if (!this.qrData) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
                <html>
                <head><title>QR Code - ${this.qrData.camp_name}</title>
                <style>
                  body { font-family: Arial, sans-serif; text-align: center; padding: 2rem; }
                  h1 { font-size: 1.8rem; margin-bottom: 0.25rem; }
                  p { color: #666; margin-bottom: 1.5rem; }
                  img { width: 350px; height: 350px; }
                  .url { font-size: 0.8rem; color: #999; margin-top: 1rem; word-break: break-all; }
                  .footer { margin-top: 2rem; font-size: 0.75rem; color: #aaa; }
                </style></head>
                <body>
                  <h1>🦷 Scan to Register</h1>
                  <p>${this.qrData.camp_name}</p>
                  <img src="${this.qrData.qr_code}" />
                  <div class="url">${this.qrData.registration_url}</div>
                  <div class="footer">DentalCamp Management System</div>
                </body></html>
            `);
      printWindow.document.close();
      printWindow.print();
    }
  }
}
