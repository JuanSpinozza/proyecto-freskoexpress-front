import { Component, computed, effect, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DatePipe, TitleCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, firstValueFrom } from 'rxjs';
import { RutasService, RutaCreatePayload, Conductor } from './rutas.service';
import { AuthService } from '../../core/services/auth.service';
import { Ruta, Pedido, Vehiculo } from '../../core/models';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-rutas',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    DatePipe,
    TitleCasePipe,
  ],
  templateUrl: './rutas.component.html',
})
export class RutasComponent {
  private service = inject(RutasService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);

  readonly user = this.authService.currentUser;
  readonly esConductor = computed(() => this.user()?.rol === 'conductor');
  readonly esAdminOp = computed(() => ['admin', 'operador'].includes(this.user()?.rol ?? ''));

  readonly loading = signal(false);
  readonly rutas = signal<Ruta[]>([]);
  readonly conductores = signal<Conductor[]>([]);
  readonly pedidosSinRuta = signal<Pedido[]>([]);
  readonly vehiculos = signal<Vehiculo[]>([]);
  readonly loadingVehiculos = signal(false);

  // Admin date picker
  readonly fechaSeleccionada = signal(new Date().toISOString().split('T')[0]);

  // Create modal
  readonly showCreateModal = signal(false);
  readonly formIdVehiculo = signal('');
  readonly formIdConductor = signal('');
  readonly formFechaRuta = signal(new Date().toISOString().split('T')[0]);
  readonly formIdsPedidos = signal<number[]>([]);
  readonly backendErrorBadge = signal('');

  readonly isFormValid = computed(() => {
    return (
      this.formIdVehiculo().trim().length > 0 &&
      this.formIdConductor().trim().length > 0 &&
      this.formFechaRuta().trim().length > 0 &&
      this.formIdsPedidos().length > 0
    );
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        const user = this.user();
        if (!user) return;

        if (user.rol === 'conductor') {
          this.cargarRutasConductor(user.idUsuario);
        } else {
          this.cargarRutas(this.fechaSeleccionada());
        }
      });
    }
  }

  cargarRutas(fecha: string): void {
    this.loading.set(true);
    this.service.getRutas(fecha).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (data: Ruta[]) => this.rutas.set(data),
      error: (_err: unknown) => {
        this.snackBar.open('Error al cargar rutas', 'Cerrar', { duration: 3000 });
        this.rutas.set([]);
      },
    });
  }

  cargarRutasConductor(idConductor: number): void {
    this.loading.set(true);
    this.service.getConductorRutas(idConductor).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (data: Ruta[]) => this.rutas.set(data),
      error: (_err: unknown) => {
        this.snackBar.open('Error al cargar rutas', 'Cerrar', { duration: 3000 });
        this.rutas.set([]);
      },
    });
  }

  onFechaChange(): void {
    this.cargarRutas(this.fechaSeleccionada());
  }

  updateEstado(ruta: Ruta, estado: string): void {
    this.loading.set(true);
    this.service.updateEstado(ruta.idRuta, estado).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (_data: Ruta) => {
        this.snackBar.open(`Estado actualizado a ${estado}`, 'Cerrar', { duration: 3000 });
        const user = this.user();
        if (user?.rol === 'conductor') {
          this.cargarRutasConductor(user.idUsuario);
        } else {
          this.cargarRutas(this.fechaSeleccionada());
        }
      },
      error: (_err: unknown) => this.snackBar.open('Error al actualizar estado', 'Cerrar', { duration: 3000 }),
    });
  }

  // Create methods
  openCreateModal(): void {
    this.showCreateModal.set(true);
    this.backendErrorBadge.set('');
    void this.loadVehiculos();
    this.loadConductores();
    this.loadPedidosSinRuta();
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.backendErrorBadge.set('');
    this.formIdVehiculo.set('');
    this.formIdConductor.set('');
    this.formFechaRuta.set(new Date().toISOString().split('T')[0]);
    this.formIdsPedidos.set([]);
  }

  loadConductores(): void {
    this.service.getConductores().subscribe({
      next: (data: Conductor[]) => this.conductores.set(data),
      error: (_err: unknown) => this.snackBar.open('Error al cargar conductores', 'Cerrar', { duration: 3000 }),
    });
  }

  loadPedidosSinRuta(): void {
    this.service.getPedidosSinRuta().subscribe({
      next: (data: Pedido[]) => this.pedidosSinRuta.set(data),
      error: (_err: unknown) => this.snackBar.open('Error al cargar pedidos sin ruta', 'Cerrar', { duration: 3000 }),
    });
  }

  async loadVehiculos(force: boolean = false): Promise<void> {
    if (!force && this.vehiculos().length > 0) return;

    this.loadingVehiculos.set(true);
    try {
      const data = await firstValueFrom(this.service.getVehiculos());
      this.vehiculos.set(data);
    } catch {
      this.vehiculos.set([]);
      this.snackBar.open('Error al cargar vehículos', 'Cerrar', { duration: 3000 });
    } finally {
      this.loadingVehiculos.set(false);
    }
  }

  togglePedido(idPedido: number): void {
    this.formIdsPedidos.update((ids) => {
      if (ids.includes(idPedido)) {
        return ids.filter((id) => id !== idPedido);
      }
      return [...ids, idPedido];
    });
  }

  submitCreate(event?: Event): void {
    event?.preventDefault();
    if (!this.isFormValid()) return;
    this.backendErrorBadge.set('');

    const payload: RutaCreatePayload = {
      idVehiculo: Number(this.formIdVehiculo()),
      idConductor: Number(this.formIdConductor()),
      fechaRuta: this.formFechaRuta(),
      idsPedidos: this.formIdsPedidos(),
    };

    this.service.createRuta(payload).subscribe({
      next: (_data: Ruta) => {
        this.snackBar.open('Ruta planificada exitosamente', 'Cerrar', { duration: 3000 });
        this.closeCreateModal();
        this.cargarRutas(this.fechaSeleccionada());
      },
      error: (err: unknown) => {
        const backendMessage = this.extractBackendError(err);
        this.backendErrorBadge.set(backendMessage);
        this.snackBar.open('Error al crear ruta', 'Cerrar', { duration: 3000 });
      },
    });
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'planificada': return 'bg-gray-100 text-gray-800';
      case 'en_curso': return 'bg-orange-100 text-orange-800';
      case 'completada': return 'bg-green-100 text-green-800';
      case 'cancelada': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getNextEstado(current: string): string | null {
    switch (current) {
      case 'planificada': return 'en_curso';
      case 'en_curso': return 'completada';
      default: return null;
    }
  }

  onVehiculoChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.formIdVehiculo.set(target.value);
  }

  onConductorChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.formIdConductor.set(target.value);
  }

  onFormFechaChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formFechaRuta.set(target.value);
  }

  private extractBackendError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const serverError = err.error;
      if (typeof serverError === 'string' && serverError.trim().length > 0) {
        return serverError;
      }
      if (serverError?.message && typeof serverError.message === 'string') {
        return serverError.message;
      }
      if (Array.isArray(serverError?.errors) && serverError.errors.length > 0) {
        return serverError.errors.join(' | ');
      }
    }
    return 'No se pudo crear la ruta. Verifica los datos e inténtalo nuevamente.';
  }
}
