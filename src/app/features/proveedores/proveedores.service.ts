import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Proveedor } from '../../core/models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProveedoresService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/proveedores`;

  getAll(estado?: string): Observable<Proveedor[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<Proveedor[]>(this.apiUrl, { params });
  }

  getById(id: number): Observable<Proveedor> {
    return this.http.get<Proveedor>(`${this.apiUrl}/${id}`);
  }

  create(proveedor: Omit<Proveedor, 'idProveedor' | 'estado' | 'fechaRegistro' | 'razonRechazo'>): Observable<Proveedor> {
    return this.http.post<Proveedor>(this.apiUrl, proveedor);
  }

  updateEstado(id: number, idRevisor: number, nuevoEstado: string, razonRechazo?: string): Observable<Proveedor> {
    const params = new HttpParams().set('idRevisor', idRevisor.toString());
    return this.http.patch<Proveedor>(
      `${this.apiUrl}/${id}/revision`,
      { nuevoEstado, razonRechazo },
      { params }
    );
  }
}