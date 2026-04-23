import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, TitleCasePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, firstValueFrom } from 'rxjs';
import { MantenimientoService, MantenimientoCreatePayload } from './mantenimiento.service';
import { Mantenimiento, Vehiculo } from '../../core/models';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-mantenimiento',
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
    DecimalPipe,
  ],
  templateUrl: './mantenimiento.component.html',
})
export class MantenimientoComponent {
  private service = inject(MantenimientoService);
  private snackBar = inject(MatSnackBar);

  readonly loading = signal(false);
  readonly idVehiculo = signal('');
  readonly mantenimientos = signal<Mantenimiento[]>([]);
  readonly showCreateModal = signal(false);
  readonly vehiculos = signal<Vehiculo[]>([]);
  readonly loadingVehiculos = signal(false);

  // Create form signals
  readonly formIdVehiculo = signal('');
  readonly formTipo = signal('');
  readonly formDescripcion = signal('');
  readonly formKmEnServicio = signal('');
  readonly formFechaServicio = signal(new Date().toISOString().split('T')[0]);
  readonly formProxKm = signal('');
  readonly formProxFecha = signal('');

  readonly tiposMantenimiento = ['preventivo', 'correctivo'];

  readonly isFormValid = computed(() => {
    return (
      this.formIdVehiculo().trim().length > 0 &&
      this.formTipo().trim().length > 0 &&
      this.formDescripcion().trim().length > 0 &&
      this.formKmEnServicio().trim().length > 0 &&
      this.formFechaServicio().trim().length > 0 &&
      this.formProxKm().trim().length > 0 &&
      this.formProxFecha().trim().length > 0
    );
  });

  constructor() {
    void this.loadVehiculos();
  }

  buscarMantenimientos(): void {
    const id = Number(this.idVehiculo());
    if (!id || id <= 0) {
      this.snackBar.open('Ingrese un ID de vehículo válido', 'Cerrar', { duration: 3000 });
      return;
    }

    this.loading.set(true);
    this.service.getMantenimientosVehiculo(id).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (data) => this.mantenimientos.set(data),
      error: () => this.snackBar.open('Error al cargar mantenimientos', 'Cerrar', { duration: 3000 }),
    });
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
    this.formIdVehiculo.set(this.idVehiculo());
    void this.loadVehiculos();
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.resetForm();
  }

  resetForm(): void {
    this.formIdVehiculo.set('');
    this.formTipo.set('');
    this.formDescripcion.set('');
    this.formKmEnServicio.set('');
    this.formFechaServicio.set(new Date().toISOString().split('T')[0]);
    this.formProxKm.set('');
    this.formProxFecha.set('');
  }

  submitCreate(): void {
    if (!this.isFormValid()) return;

    const payload: MantenimientoCreatePayload = {
      idVehiculo: Number(this.formIdVehiculo()),
      tipo: this.formTipo(),
      descripcion: this.formDescripcion().trim(),
      kmEnServicio: Number(this.formKmEnServicio()),
      fechaServicio: this.formFechaServicio(),
      proxKm: Number(this.formProxKm()),
      proxFecha: this.formProxFecha(),
    };

    this.loading.set(true);
    this.service.createMantenimiento(payload).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.snackBar.open('Mantenimiento registrado exitosamente', 'Cerrar', { duration: 3000 });
        this.closeCreateModal();
        this.buscarMantenimientos();
      },
      error: () => this.snackBar.open('Error al registrar mantenimiento', 'Cerrar', { duration: 3000 }),
    });
  }

  getTipoColor(tipo: string): string {
    switch (tipo) {
      case 'preventivo': return 'bg-blue-100 text-blue-800';
      case 'correctivo': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  onIdVehiculoChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.idVehiculo.set(target.value);
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

  onFormTipoChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.formTipo.set(target.value);
  }

  onFormDescripcionChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formDescripcion.set(target.value);
  }

  onFormKmChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formKmEnServicio.set(target.value);
  }

  onFormFechaChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formFechaServicio.set(target.value);
  }

  onFormProxKmChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formProxKm.set(target.value);
  }

  onFormProxFechaChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formProxFecha.set(target.value);
  }
}