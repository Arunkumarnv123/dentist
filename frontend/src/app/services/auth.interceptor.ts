import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private auth: AuthService, private router: Router) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const token = localStorage.getItem('dental_token');
        let cloned = req;

        if (token) {
            cloned = req.clone({
                headers: req.headers.set('Authorization', `Bearer ${token}`)
            });
        }

        return next.handle(cloned).pipe(
            catchError((error: HttpErrorResponse) => {
                // Auto-logout on token expiry (backend returns 401 with TOKEN_EXPIRED)
                if (error.status === 401 && error.error?.code === 'TOKEN_EXPIRED') {
                    this.auth.logout();
                    this.router.navigate(['/login']);
                }
                return throwError(() => error);
            })
        );
    }
}
