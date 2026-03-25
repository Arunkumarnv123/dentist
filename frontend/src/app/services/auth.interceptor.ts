import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private auth: AuthService) {}

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Check if token is expired before making request
        if (this.auth.token && this.auth.isTokenExpired()) {
            this.auth.logoutAndRedirect();
            return throwError(() => new Error('Token expired'));
        }

        let request = req;
        const token = this.auth.token;
        if (token) {
            request = req.clone({
                headers: req.headers.set('Authorization', `Bearer ${token}`)
            });
        }

        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.status === 401) {
                    const code = error.error?.code;
                    if (code === 'TOKEN_EXPIRED' || code === 'UNAUTHORIZED') {
                        this.auth.logoutAndRedirect();
                    }
                }
                return throwError(() => error);
            })
        );
    }
}
