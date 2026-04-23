import { Component, computed, effect, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ProveedoresService } from './proveedores.service';
import { AuthService } from '../../core/services/auth.service';
import { Proveedor } from '../../core/models';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

// Filter tabs type
type EstadoFiltro = 'pendiente' | 'aprobado' | 'rechazado' | 'todos';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    DatePipe,
    TitleCasePipe,
  ],
  templateUrl: './proveedores.component.html',
})
export class ProveedoresComponent {
  private service = inject(ProveedoresService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);

  readonly displayedColumns: string[] = ['razonSocial', 'nit', 'contactoCorreo', 'capacidadSemanal', 'estado', 'acciones'];
  readonly tabs: { value: EstadoFiltro; label: string }[] = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'aprobado', label: 'Aprobado' },
    { value: 'rechazado', label: 'Rechazado' },
  ];

  // State signals
  readonly proveedores = signal<Proveedor[]>([]);
  readonly loading = signal(false);
  readonly filtroEstado = signal<EstadoFiltro>('pendiente');

  // Modal state
  readonly showCreateModal = signal(false);
  readonly showRevisionModal = signal(false);
  readonly showDetalleModal = signal(false);
  readonly selectedProveedor = signal<Proveedor | null>(null);

  // Form signals (create)
  readonly formNit = signal('');
  readonly formRazonSocial = signal('');
  readonly formContactoCorreo = signal('');
  readonly formContactoTelefono = signal('');
  readonly formCapacidadSemanal = signal('');

  // Revision form signals
  readonly formNuevoEstado = signal<'aprobado' | 'rechazado'>('aprobado');
  readonly formRazonRechazo = signal('');

  // Computed signals
  readonly filteredProveedores = computed(() => {
    const proveedores = this.proveedores();
    const filtro = this.filtroEstado();
    if (filtro === 'todos') return proveedores;
    return proveedores.filter((p) => p.estado === filtro);
  });

  readonly isFormValid = computed(() => {
    return (
      this.formNit().trim().length > 0 &&
      this.formRazonSocial().trim().length > 0 &&
      this.formContactoCorreo().trim().includes('@') &&
      this.formContactoTelefono().trim().length > 0 &&
      Number(this.formCapacidadSemanal()) > 0
    );
  });

  readonly isRevisionValid = computed(() => {
    if (this.formNuevoEstado() === 'rechazado') {
      return this.formRazonRechazo().trim().length > 0;
    }
    return true;
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        this.filtroEstado();
        this.cargarProveedores();
      });
    }
  }

  cargarProveedores(): void {
    this.loading.set(true);
    this.service
      .getAll(this.filtroEstado() !== 'todos' ? this.filtroEstado() : undefined)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data: Proveedor[]) => this.proveedores.set(data),
        error: () => {
          this.snackBar.open('Error al cargar proveedores', 'Cerrar', { duration: 3000 });
          this.proveedores.set([]);
        },
      });
  }

  setFilter(filtro: EstadoFiltro): void {
    this.filtroEstado.set(filtro);
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.resetCreateForm();
  }

  openRevisionModal(proveedor: Proveedor): void {
    this.selectedProveedor.set(proveedor);
    this.formNuevoEstado.set('aprobado');
    this.formRazonRechazo.set('');
    this.showRevisionModal.set(true);
  }

  closeRevisionModal(): void {
    this.showRevisionModal.set(false);
    this.selectedProveedor.set(null);
    this.formRazonRechazo.set('');
  }

  openDetalleModal(proveedor: Proveedor): void {
    this.selectedProveedor.set(proveedor);
    this.showDetalleModal.set(true);
  }

  closeDetalleModal(): void {
    this.showDetalleModal.set(false);
    this.selectedProveedor.set(null);
  }

  resetCreateForm(): void {
    this.formNit.set('');
    this.formRazonSocial.set('');
    this.formContactoCorreo.set('');
    this.formContactoTelefono.set('');
    this.formCapacidadSemanal.set('');
  }

  submitCreate(): void {
    if (!this.isFormValid()) return;

    const proveedor = {
      nit: this.formNit().trim(),
      razonSocial: this.formRazonSocial().trim(),
      contactoCorreo: this.formContactoCorreo().trim(),
      contactoTelefono: this.formContactoTelefono().trim(),
      capacidadSemanal: Number(this.formCapacidadSemanal()),
      activo: true,
    };

    this.service.create(proveedor).subscribe({
      next: (_data: Proveedor) => {
        this.snackBar.open('Proveedor registrado exitosamente', 'Cerrar', { duration: 3000 });
        this.closeCreateModal();
        this.cargarProveedores();
      },
      error: () => {
        this.snackBar.open('Error al registrar proveedor', 'Cerrar', { duration: 3000 });
      },
    });
  }

  // Template helper methods
  onNitInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formNit.set(target.value);
  }

  onRazonSocialInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formRazonSocial.set(target.value);
  }

  onContactoCorreoInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formContactoCorreo.set(target.value);
  }

  onContactoTelefonoInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formContactoTelefono.set(target.value);
  }

  onCapacidadSemanalInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formCapacidadSemanal.set(target.value);
  }

  onNuevoEstadoChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.formNuevoEstado.set(target.value as 'aprobado' | 'rechazado');
  }

  onRazonRechazoInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.formRazonRechazo.set(target.value);
  }

  submitRevision(): void {
    const proveedor = this.selectedProveedor();
    if (!proveedor) return;

    const user = this.authService.currentUser();
    if (!user) return;

    const nuevoEstado = this.formNuevoEstado();
    const razonRechazo = nuevoEstado === 'rechazado' ? this.formRazonRechazo().trim() : undefined;

    this.service.updateEstado(proveedor.idProveedor, user.idUsuario, nuevoEstado, razonRechazo).subscribe({
      next: (_data: Proveedor) => {
        this.snackBar.open(`Proveedor ${nuevoEstado} exitosamente`, 'Cerrar', { duration: 3000 });
        this.closeRevisionModal();
        this.cargarProveedores();
      },
      error: () => {
        this.snackBar.open('Error al actualizar estado', 'Cerrar', { duration: 3000 });
      },
    });
  }
}