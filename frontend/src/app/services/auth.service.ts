import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
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

    constructor(private http: HttpClient) {
        const stored = localStorage.getItem('dental_user');
        if (stored) {
            this.currentUserSubject.next(JSON.parse(stored));
        }
    }

    get currentUser(): User | null {
        return this.currentUserSubject.value;
    }

    get token(): string | null {
        return localStorage.getItem('dental_token');
    }

    get isLoggedIn(): boolean {
        return !!this.token;
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
        this.currentUserSubject.next(null);
    }

    hasRole(...roles: string[]): boolean {
        return this.currentUser ? roles.includes(this.currentUser.role) : false;
    }
}
