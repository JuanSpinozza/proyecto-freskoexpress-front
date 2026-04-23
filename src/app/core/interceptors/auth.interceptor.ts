import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  const token = isPlatformBrowser(platformId) ? localStorage.getItem('token') : null;

  // Clone request and add Authorization header if token exists
  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Clear localStorage and redirect to login on 401
        if (isPlatformBrowser(platformId)) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};