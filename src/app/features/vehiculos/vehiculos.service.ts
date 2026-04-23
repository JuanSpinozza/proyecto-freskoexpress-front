import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Vehiculo } from '../../core/models';
import { environment } from '../../../environments/environment';

export interface VehiculoCreatePayload {
  placa: string;
  marca?: string;
  modelo?: string;
  capacidadKg?: number;
  kilometraje?: number;
  disponible?: boolean;
}

export interface VehiculoKilometrajePayload {
  kilometraje: number;
}

export interface VehiculoDisponibilidadPayload {
  disponible: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class VehiculosService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/v1/vehiculos`;

  getVehiculos(): Observable<Vehiculo[]> {
    return this.http.get<Vehiculo[]>(this.baseUrl);
  }

  getVehiculoById(idVehiculo: number): Observable<Vehiculo> {
    return this.http.get<Vehiculo>(`${this.baseUrl}/${idVehiculo}`);
  }

  createVehiculo(payload: VehiculoCreatePayload): Observable<Vehiculo> {
    return this.http.post<Vehiculo>(this.baseUrl, payload);
  }

  updateKilometraje(idVehiculo: number, payload: VehiculoKilometrajePayload): Observable<Vehiculo> {
    return this.http.patch<Vehiculo>(`${this.baseUrl}/${idVehiculo}/kilometraje`, null, { params: { kmRecorridos: payload.kilometraje.toString() } });
  }

  updateDisponibilidad(idVehiculo: number, payload: VehiculoDisponibilidadPayload): Observable<Vehiculo> {
    return this.http.patch<Vehiculo>(`${this.baseUrl}/${idVehiculo}/disponibilidad`, null, { params: { disponible: payload.disponible.toString() } });
  }
}

