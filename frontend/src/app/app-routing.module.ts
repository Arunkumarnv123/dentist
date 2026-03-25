import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { RegisterComponent } from './pages/register/register.component';
import { QueueComponent } from './pages/queue/queue.component';
import { ScreeningComponent } from './pages/screening/screening.component';
import { AdminComponent } from './pages/admin/admin.component';
import { CampsComponent } from './pages/camps/camps.component';
import { PatientRegisterComponent } from './pages/patient-register/patient-register.component';
import { DentistRegisterComponent } from './pages/dentist-register/dentist-register.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { BookAppointmentComponent } from './pages/book-appointment/book-appointment.component';
import { PatientPortalComponent } from './pages/patient-portal/patient-portal.component';

import { PatientStatusComponent } from './pages/patient-status/patient-status.component';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'patient-register', component: PatientRegisterComponent },
  { path: 'dentist-register', component: DentistRegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'register/:campId', component: RegisterComponent },
  { path: 'status/:campId/:patientId', component: PatientStatusComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'queue/:campId', component: QueueComponent },
  { path: 'screening/:campId/:patientId', component: ScreeningComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'camps', component: CampsComponent },
  { path: 'book-appointment', component: BookAppointmentComponent },
  { path: 'patient-portal', component: PatientPortalComponent },
  { path: '**', redirectTo: '/login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
