import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Alerta, Producto, Lote, Pedido, Ruta } from '../../core/models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);

  // Alertas
  getAlertas(): Observable<Alerta[]> {
    return this.http.get<Alerta[]>(`${environment.apiUrl}/api/v1/sensores/alertas`);
  }

  // Stock bajo
  getStockBajo(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${environment.apiUrl}/api/v1/inventario/productos/stock-bajo`);
  }

  // Lotes proximos a vencer
  getLotesProximosVencer(dias: number): Observable<Lote[]> {
    return this.http.get<Lote[]>(`${environment.apiUrl}/api/v1/inventario/lotes/proximos-vencer`, {
      params: new HttpParams().set('dias', dias.toString()),
    });
  }

  // Pedidos sin ruta
  getPedidosSinRuta(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${environment.apiUrl}/api/v1/pedidos/sin-ruta`);
  }

  // Rutas por fecha
  getRutasByFecha(fecha: string): Observable<Ruta[]> {
    return this.http.get<Ruta[]>(`${environment.apiUrl}/api/v1/rutas`, {
      params: new HttpParams().set('fecha', fecha),
    });
  }

  // Rutas del conductor
  getRutasConductor(idConductor: number): Observable<Ruta[]> {
    return this.http.get<Ruta[]>(`${environment.apiUrl}/api/v1/rutas/conductor/${idConductor}`);
  }

  // Alertas por vehiculo
  getAlertasVehiculo(idVehiculo: number): Observable<Alerta[]> {
    return this.http.get<Alerta[]>(`${environment.apiUrl}/api/v1/sensores/alertas/vehiculo/${idVehiculo}`);
  }

  // Pedidos del cliente
  getPedidosCliente(idCliente: number): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${environment.apiUrl}/api/v1/pedidos/cliente/${idCliente}`);
  }
}