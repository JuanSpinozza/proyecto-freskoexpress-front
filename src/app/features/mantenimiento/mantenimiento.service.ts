import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Mantenimiento, Vehiculo } from '../../core/models';
import { environment } from '../../../environments/environment';

export interface MantenimientoCreatePayload {
  idVehiculo: number;
  tipo: string;
  descripcion: string;
  kmEnServicio: number;
  fechaServicio: string;
  proxKm?: number;
  proxFecha?: string;
}

@Injectable({
  providedIn: 'root',
})
export class MantenimientoService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/v1/mantenimientos`;

  createMantenimiento(payload: MantenimientoCreatePayload): Observable<Mantenimiento> {
    return this.http.post<Mantenimiento>(this.baseUrl, payload);
  }

  getMantenimientosVehiculo(idVehiculo: number): Observable<Mantenimiento[]> {
    return this.http.get<Mantenimiento[]>(`${this.baseUrl}/vehiculo/${idVehiculo}`);
  }

  getVehiculos(): Observable<Vehiculo[]> {
    return this.http.get<Vehiculo[]>(`${environment.apiUrl}/api/v1/vehiculos`);
  }
}