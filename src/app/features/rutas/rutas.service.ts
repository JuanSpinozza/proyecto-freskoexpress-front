import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Ruta, Pedido, Vehiculo } from '../../core/models';
import { environment } from '../../../environments/environment';

export interface RutaCreatePayload {
  idVehiculo: number;
  idConductor: number;
  fechaRuta: string;
  idsPedidos: number[];
}

export interface Conductor {
  idUsuario: number;
  nombre: string;
  correo: string;
}

@Injectable({
  providedIn: 'root',
})
export class RutasService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/v1/rutas`;

  getRutas(fecha: string): Observable<Ruta[]> {
    const params = new HttpParams().set('fecha', fecha);
    return this.http.get<Ruta[]>(this.baseUrl, { params });
  }

  createRuta(payload: RutaCreatePayload): Observable<Ruta> {
    return this.http.post<Ruta>(this.baseUrl, payload);
  }

  updateEstado(id: number, estado: string): Observable<Ruta> {
    const params = new HttpParams().set('estado', estado);
    return this.http.patch<Ruta>(`${this.baseUrl}/${id}/estado`, {}, { params });
  }

  getConductorRutas(idConductor: number): Observable<Ruta[]> {
    return this.http.get<Ruta[]>(`${this.baseUrl}/conductor/${idConductor}`);
  }

  getConductores(): Observable<Conductor[]> {
    return this.http.get<Conductor[]>(`${environment.apiUrl}/api/v1/auth/conductores`);
  }

  getPedidosSinRuta(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${environment.apiUrl}/api/v1/pedidos/sin-ruta`);
  }

  getVehiculos(): Observable<Vehiculo[]> {
    return this.http.get<Vehiculo[]>(`${environment.apiUrl}/api/v1/vehiculos`);
  }
}