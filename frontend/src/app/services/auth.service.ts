import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    camp_ids: string[];
    phone?: string;
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

    constructor(private http: HttpClient, private router: Router) {
        // On app startup, verify stored session is still valid
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

    get isLoggedIn(): boolean {
        return !!this.token && !this.isTokenExpired();
    }

    /**
     * Decode JWT payload and check if the token has expired.
     * Returns true if expired or invalid.
     */
    isTokenExpired(): boolean {
        const token = localStorage.getItem('dental_token');
        if (!token) return true;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            // exp is in seconds, Date.now() is in milliseconds
            const expiryMs = payload.exp * 1000;
            return Date.now() >= expiryMs;
        } catch {
            // If token can't be decoded, treat it as expired
            return true;
        }
    }

    login(email: string, password: string): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
            .pipe(tap(res => {
                localStorage.setItem('dental_token', res.token);
                localStorage.setItem('dental_user', JSON.stringify(res.user));
                this.currentUserSubject.next(res.user);
            }));
    }

    logout(): void {
        localStorage.removeItem('dental_token');
        localStorage.removeItem('dental_user');
        localStorage.removeItem('dental_active_camp');
        this.currentUserSubject.next(null);
    }

    /**
     * Called by the interceptor when a 401 is received.
     * Clears session and redirects to login.
     */
    handleUnauthorized(): void {
        this.logout();
        this.router.navigate(['/login']);
    }

    hasRole(...roles: string[]): boolean {
        return this.currentUser ? roles.includes(this.currentUser.role) : false;
    }
}
