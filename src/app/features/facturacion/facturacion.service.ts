import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { Factura, Pedido } from '../../core/models';
import { environment } from '../../../environments/environment';

export interface PagoPayload {
  metodoPago: string;
  referenciaPago?: string;
}

@Injectable({
  providedIn: 'root',
})
export class FacturacionService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/v1/facturas`;

  getFacturaByPedido(idPedido: number): Observable<Factura | null> {
    return this.http.get<Factura | null>(`${this.baseUrl}/pedido/${idPedido}`);
  }

  generarFactura(idPedido: number): Observable<Factura> {
    return this.http.post<Factura>(`${this.baseUrl}/pedido/${idPedido}`, {});
  }

  registrarPago(idFactura: number, payload: PagoPayload): Observable<Factura> {
    return this.http.patch<Factura>(`${this.baseUrl}/${idFactura}/pago`, payload);
  }

  getFacturasParaSeleccionar(): Observable<Factura[]> {
    const facturasUrl = `${environment.apiUrl}/api/v1/facturas/all`;
    return this.http.get<Factura[]>(facturasUrl);
  }
}