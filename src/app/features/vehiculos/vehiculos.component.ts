import { Component, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Vehiculo } from '../../core/models';
import {
  VehiculosService,
  VehiculoCreatePayload,
  VehiculoDisponibilidadPayload,
  VehiculoKilometrajePayload,
} from './vehiculos.service';

@Component({
  selector: 'app-vehiculos',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './vehiculos.component.html',
})
export class VehiculosComponent {
  private service = inject(VehiculosService);
  private snackBar = inject(MatSnackBar);

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly vehiculos = signal<Vehiculo[]>([]);
  readonly showCreateModal = signal(false);

  readonly formPlaca = signal('');
  readonly formMarca = signal('');
  readonly formModelo = signal('');
  readonly formCapacidadKg = signal('');
  readonly formKilometraje = signal('');
  readonly formDisponible = signal('true');

  readonly kmUpdates = signal<Record<number, string>>({});
  readonly disponibilidadUpdates = signal<Record<number, string>>({});

  readonly isCreateFormValid = computed(() => this.formPlaca().trim().length > 0);

  constructor() {
    this.cargarVehiculos();
  }

  cargarVehiculos(): void {
    this.loading.set(true);
    this.service.getVehiculos().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (data) => {
        this.vehiculos.set(data);
        this.primeUpdateInputs(data);
      },
      error: () => {
        this.vehiculos.set([]);
        this.snackBar.open('Error al cargar vehículos', 'Cerrar', { duration: 3000 });
      },
    });
  }

  primeUpdateInputs(vehiculos: Vehiculo[]): void {
    const kmState: Record<number, string> = {};
    const dispState: Record<number, string> = {};

    for (const vehiculo of vehiculos) {
      kmState[vehiculo.idVehiculo] = vehiculo.kilometraje?.toString() ?? '';
      dispState[vehiculo.idVehiculo] = vehiculo.disponible ? 'true' : 'false';
    }

    this.kmUpdates.set(kmState);
    this.disponibilidadUpdates.set(dispState);
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.resetCreateForm();
  }

  resetCreateForm(): void {
    this.formPlaca.set('');
    this.formMarca.set('');
    this.formModelo.set('');
    this.formCapacidadKg.set('');
    this.formKilometraje.set('');
    this.formDisponible.set('true');
  }

  submitCreate(): void {
    if (!this.isCreateFormValid() || this.submitting()) return;

    const payload: VehiculoCreatePayload = {
      placa: this.formPlaca().trim(),
      marca: this.formMarca().trim() || undefined,
      modelo: this.formModelo().trim() || undefined,
      capacidadKg: this.formCapacidadKg().trim() ? Number(this.formCapacidadKg()) : undefined,
      kilometraje: this.formKilometraje().trim() ? Number(this.formKilometraje()) : undefined,
      disponible: this.formDisponible() === 'true',
    };

    this.submitting.set(true);
    this.service.createVehiculo(payload).pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => {
        this.snackBar.open('Vehículo registrado exitosamente', 'Cerrar', { duration: 3000 });
        this.closeCreateModal();
        this.cargarVehiculos();
      },
      error: () => this.snackBar.open('Error al registrar vehículo', 'Cerrar', { duration: 3000 }),
    });
  }

  updateKilometraje(idVehiculo: number): void {
    const kilometraje = Number(this.kmUpdates()[idVehiculo] ?? '');
    if (!Number.isFinite(kilometraje) || kilometraje < 0) {
      this.snackBar.open('Ingrese un kilometraje válido', 'Cerrar', { duration: 3000 });
      return;
    }

    const payload: VehiculoKilometrajePayload = { kilometraje };
    this.submitting.set(true);
    this.service.updateKilometraje(idVehiculo, payload).pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => {
        this.snackBar.open('Kilometraje actualizado', 'Cerrar', { duration: 3000 });
        this.cargarVehiculos();
      },
      error: () => this.snackBar.open('Error al actualizar kilometraje', 'Cerrar', { duration: 3000 }),
    });
  }

  updateDisponibilidad(idVehiculo: number): void {
    const disponible = (this.disponibilidadUpdates()[idVehiculo] ?? 'false') === 'true';
    const payload: VehiculoDisponibilidadPayload = { disponible };

    this.submitting.set(true);
    this.service.updateDisponibilidad(idVehiculo, payload).pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => {
        this.snackBar.open('Disponibilidad actualizada', 'Cerrar', { duration: 3000 });
        this.cargarVehiculos();
      },
      error: () => this.snackBar.open('Error al actualizar disponibilidad', 'Cerrar', { duration: 3000 }),
    });
  }

  onPlacaChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formPlaca.set(target.value);
  }

  onMarcaChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formMarca.set(target.value);
  }

  onModeloChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formModelo.set(target.value);
  }

  onCapacidadChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formCapacidadKg.set(target.value);
  }

  onKilometrajeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formKilometraje.set(target.value);
  }

  onDisponibleChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.formDisponible.set(target.value);
  }

  onRowKilometrajeChange(idVehiculo: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.kmUpdates.update((state) => ({ ...state, [idVehiculo]: target.value }));
  }

  onRowDisponibilidadChange(idVehiculo: number, event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.disponibilidadUpdates.update((state) => ({ ...state, [idVehiculo]: target.value }));
  }
}
