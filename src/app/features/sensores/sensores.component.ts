import { Component, computed, effect, inject, signal, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser, DatePipe, TitleCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { finalize, firstValueFrom, interval } from 'rxjs';
import { SensoresService, LecturaPayload } from './sensores.service';
import { AuthService } from '../../core/services/auth.service';
import { Alerta, Ruta, Vehiculo } from '../../core/models';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-sensores',
  standalone: true,
  imports: [
    MatTabsModule,
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
  ],
  templateUrl: './sensores.component.html',
})
export class SensoresComponent implements OnDestroy {
  private service = inject(SensoresService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);

  readonly user = this.authService.currentUser;
  readonly esAdminOp = computed(() => ['admin', 'operador'].includes(this.user()?.rol ?? ''));

  readonly loading = signal(false);
  readonly alertas = signal<Alerta[]>([]);
  readonly activeTab = signal(0);

  // Vehicle history
  readonly idVehiculoBusqueda = signal('');
  readonly historialLoading = signal(false);
  readonly historialAlertas = signal<Alerta[]>([]);

  // Lectura form
  readonly showLecturaForm = signal(false);
  readonly formIdVehiculo = signal('');
  readonly formIdRuta = signal('');
  readonly formTemperaturaC = signal('');
  readonly formHumedadPct = signal('');
  readonly vehiculos = signal<Vehiculo[]>([]);
  readonly loadingVehiculos = signal(false);
  readonly rutasDisponibles = signal<Ruta[]>([]);
  readonly loadingRutas = signal(false);
  readonly backendErrorBadge = signal('');

  readonly isLecturaFormValid = computed(() => {
    return (
      this.formIdVehiculo().trim().length > 0 &&
      this.formTemperaturaC().trim().length > 0 &&
      this.formHumedadPct().trim().length > 0
    );
  });

  // Auto-refresh interval
  private refreshInterval: any = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarAlertas();

      // Auto-refresh every 30 seconds using interval() + Signals
      this.refreshInterval = interval(30000).subscribe(() => {
        this.cargarAlertas();
      });
    }
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      this.refreshInterval.unsubscribe();
    }
  }

  cargarAlertas(): void {
    this.service.getAlertas().subscribe({
      next: (data) => this.alertas.set(data),
      error: () => this.snackBar.open('Error al cargar alertas', 'Cerrar', { duration: 3000 }),
    });
  }

  reconocerAlerta(alerta: Alerta): void {
    this.loading.set(true);
    this.service.reconocerAlerta(alerta.idAlerta).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.snackBar.open('Alerta reconocida', 'Cerrar', { duration: 3000 });
        this.alertas.update((alertas) => alertas.filter((a) => a.idAlerta !== alerta.idAlerta));
      },
      error: () => this.snackBar.open('Error al reconocer alerta', 'Cerrar', { duration: 3000 }),
    });
  }

  buscarHistorial(): void {
    const id = Number(this.idVehiculoBusqueda());
    if (!id || id <= 0) {
      this.snackBar.open('Ingrese un ID de vehículo válido', 'Cerrar', { duration: 3000 });
      return;
    }

    this.historialLoading.set(true);
    this.service.getAlertasVehiculo(id).pipe(finalize(() => this.historialLoading.set(false))).subscribe({
      next: (data) => this.historialAlertas.set(data),
      error: () => this.snackBar.open('Error al cargar historial', 'Cerrar', { duration: 3000 }),
    });
  }

  openLecturaForm(): void {
    this.showLecturaForm.set(true);
    this.backendErrorBadge.set('');
    void this.loadVehiculos();
    void this.loadRutasLookup();
  }

  closeLecturaForm(): void {
    this.showLecturaForm.set(false);
    this.backendErrorBadge.set('');
    this.formIdVehiculo.set('');
    this.formIdRuta.set('');
    this.formTemperaturaC.set('');
    this.formHumedadPct.set('');
  }

  submitLectura(event?: Event): void {
    event?.preventDefault();
    if (!this.isLecturaFormValid()) return;
    this.backendErrorBadge.set('');

    const payload: LecturaPayload = {
      idVehiculo: Number(this.formIdVehiculo()),
      idRuta: this.formIdRuta() ? Number(this.formIdRuta()) : undefined,
      temperaturaC: Number(this.formTemperaturaC()),
      humedadPct: Number(this.formHumedadPct()),
    };

    this.loading.set(true);
    this.service.postLectura(payload).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.snackBar.open('Lectura registrada exitosamente', 'Cerrar', { duration: 3000 });
        this.closeLecturaForm();
      },
      error: (err: unknown) => {
        const backendMessage = this.extractBackendError(err);
        this.backendErrorBadge.set(backendMessage);
        this.snackBar.open('Error al registrar lectura', 'Cerrar', { duration: 3000 });
      },
    });
  }

  getSeveridadColor(severidad: string): string {
    switch (severidad) {
      case 'advertencia': return 'bg-orange-100 text-orange-800';
      case 'critica': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  onIdVehiculoChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.idVehiculoBusqueda.set(target.value);
  }

  onFormIdVehiculoChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.formIdVehiculo.set(target.value);
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

  async loadRutasLookup(force: boolean = false): Promise<void> {
    if (!force && this.rutasDisponibles().length > 0) return;

    this.loadingRutas.set(true);
    try {
      const fecha = new Date().toISOString().split('T')[0];
      const data = await firstValueFrom(this.service.getRutas(fecha));
      this.rutasDisponibles.set(data);
    } catch {
      this.rutasDisponibles.set([]);
      this.snackBar.open('Error al cargar rutas', 'Cerrar', { duration: 3000 });
    } finally {
      this.loadingRutas.set(false);
    }
  }

  onFormIdRutaChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.formIdRuta.set(target.value);
  }

  onFormTemperaturaChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formTemperaturaC.set(target.value);
  }

  onFormHumedadChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formHumedadPct.set(target.value);
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
    return 'No se pudo completar la operación. Revisa los datos e inténtalo de nuevo.';
  }
}