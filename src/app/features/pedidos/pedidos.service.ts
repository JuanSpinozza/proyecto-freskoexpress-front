import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Pedido } from '../../core/models';
import { environment } from '../../../environments/environment';

export interface PedidoItem {
  idProducto: number;
  cantidad: number;
}

export interface PedidoCreatePayload {
  idCliente: number;
  fechaEntregaReq: string;
  ventanaEntrega: {
    inicio: string;
    fin: string;
  };
  items: PedidoItem[];
}

export interface ClienteOption {
  idCliente: number;
  idUsuario?: number;
  razonSocial?: string;
  nombre?: string;
  correo?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PedidosService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/v1/pedidos`;

  createPedido(payload: PedidoCreatePayload): Observable<Pedido> {
    return this.http.post<Pedido>(this.baseUrl, payload);
  }

  updateEstado(id: number, estado: string): Observable<Pedido> {
    const params = new HttpParams().set('estado', estado);
    return this.http.patch<Pedido>(`${this.baseUrl}/${id}/estado`, {}, { params });
  }

  getSinRuta(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.baseUrl}/sin-ruta`);
  }

  getCliente(idCliente: number): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.baseUrl}/cliente/${idCliente}`);
  }

  getClientes(): Observable<ClienteOption[]> {
    return this.http.get<ClienteOption[]>(`${environment.apiUrl}/api/v1/clientes`);
  }
}