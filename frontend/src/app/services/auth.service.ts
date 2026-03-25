import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
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
    private tokenExpiryTimer: any;
    private tokenRefreshTimer: any;

    constructor(private http: HttpClient, private router: Router) {
        const stored = localStorage.getItem('dental_user');
        if (stored) {
            if (this.isTokenExpired()) {
                this.logout();
            } else {
                this.currentUserSubject.next(JSON.parse(stored));
                this.startExpiryTimer();
                this.scheduleTokenRefresh();
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
        if (!this.token) return false;
        if (this.isTokenExpired()) {
            this.logout();
            return false;
        }
        return true;
    }

    isTokenExpired(): boolean {
        const expiry = localStorage.getItem('dental_token_expiry');
        if (!expiry) return true;
        return Date.now() > parseInt(expiry, 10);
    }

    login(email: string, password: string): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
            .pipe(tap(res => {
                localStorage.setItem('dental_token', res.token);
                localStorage.setItem('dental_user', JSON.stringify(res.user));

                // Parse expiresIn (e.g. "8h", "1d", "30m") and store absolute expiry timestamp
                const expiryMs = this.parseExpiresIn(res.expiresIn || '8h');
                const expiryTimestamp = Date.now() + expiryMs;
                localStorage.setItem('dental_token_expiry', expiryTimestamp.toString());

                this.currentUserSubject.next(res.user);
                this.startExpiryTimer();
                this.scheduleTokenRefresh();
            }));
    }

    logout(): void {
        this.clearExpiryTimer();
        this.clearRefreshTimer();
        localStorage.removeItem('dental_token');
        localStorage.removeItem('dental_user');
        localStorage.removeItem('dental_token_expiry');
        this.currentUserSubject.next(null);
    }

    logoutAndRedirect(): void {
        this.logout();
        this.router.navigate(['/login']);
    }

    hasRole(...roles: string[]): boolean {
        return this.currentUser ? roles.includes(this.currentUser.role) : false;
    }

    /** Start a timer that auto-logs out when the token expires */
    startExpiryTimer(): void {
        this.clearExpiryTimer();
        const expiry = localStorage.getItem('dental_token_expiry');
        if (!expiry) return;

        const remaining = parseInt(expiry, 10) - Date.now();
        if (remaining <= 0) {
            this.logoutAndRedirect();
            return;
        }

        // Cap at 24 hours to avoid setTimeout overflow issues
        const delay = Math.min(remaining, 24 * 60 * 60 * 1000);
        this.tokenExpiryTimer = setTimeout(() => {
            this.logoutAndRedirect();
        }, delay);
    }

    private clearExpiryTimer(): void {
        if (this.tokenExpiryTimer) {
            clearTimeout(this.tokenExpiryTimer);
            this.tokenExpiryTimer = null;
        }
    }

    private clearRefreshTimer(): void {
        if (this.tokenRefreshTimer) {
            clearTimeout(this.tokenRefreshTimer);
            this.tokenRefreshTimer = null;
        }
    }

    /** Schedule a silent token refresh at 75% of the token's lifetime */
    scheduleTokenRefresh(): void {
        this.clearRefreshTimer();
        const expiry = localStorage.getItem('dental_token_expiry');
        if (!expiry) return;

        const expiryTime = parseInt(expiry, 10);
        const now = Date.now();
        const totalLifetime = expiryTime - now;
        if (totalLifetime <= 0) return;

        // Refresh at 75% of remaining lifetime
        const refreshDelay = Math.floor(totalLifetime * 0.75);

        this.tokenRefreshTimer = setTimeout(() => {
            this.refreshToken();
        }, refreshDelay);
    }

    /** Silently refresh the token using the backend refresh endpoint */
    private refreshToken(): void {
        this.http.post<{ token: string; expiresIn: string }>(`${environment.apiUrl}/auth/refresh`, {})
            .subscribe({
                next: (res) => {
                    localStorage.setItem('dental_token', res.token);
                    const expiryMs = this.parseExpiresIn(res.expiresIn || '8h');
                    const expiryTimestamp = Date.now() + expiryMs;
                    localStorage.setItem('dental_token_expiry', expiryTimestamp.toString());

                    this.clearExpiryTimer();
                    this.startExpiryTimer();
                    this.scheduleTokenRefresh();
                },
                error: () => {
                    // If refresh fails, the normal expiry logic will handle logout
                }
            });
    }

    /** Parse JWT expiresIn string like "8h", "1d", "30m" to milliseconds */
    private parseExpiresIn(expiresIn: string): number {
        const match = expiresIn.match(/^(\d+)(s|m|h|d)$/);
        if (!match) return 8 * 60 * 60 * 1000; // default 8h
        const value = parseInt(match[1], 10);
        switch (match[2]) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return 8 * 60 * 60 * 1000;
        }
    }
}
