import { Component, computed, effect, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DatePipe, TitleCasePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { PedidosService, PedidoItem, PedidoCreatePayload, ClienteOption } from './pedidos.service';
import { InventarioService } from '../inventario/inventario.service';
import { AuthService } from '../../core/services/auth.service';
import { Pedido, Producto } from '../../core/models';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';

type TabType = 'todos' | 'confirmado' | 'preparacion' | 'en_ruta' | 'entregado' | 'fallido' | 'sin-ruta';

interface TimeValue {
  hour: number;
  minute: number;
  second: number;
  nano: number;
}

interface PedidoCreateForm {
  fechaEntregaReq: string;
  ventanaInicio: { hour: number; minute: number; second: number };
  ventanaFin: { hour: number; minute: number; second: number };
  items: PedidoItem[];
}

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatStepperModule,
    FormsModule,
    DatePipe,
    TitleCasePipe,
    CurrencyPipe,
  ],
  templateUrl: './pedidos.component.html',
})
export class PedidosComponent {
  private service = inject(PedidosService);
  private inventarioService = inject(InventarioService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);

  readonly user = this.authService.currentUser;
  readonly esCliente = computed(() => this.user()?.rol === 'cliente');
  readonly esAdmin = computed(() => this.user()?.rol === 'admin');
  readonly esAdminOp = computed(() => ['admin', 'operador'].includes(this.user()?.rol ?? ''));
  readonly puedeCrearPedido = computed(() => this.esCliente() || this.esAdmin());

  readonly loading = signal(false);
  readonly pedidos = signal<Pedido[]>([]);
  readonly sinRutaPedidos = signal<Pedido[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly clientes = signal<ClienteOption[]>([]);

  // Admin tabs
  readonly activeAdminTab = signal<TabType>('todos');

  // Cliente create modal
  readonly showCreateModal = signal(false);
  readonly createStep = signal(0);
  readonly loadingProductos = signal(false);
  readonly loadingClientes = signal(false);

  // Create form signals
  readonly formFechaEntrega = signal('');
  readonly formIdCliente = signal('');
  readonly formHoraInicio = signal('08:00');
  readonly formHoraFin = signal('18:00');
  readonly formItems = signal<PedidoItem[]>([]);

  // Computed
  readonly filteredPedidos = computed(() => {
    const tab = this.activeAdminTab();
    const pedidos = this.pedidos();
    if (tab === 'todos' || tab === 'sin-ruta') return pedidos;
    return pedidos.filter((p) => p.estado === tab);
  });

  readonly createTotal = computed(() => {
    const items = this.formItems();
    const productos = this.productos();
    return items.reduce((sum, item) => {
      const prod = productos.find((p) => p.idProducto === item.idProducto);
      return sum + (prod?.precioUnitario ?? 0) * item.cantidad;
    }, 0);
  });

  readonly isFormValid = computed(() => {
    const clienteValido = this.esAdmin() ? this.formIdCliente().trim().length > 0 : true;
    return (
      clienteValido &&
      this.formFechaEntrega().trim().length > 0 &&
      this.formHoraInicio().trim().length > 0 &&
      this.formHoraFin().trim().length > 0 &&
      this.formItems().length > 0
    );
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        const user = this.user();
        if (!user) return;

        if (user.rol === 'cliente') {
          this.cargarPedidosCliente(user.idUsuario);
        } else if (this.esAdminOp()) {
          this.cargarPedidos();
        }
      });
    }
  }

  cargarPedidos(): void {
    this.loading.set(true);
    this.service.getSinRuta().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (data) => this.pedidos.set(data),
      error: () => {
        this.snackBar.open('Error al cargar pedidos', 'Cerrar', { duration: 3000 });
        this.pedidos.set([]);
      },
    });
  }

  cargarPedidosCliente(idCliente: number): void {
    this.loading.set(true);
    this.service.getCliente(idCliente).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (data) => this.pedidos.set(data),
      error: () => {
        this.snackBar.open('Error al cargar pedidos', 'Cerrar', { duration: 3000 });
        this.pedidos.set([]);
      },
    });
  }

  cargarSinRuta(): void {
    this.loading.set(true);
    this.activeAdminTab.set('sin-ruta');
    this.service.getSinRuta().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (data) => this.sinRutaPedidos.set(data),
      error: () => this.snackBar.open('Error al cargar pedidos sin ruta', 'Cerrar', { duration: 3000 }),
    });
  }

  setCambiarEstado(pedido: Pedido, estado: string): void {
    this.loading.set(true);
    this.service.updateEstado(pedido.idPedido, estado).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.snackBar.open(`Estado actualizado a ${estado}`, 'Cerrar', { duration: 3000 });
        this.cargarPedidos();
      },
      error: () => this.snackBar.open('Error al actualizar estado', 'Cerrar', { duration: 3000 }),
    });
  }

  // Cliente create methods
  openCreateModal(): void {
    this.showCreateModal.set(true);
    this.createStep.set(0);
    this.loadProductos();
    if (this.esAdmin()) {
      this.loadClientes();
    }
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.createStep.set(0);
    this.resetCreateForm();
  }

  resetCreateForm(): void {
    this.formFechaEntrega.set('');
    this.formIdCliente.set('');
    this.formHoraInicio.set('08:00');
    this.formHoraFin.set('18:00');
    this.formItems.set([]);
  }

  loadProductos(): void {
    this.loadingProductos.set(true);
    this.inventarioService.getProductos().pipe(finalize(() => this.loadingProductos.set(false))).subscribe({
      next: (data) => this.productos.set(data),
      error: () => this.snackBar.open('Error al cargar productos', 'Cerrar', { duration: 3000 }),
    });
  }

  loadClientes(): void {
    this.loadingClientes.set(true);
    this.service.getClientes().pipe(finalize(() => this.loadingClientes.set(false))).subscribe({
      next: (data) => this.clientes.set(data),
      error: () => {
        this.clientes.set([]);
        this.snackBar.open('Error al cargar clientes', 'Cerrar', { duration: 3000 });
      },
    });
  }

  addItem(): void {
    this.formItems.update((items) => [...items, { idProducto: 0, cantidad: 1 }]);
  }

  removeItem(index: number): void {
    this.formItems.update((items) => items.filter((_, i) => i !== index));
  }

  updateItemId(index: number, value: string): void {
    this.formItems.update((items) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], idProducto: Number(value) };
      return newItems;
    });
  }

  updateItemCantidad(index: number, value: string): void {
    this.formItems.update((items) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], cantidad: Number(value) || 1 };
      return newItems;
    });
  }

  getProductoName(idProducto: number): string {
    return this.productos().find((p) => p.idProducto === idProducto)?.nombre ?? 'Sin seleccionar';
  }

  getClienteLabel(cliente: ClienteOption): string {
    const nombre = cliente.razonSocial || cliente.nombre || `Cliente #${cliente.idCliente}`;
    return cliente.correo ? `${nombre} (${cliente.correo})` : nombre;
  }

  parseTime(timeStr: string): TimeValue {
    const [hour, minute] = timeStr.split(':').map(Number);
    return { hour, minute, second: 0, nano: 0 };
  }

  submitCreate(): void {
    if (!this.isFormValid()) return;

    const user = this.user();
    if (!user) return;

    const items = this.formItems().filter((item) => item.idProducto > 0);
    if (items.length === 0) {
      this.snackBar.open('Agregue al menos un producto válido', 'Cerrar', { duration: 3000 });
      return;
    }

    const idCliente = this.esAdmin() ? Number(this.formIdCliente()) : user.idUsuario;
    if (!idCliente || idCliente <= 0) {
      this.snackBar.open('Seleccione un cliente válido', 'Cerrar', { duration: 3000 });
      return;
    }

    const payload: PedidoCreatePayload = {
      idCliente,
      fechaEntregaReq: this.formFechaEntrega(),
      ventanaEntrega: {
        inicio: JSON.stringify(this.parseTime(this.formHoraInicio())),
        fin: JSON.stringify(this.parseTime(this.formHoraFin())),
      },
      items: items,
    };

    this.service.createPedido(payload).subscribe({
      next: () => {
        this.snackBar.open('Pedido creado exitosamente', 'Cerrar', { duration: 3000 });
        this.closeCreateModal();
        if (this.esCliente()) {
          this.cargarPedidosCliente(user.idUsuario);
        } else {
          this.cargarPedidos();
        }
      },
      error: () => this.snackBar.open('Error al crear pedido', 'Cerrar', { duration: 3000 }),
    });
  }

  nextStep(): void {
    if (this.createStep() === 0 && !this.formFechaEntrega()) return;
    if (this.createStep() === 1 && this.formItems().length === 0) return;
    this.createStep.update((s) => s + 1);
  }

  prevStep(): void {
    this.createStep.update((s) => s - 1);
  }

  setTab(tab: TabType): void {
    this.activeAdminTab.set(tab);
    this.cargarPedidos();
  }

  setTabFromString(tab: string): void {
    this.activeAdminTab.set(tab as TabType);
    this.cargarPedidos();
  }

  onFechaChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formFechaEntrega.set(target.value);
  }

  onClienteChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.formIdCliente.set(target.value);
  }

  onHoraInicioChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formHoraInicio.set(target.value);
  }

  onHoraFinChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formHoraFin.set(target.value);
  }

  onItemProductoChange(index: number, event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.updateItemId(index, target.value);
  }

  onItemCantidadChange(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.updateItemCantidad(index, target.value);
  }
}
