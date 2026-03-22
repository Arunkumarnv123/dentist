import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-book-appointment',
    template: `
    <div class="main-content fade-in">
      <div class="container" style="max-width: 900px;">
        <div class="page-header">
          <div>
            <h1 class="page-title">Book Appointment</h1>
            <p class="page-subtitle">Select a doctor and pick your time slot</p>
          </div>
          <button class="btn btn-outline btn-sm" (click)="router.navigate(['/patient-portal'])">
            ← My Appointments
          </button>
        </div>

        <!-- Step 1: Select Camp -->
        <div class="card" *ngIf="step === 1">
          <h3 style="margin-bottom: 1rem;">🏕️ Select Camp</h3>
          <div *ngIf="loadingCamps" class="loading-overlay"><div class="spinner"></div></div>
          <div class="camp-select-grid" *ngIf="!loadingCamps">
            <div class="select-card" *ngFor="let camp of camps" (click)="selectCamp(camp)"
                 [class.selected]="selectedCamp?.id === camp.id">
              <h4>{{ camp.name }}</h4>
              <p>📍 {{ camp.location }}</p>
              <span class="badge badge-success">{{ camp.status }}</span>
            </div>
          </div>
        </div>

        <!-- Step 2: Select Doctor & Slot -->
        <div *ngIf="step === 2">
          <div class="card" style="margin-bottom: 1.25rem; padding: 1rem 1.25rem;">
            <span style="color: var(--text-muted);">Camp:</span>
            <strong> {{ selectedCamp?.name }}</strong>
            <button class="btn btn-outline btn-sm" style="margin-left: 1rem;" (click)="step = 1">Change</button>
          </div>

          <div *ngIf="loadingDoctors" class="loading-overlay"><div class="spinner"></div></div>

          <!-- Walk-in option -->
          <div class="card walk-in-card" *ngIf="!loadingDoctors && doctors.length > 0">
            <div>
              <h4 style="margin-bottom: 0.25rem;">⚡ Walk-in Token</h4>
              <p style="color: var(--text-secondary); font-size: 0.85rem;">Don't want to pick a time? Get a token and wait in the queue.</p>
            </div>
            <div>
              <select class="form-control" [(ngModel)]="walkInDoctorId"
                      style="min-width: 200px; margin-bottom: 0.5rem;">
                <option value="">Select Doctor</option>
                <option *ngFor="let d of doctors" [value]="d.doctor.id">{{ d.doctor.name }}</option>
              </select>
              <button class="btn btn-accent" (click)="getWalkIn()" [disabled]="!walkInDoctorId || booking">
                {{ booking ? 'Getting Token...' : 'Get Walk-in Token' }}
              </button>
            </div>
          </div>

          <!-- Doctor Cards -->
          <div *ngIf="!loadingDoctors">
            <div class="card doctor-card" *ngFor="let doc of doctors">
              <div class="doctor-header">
                <div>
                  <h3 class="doctor-name">🩺 {{ doc.doctor.name }}</h3>
                  <p class="doctor-info">{{ doc.doctor.email }}</p>
                </div>
              </div>

              <div *ngFor="let dateEntry of getDateEntries(doc.dates)">
                <h4 class="date-label">📅 {{ formatDate(dateEntry[0]) }}</h4>
                <div class="slots-grid">
                  <button class="slot-btn" *ngFor="let slot of dateEntry[1]"
                          [class.booked]="slot.booked"
                          [class.selected]="selectedSlot?.start === slot.start && selectedDoctor?.id === doc.doctor.id && selectedDate === dateEntry[0]"
                          [disabled]="slot.booked"
                          (click)="selectSlot(doc, dateEntry[0], slot)">
                    {{ slot.start }}
                    <span class="slot-status" *ngIf="slot.booked">Booked</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- No Doctors -->
          <div *ngIf="!loadingDoctors && doctors.length === 0" class="card" style="text-align: center; padding: 2rem;">
            <p style="color: var(--text-secondary);">No doctors have set their availability for this camp yet.</p>
          </div>

          <!-- Confirm Booking -->
          <div class="card confirm-card" *ngIf="selectedSlot">
            <h3>✅ Confirm Booking</h3>
            <div class="confirm-grid">
              <div><span class="cl">Doctor</span><strong>{{ selectedDoctor?.name }}</strong></div>
              <div><span class="cl">Date</span><strong>{{ formatDate(selectedDate || '') }}</strong></div>
              <div><span class="cl">Time</span><strong>{{ selectedSlot.start }} — {{ selectedSlot.end }}</strong></div>
            </div>
            <div *ngIf="error" class="error-msg" style="margin-top: 1rem;">{{ error }}</div>
            <button class="btn btn-primary btn-lg" style="width: 100%; margin-top: 1rem;"
                    (click)="confirmBooking()" [disabled]="booking">
              {{ booking ? 'Booking...' : '🦷 Confirm Appointment' }}
            </button>
          </div>
        </div>

        <!-- Step 3: Success -->
        <div *ngIf="step === 3" class="card success-card fade-in">
          <div style="font-size: 3.5rem; margin-bottom: 0.5rem;">🎫</div>
          <h2>Appointment Booked!</h2>
          <div class="token-display">
            <span class="token-label">Your Token</span>
            <span class="token-number">#{{ bookedResult?.token_number }}</span>
          </div>
          <div class="confirm-grid" style="margin-top: 1.25rem;">
            <div><span class="cl">Wait Time</span><strong>~{{ bookedResult?.estimated_wait_minutes || 0 }} min</strong></div>
            <div><span class="cl">Type</span><strong>{{ bookedResult?.appointment?.type | titlecase }}</strong></div>
          </div>
          <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary" (click)="router.navigate(['/patient-portal'])">📋 My Appointments</button>
            <button class="btn btn-outline" (click)="reset()">🔄 Book Another</button>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .camp-select-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .select-card {
      background: var(--bg-tertiary); border: 2px solid var(--border); border-radius: 12px;
      padding: 1.25rem; cursor: pointer; transition: all 0.2s;
    }
    .select-card:hover { border-color: var(--primary); transform: translateY(-2px); }
    .select-card.selected { border-color: var(--primary); background: rgba(13, 148, 136, 0.1); }
    .select-card h4 { margin-bottom: 0.35rem; }
    .select-card p { color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem; }

    .walk-in-card {
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      margin-bottom: 1.25rem; flex-wrap: wrap;
    }

    .doctor-card { margin-bottom: 1.25rem; }
    .doctor-header { display: flex; justify-content: space-between; margin-bottom: 1rem; }
    .doctor-name { font-size: 1.1rem; font-weight: 700; }
    .doctor-info { color: var(--text-secondary); font-size: 0.8rem; }

    .date-label {
      font-size: 0.9rem; font-weight: 600; margin: 1rem 0 0.5rem;
      color: var(--text-secondary);
    }

    .slots-grid { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .slot-btn {
      background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 8px;
      padding: 0.5rem 0.85rem; color: var(--text-primary); cursor: pointer;
      font-size: 0.85rem; font-weight: 600; transition: all 0.2s; position: relative;
    }
    .slot-btn:hover:not(:disabled) { border-color: var(--primary); background: rgba(13, 148, 136, 0.1); }
    .slot-btn.selected { border-color: var(--primary); background: rgba(13, 148, 136, 0.2); color: var(--primary-light); }
    .slot-btn.booked { opacity: 0.4; cursor: not-allowed; text-decoration: line-through; }
    .slot-status { display: block; font-size: 0.6rem; color: var(--coral); font-weight: 400; }

    .confirm-card { margin-top: 1.25rem; background: rgba(13, 148, 136, 0.05); border-color: rgba(13, 148, 136, 0.3); }
    .confirm-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; margin-top: 0.75rem; }
    .cl { display: block; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

    .success-card { text-align: center; padding: 2.5rem; margin-top: 1rem; }
    .success-card h2 { color: var(--success); margin-bottom: 1rem; }
    .token-display { display: inline-flex; flex-direction: column; align-items: center;
      background: linear-gradient(135deg, rgba(13, 148, 136, 0.2), rgba(249, 115, 22, 0.2));
      border-radius: 16px; padding: 1.25rem 2.5rem;
    }
    .token-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; }
    .token-number { font-size: 3rem; font-weight: 900; color: var(--primary-light); }

    .error-msg {
      background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px; padding: 0.75rem; color: #f87171; font-size: 0.85rem; text-align: center;
    }

    @media (max-width: 600px) {
      .walk-in-card { flex-direction: column; align-items: flex-start; }
      .confirm-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class BookAppointmentComponent implements OnInit {
    step = 1;
    camps: any[] = [];
    doctors: any[] = [];
    selectedCamp: any = null;
    selectedDoctor: any = null;
    selectedDate: string | null = null;
    selectedSlot: any = null;
    walkInDoctorId = '';
    loadingCamps = false;
    loadingDoctors = false;
    booking = false;
    error = '';
    bookedResult: any = null;
    patientId = '';

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
        this.loadCamps();
        const qCamp = this.route.snapshot.queryParams['campId'];
        if (qCamp) {
            this.selectCampById(qCamp);
        }
    }

    loadCamps(): void {
        this.loadingCamps = true;
        this.api.getCamps().subscribe({
            next: (res) => { this.camps = res.camps; this.loadingCamps = false; },
            error: () => { this.loadingCamps = false; }
        });
    }

    selectCamp(camp: any): void {
        this.selectedCamp = camp;
        this.step = 2;
        this.loadDoctors();
    }

    selectCampById(campId: string): void {
        this.api.getCamp(campId).subscribe({
            next: (res) => { this.selectedCamp = res.camp; this.step = 2; this.loadDoctors(); },
            error: () => { }
        });
    }

    loadDoctors(): void {
        this.loadingDoctors = true;
        this.api.getDoctorAvailability(this.selectedCamp.id).subscribe({
            next: (res) => { this.doctors = res.doctors; this.loadingDoctors = false; },
            error: () => { this.loadingDoctors = false; }
        });
    }

    selectSlot(doc: any, date: string, slot: any): void {
        this.selectedDoctor = doc.doctor;
        this.selectedDate = date;
        this.selectedSlot = slot;
        this.error = '';
    }

    getDateEntries(dates: any): any[] {
        return Object.entries(dates || {});
    }

    confirmBooking(): void {
        if (!this.selectedSlot || !this.selectedDoctor || !this.selectedDate) return;
        this.error = '';
        this.booking = true;

        // First need to register the patient in the camp, then book
        const patientData = {
            full_name: this.auth.currentUser?.name,
            age: 25, // default — ideally from user profile
            gender: 'other',
            address: 'Self',
            city: 'Self',
            phone: this.auth.currentUser?.phone || '',
        };

        this.api.registerPatient(this.selectedCamp.id, patientData).subscribe({
            next: (regRes) => {
                const pid = regRes.patient?.id || regRes.existing_patient?.id;
                this.bookSlot(pid);
            },
            error: (err) => {
                // If duplicate, try to get patient id from error
                if (err.status === 409 && err.error?.existing_patient) {
                    this.bookSlot(err.error.existing_patient.id);
                } else {
                    this.booking = false;
                    this.error = err.error?.error || 'Failed to register patient';
                }
            }
        });
    }

    bookSlot(patientId: string): void {
        this.api.bookAppointment({
            camp_id: this.selectedCamp.id,
            doctor_id: this.selectedDoctor.id,
            patient_id: patientId,
            appointment_date: this.selectedDate,
            start_time: this.selectedSlot.start,
        }).subscribe({
            next: (res) => {
                this.booking = false;
                this.bookedResult = res;
                this.step = 3;
            },
            error: (err) => {
                this.booking = false;
                this.error = err.error?.error || 'Failed to book appointment';
            }
        });
    }

    getWalkIn(): void {
        this.booking = true;
        this.error = '';

        const patientData = {
            full_name: this.auth.currentUser?.name,
            age: 25,
            gender: 'other',
            address: 'Self',
            city: 'Self',
        };

        this.api.registerPatient(this.selectedCamp.id, patientData).subscribe({
            next: (regRes) => {
                const pid = regRes.patient?.id || regRes.existing_patient?.id;
                this.doWalkIn(pid);
            },
            error: (err) => {
                if (err.status === 409 && err.error?.existing_patient) {
                    this.doWalkIn(err.error.existing_patient.id);
                } else {
                    this.booking = false;
                    this.error = err.error?.error || 'Failed';
                }
            }
        });
    }

    doWalkIn(patientId: string): void {
        this.api.walkInAppointment({
            camp_id: this.selectedCamp.id,
            doctor_id: this.walkInDoctorId,
            patient_id: patientId,
        }).subscribe({
            next: (res) => {
                this.booking = false;
                this.bookedResult = res;
                this.step = 3;
            },
            error: (err) => {
                this.booking = false;
                this.error = err.error?.error || 'Failed to get walk-in token';
            }
        });
    }

    formatDate(d: string): string {
        if (!d) return '';
        return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }

    reset(): void {
        this.step = 2;
        this.selectedSlot = null;
        this.selectedDoctor = null;
        this.selectedDate = null;
        this.bookedResult = null;
        this.error = '';
        this.loadDoctors();
    }
}
