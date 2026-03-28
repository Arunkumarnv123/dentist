import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    role: string;
    camp_ids?: string[];
    patient_id?: string;
    camp_id?: string;
}

export interface LoginResponse {
    token: string;
    user: User;
    expiresIn: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private currentUserSubject = new BehaviorSubject<User | null>(null);
    currentUser$ = this.currentUserSubject.asObservable();

    constructor(private http: HttpClient) {
        // On startup, clear stale/expired tokens automatically
        if (this.isTokenExpired()) {
            this.logout();
        } else {
            const stored = localStorage.getItem('dental_user');
            if (stored) {
                try {
                    this.currentUserSubject.next(JSON.parse(stored));
                } catch {
                    this.logout();
                }
            }
        }
    }

    get currentUser(): User | null {
        return this.currentUserSubject.value;
    }

    get token(): string | null {
        return localStorage.getItem('dental_token');
    }

    /** Decode JWT payload and check if token is expired. */
    isTokenExpired(): boolean {
        const token = localStorage.getItem('dental_token');
        if (!token) return true;
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return true;
            const payload = JSON.parse(atob(parts[1]));
            if (!payload.exp) return false;
            return Date.now() >= payload.exp * 1000;
        } catch {
            return true;
        }
    }

    get isLoggedIn(): boolean {
        return !!this.token && !this.isTokenExpired();
    }

    /** Staff login: email + password */
    login(email: string, password: string): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { identifier: email, credential: password })
            .pipe(tap(res => {
                localStorage.setItem('dental_token', res.token);
                localStorage.setItem('dental_user', JSON.stringify(res.user));
                this.currentUserSubject.next(res.user);
            }));
    }

    /** Patient login: phone + passkey */
    loginWithPasskey(phone: string, passkey: string): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { identifier: phone, credential: passkey })
            .pipe(tap(res => {
                localStorage.setItem('dental_token', res.token);
                localStorage.setItem('dental_user', JSON.stringify(res.user));
                this.currentUserSubject.next(res.user);
            }));
    }

    logout(): void {
        localStorage.removeItem('dental_token');
        localStorage.removeItem('dental_user');
        this.currentUserSubject.next(null);
    }

    hasRole(...roles: string[]): boolean {
        return this.currentUser ? roles.includes(this.currentUser.role) : false;
    }
}
