import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
    public baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    // ── Camps ──
    getCamps(): Observable<any> {
        return this.http.get(`${this.baseUrl}/camps`);
    }

    getCamp(campId: string): Observable<any> {
        return this.http.get(`${this.baseUrl}/camps/${campId}`);
    }

    createCamp(data: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/camps`, data);
    }

    updateCamp(campId: string, data: any): Observable<any> {
        return this.http.put(`${this.baseUrl}/camps/${campId}`, data);
    }

    getCampQR(campId: string): Observable<any> {
        return this.http.get(`${this.baseUrl}/camps/${campId}/qr`);
    }

    // ── Patients ──
    registerPatient(campId: string, data: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/camps/${campId}/register`, data);
    }

    getPatients(campId: string, params: any = {}): Observable<any> {
        let httpParams = new HttpParams();
        Object.keys(params).forEach(key => {
            if (params[key]) httpParams = httpParams.set(key, params[key]);
        });
        return this.http.get(`${this.baseUrl}/camps/${campId}/patients`, { params: httpParams });
    }

    getPatient(campId: string, patientId: string): Observable<any> {
        return this.http.get(`${this.baseUrl}/camps/${campId}/patients/${patientId}`);
    }

    getPatientLiveStatus(campId: string, patientId: string): Observable<any> {
        return this.http.get(`${this.baseUrl}/camps/${campId}/status/${patientId}`);
    }

    // ── Queue ──
    getQueue(campId: string, params: any = {}): Observable<any> {
        let httpParams = new HttpParams();
        Object.keys(params).forEach(key => {
            if (params[key]) httpParams = httpParams.set(key, params[key]);
        });
        return this.http.get(`${this.baseUrl}/camps/${campId}/queue`, { params: httpParams });
    }

    lockPatient(campId: string, patientId: string, force = false): Observable<any> {
        return this.http.post(`${this.baseUrl}/camps/${campId}/queue/${patientId}/lock`, { force });
    }

    unlockPatient(campId: string, patientId: string): Observable<any> {
        return this.http.post(`${this.baseUrl}/camps/${campId}/queue/${patientId}/unlock`, {});
    }

    // ── Screenings ──
    saveScreening(campId: string, data: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/camps/${campId}/screenings`, data);
    }

    submitScreening(campId: string, screeningId: string): Observable<any> {
        return this.http.put(`${this.baseUrl}/camps/${campId}/screenings/${screeningId}/submit`, {});
    }

    getScreening(campId: string, screeningId: string): Observable<any> {
        return this.http.get(`${this.baseUrl}/camps/${campId}/screenings/${screeningId}`);
    }

    // ── Reports ──
    getReport(reportId: string): Observable<any> {
        return this.http.get(`${this.baseUrl}/reports/${reportId}`);
    }

    downloadReport(reportId: string): Observable<Blob> {
        return this.http.get(`${this.baseUrl}/reports/${reportId}/download`, { responseType: 'blob' });
    }

    regenerateReport(reportId: string): Observable<any> {
        return this.http.post(`${this.baseUrl}/reports/${reportId}/regenerate`, {});
    }

    // ── Analytics ──
    getAnalytics(campId: string): Observable<any> {
        return this.http.get(`${this.baseUrl}/analytics/camps/${campId}`);
    }

    // ── Exports ──
    generateExport(campId: string, format = 'csv'): Observable<any> {
        return this.http.post(`${this.baseUrl}/exports`, { camp_id: campId, format });
    }

    // ── Users ──
    getUsers(): Observable<any> {
        return this.http.get(`${this.baseUrl}/users`);
    }

    createUser(data: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/users`, data);
    }

    updateUser(userId: string, data: any): Observable<any> {
        return this.http.put(`${this.baseUrl}/users/${userId}`, data);
    }

    // ── Patient Auth ──
    registerPatientAccount(data: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/auth/register-patient`, data);
    }

    registerDentistAccount(data: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/auth/register-dentist`, data);
    }

    // ── Appointments ──
    getDoctorAvailability(campId: string): Observable<any> {
        return this.http.get(`${this.baseUrl}/appointments/doctors/${campId}`);
    }

    bookAppointment(data: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/appointments/book`, data);
    }

    walkInAppointment(data: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/appointments/walk-in`, data);
    }

    getMyAppointments(): Observable<any> {
        return this.http.get(`${this.baseUrl}/appointments/my`);
    }

    cancelAppointment(id: string, reason?: string): Observable<any> {
        return this.http.delete(`${this.baseUrl}/appointments/${id}/cancel`, { body: { reason } });
    }

    getLiveQueue(campId: string): Observable<any> {
        return this.http.get(`${this.baseUrl}/appointments/live/${campId}`);
    }

    startAppointment(id: string): Observable<any> {
        return this.http.put(`${this.baseUrl}/appointments/${id}/start`, {});
    }

    completeAppointment(id: string): Observable<any> {
        return this.http.put(`${this.baseUrl}/appointments/${id}/complete`, {});
    }

    extendAppointment(id: string, extraMinutes: number): Observable<any> {
        return this.http.put(`${this.baseUrl}/appointments/${id}/extend`, { extra_minutes: extraMinutes });
    }

    // ── Schedules ──
    createSchedule(data: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/schedules`, data);
    }

    getSchedules(campId: string): Observable<any> {
        return this.http.get(`${this.baseUrl}/schedules/${campId}`);
    }
}
