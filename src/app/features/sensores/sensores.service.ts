import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Alerta, Vehiculo, Ruta } from '../../core/models';
import { environment } from '../../../environments/environment';

export interface LecturaPayload {
  idVehiculo: number;
  idRuta?: number;
  temperaturaC: number;
  humedadPct: number;
}

@Injectable({
  providedIn: 'root',
})
export class SensoresService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/v1/sensores`;

  getAlertas(): Observable<Alerta[]> {
    return this.http.get<Alerta[]>(`${this.baseUrl}/alertas`);
  }

  reconocerAlerta(id: number): Observable<Alerta> {
    return this.http.patch<Alerta>(`${this.baseUrl}/alertas/${id}/reconocer`, {});
  }

  getAlertasVehiculo(idVehiculo: number): Observable<Alerta[]> {
    return this.http.get<Alerta[]>(`${this.baseUrl}/alertas/vehiculo/${idVehiculo}`);
  }

  postLectura(payload: LecturaPayload): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/lectura`, payload);
  }

  getVehiculos(): Observable<Vehiculo[]> {
    return this.http.get<Vehiculo[]>(`${environment.apiUrl}/api/v1/vehiculos`);
  }

  getRutas(fecha: string): Observable<Ruta[]> {
    const params = new HttpParams().set('fecha', fecha);
    return this.http.get<Ruta[]>(`${environment.apiUrl}/api/v1/rutas`, { params });
  }
}