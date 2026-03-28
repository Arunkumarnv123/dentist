import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './services/auth.interceptor';

import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { RegisterComponent } from './pages/register/register.component';
import { QueueComponent } from './pages/queue/queue.component';
import { ScreeningComponent } from './pages/screening/screening.component';
import { AdminComponent } from './pages/admin/admin.component';
import { CampsComponent } from './pages/camps/camps.component';
import { PatientRegisterComponent } from './pages/patient-register/patient-register.component';
import { BookAppointmentComponent } from './pages/book-appointment/book-appointment.component';
import { PatientPortalComponent } from './pages/patient-portal/patient-portal.component';
import { PatientStatusComponent } from './pages/patient-status/patient-status.component';
import { DentistRegisterComponent } from './pages/dentist-register/dentist-register.component';
import { PhoneOnlyDirective } from './directives/phone-only.directive';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,
    RegisterComponent,
    QueueComponent,
    ScreeningComponent,
    AdminComponent,
    CampsComponent,
    PatientRegisterComponent,
    BookAppointmentComponent,
    PatientPortalComponent,
    PatientStatusComponent,
    DentistRegisterComponent,
    PhoneOnlyDirective,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
