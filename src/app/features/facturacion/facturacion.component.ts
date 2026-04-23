import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, TitleCasePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, firstValueFrom } from 'rxjs';
import { FacturacionService, PagoPayload } from './facturacion.service';
import { Factura, Pedido } from '../../core/models';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-facturacion',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    DatePipe,
    TitleCasePipe,
    CurrencyPipe,
  ],
  templateUrl: './facturacion.component.html',
})
export class FacturacionComponent {
  private service = inject(FacturacionService);
  private snackBar = inject(MatSnackBar);

  readonly loading = signal(false);
  readonly searching = signal(false);
  readonly factura = signal<Factura | null>(null);
  readonly idPedido = signal('');
  readonly showPagoModal = signal(false);
  readonly facturasDisponibles = signal<Factura[]>([]);
  readonly loadingPedidos = signal(false);

  // Pago form
  readonly formMetodoPago = signal('');
  readonly formReferenciaPago = signal('');

  readonly metodosPago = ['transferencia', 'tarjeta', 'contra_entrega'];

  readonly requiereReferencia = computed(() => {
    const metodo = this.formMetodoPago();
    return metodo === 'transferencia' || metodo === 'tarjeta';
  });

  readonly isPagoFormValid = computed(() => {
    if (!this.formMetodoPago()) return false;
    if (this.requiereReferencia()) {
      return this.formReferenciaPago().trim().length > 0;
    }
    return true;
  });

  constructor() {
    void this.loadPedidosDisponibles();
  }

  buscarFactura(): void {
    const id = Number(this.idPedido());
    if (!id || id <= 0) {
      this.snackBar.open('Ingrese un ID de pedido válido', 'Cerrar', { duration: 3000 });
      return;
    }

    this.searching.set(true);
    this.service.getFacturaByPedido(id).pipe(finalize(() => this.searching.set(false))).subscribe({
      next: (data) => this.factura.set(data),
      error: () => {
        this.snackBar.open('Error al buscar factura', 'Cerrar', { duration: 3000 });
        this.factura.set(null);
      },
    });
  }

  async loadPedidosDisponibles(force: boolean = false): Promise<void> {
    if (!force && this.facturasDisponibles().length > 0) return;

    this.loadingPedidos.set(true);
    try {
      const data = await firstValueFrom(this.service.getFacturasParaSeleccionar());
      const pendientes = data.filter((factura) => {
        const estado = factura.estado?.toString().trim().toLowerCase();
        return estado !== 'pagada' && estado !== 'pagado';
      });
      this.facturasDisponibles.set(pendientes);
    } catch {
      this.facturasDisponibles.set([]);
      this.snackBar.open('Error al cargar pedidos', 'Cerrar', { duration: 3000 });
    } finally {
      this.loadingPedidos.set(false);
    }
  }

  generarFactura(): void {
    const id = Number(this.idPedido());
    if (!id || id <= 0) return;

    this.loading.set(true);
    this.service.generarFactura(id).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (data) => {
        this.snackBar.open('Factura generada exitosamente', 'Cerrar', { duration: 3000 });
        this.factura.set(data);
      },
      error: () => this.snackBar.open('Error al generar factura', 'Cerrar', { duration: 3000 }),
    });
  }

  openPagoModal(): void {
    this.showPagoModal.set(true);
    this.formMetodoPago.set('');
    this.formReferenciaPago.set('');
  }

  closePagoModal(): void {
    this.showPagoModal.set(false);
    this.formMetodoPago.set('');
    this.formReferenciaPago.set('');
  }

  submitPago(): void {
    if (!this.isPagoFormValid() || !this.factura()) return;

    const payload: PagoPayload = {
      metodoPago: this.formMetodoPago(),
      referenciaPago: this.requiereReferencia() ? this.formReferenciaPago().trim() : undefined,
    };

    this.loading.set(true);
    this.service.registrarPago(this.factura()!.idFactura, payload).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (data) => {
        this.snackBar.open('Pago registrado exitosamente', 'Cerrar', { duration: 3000 });
        this.factura.set(data);
        this.closePagoModal();
      },
      error: () => this.snackBar.open('Error al registrar pago', 'Cerrar', { duration: 3000 }),
    });
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'pendiente': return 'bg-amber-100 text-amber-800';
      case 'pagada': return 'bg-green-100 text-green-800';
      case 'anulada': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  onMetodoPagoChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.formMetodoPago.set(target.value);
  }

  onReferenciaChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formReferenciaPago.set(target.value);
  }

  onIdPedidoChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.idPedido.set(target.value);
  }
}
