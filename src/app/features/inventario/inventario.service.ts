import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Producto, Lote, Proveedor } from '../../core/models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class InventarioService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/v1/inventario`;

  // Productos endpoints
  getProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.baseUrl}/productos`);
  }

  createProducto(producto: Omit<Producto, 'idProducto' | 'activo'>): Observable<Producto> {
    return this.http.post<Producto>(`${this.baseUrl}/productos`, producto);
  }

  getStockBajo(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.baseUrl}/productos/stock-bajo`);
  }

  getProveedores(): Observable<Proveedor[]> {
    return this.http.get<Proveedor[]>(`${environment.apiUrl}/api/v1/proveedores?estado=aprobado`);
  }

  // Lotes endpoints
  getLotesFIFO(idProducto: number): Observable<Lote[]> {
    return this.http.get<Lote[]>(`${this.baseUrl}/lotes/${idProducto}/fifo`);
  }

  getLotesProximosVencer(dias: number = 7): Observable<Lote[]> {
    return this.http.get<Lote[]>(`${this.baseUrl}/lotes/proximos-vencer`, {
      params: { dias: dias.toString() },
    });
  }

  createLote(lote: Omit<Lote, 'idLote' | 'estado'>): Observable<Lote> {
    return this.http.post<Lote>(`${this.baseUrl}/lotes`, lote);
  }
}