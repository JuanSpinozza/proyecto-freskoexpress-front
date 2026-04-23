import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Usuario } from '../models';

interface LoginResponse {
  token: string;
  tipo: string;
  idUsuario: number;
  nombre: string;
  correo?: string;
  rol: string;
}

interface RegisterRequest {
  nombre: string;
  correo: string;
  contrasena: string;
  rol: string;
  licencia: string;
  tipoLicencia: string;
}

interface RegisterResponse {
  idUsuario: number;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
  fechaCreacion: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  currentUser = signal<Usuario | null>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          this.currentUser.set(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem('user');
        }
      }
    }
  }

  login(correo: string, contrasena: string): Observable<Usuario> {
    return this.http
      .post<LoginResponse>(
        `${environment.apiUrl}/api/v1/auth/login`,
        { correo, contrasena }
      )
      .pipe(
        map((response) => {
          const normalizedRole = (response.rol ?? '').toLowerCase();

          const user: Usuario = {
            idUsuario: response.idUsuario,
            nombre: response.nombre,
            // Backend can omit correo in login payload; fallback to submitted email.
            correo: response.correo ?? correo,
            rol: normalizedRole,
            activo: true,
            fechaCreacion: '',
          };
          return { token: response.token, user };
        }),
        tap(({ token, user }) => {
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
          }
          this.currentUser.set(user);
        }),
        map(({ user }) => user),
        catchError((error) => throwError(() => error))
      );
  }

  register(payload: RegisterRequest): Observable<Usuario> {
    return this.http.post<RegisterResponse>(`${environment.apiUrl}/api/v1/auth/register`, payload).pipe(
      map((response) => ({
        idUsuario: response.idUsuario,
        nombre: response.nombre,
        correo: response.correo,
        rol: response.rol,
        activo: response.activo,
        fechaCreacion: response.fechaCreacion,
      })),
      catchError((error) => throwError(() => error))
    );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  /**
   * Returns the dashboard route based on user role
   */
  getDashboardRoute(): string {
    const user = this.currentUser();
    if (!user) return '/login';
    return `/dashboard/${user.rol}`;
  }
}
