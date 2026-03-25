import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private auth: AuthService) {}

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const token = localStorage.getItem('dental_token');
        let request = req;

        if (token) {
            request = req.clone({
                headers: req.headers.set('Authorization', `Bearer ${token}`)
            });
        }

        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                // If server responds with 401 (Unauthorized) or token is expired,
                // clear session and redirect to login
                if (error.status === 401) {
                    this.auth.handleUnauthorized();
                }
                return throwError(() => error);
            })
        );
    }
}
