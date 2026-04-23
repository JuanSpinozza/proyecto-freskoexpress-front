import { Component, computed, effect, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DatePipe, TitleCasePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, firstValueFrom } from 'rxjs';
import { InventarioService } from './inventario.service';
import { Producto, Lote, Proveedor } from '../../core/models';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

type TabType = 'productos' | 'lotes';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
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
  templateUrl: './inventario.component.html',
})
export class InventarioComponent {
  private service = inject(InventarioService);
  private snackBar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);

  readonly categorias = ['fruta', 'verdura', 'lacteo', 'carnico'] as const;
  readonly productosColumns = ['nombre', 'categoria', 'unidadMedida', 'tempMinC', 'tempMaxC', 'stockMinimo', 'precioUnitario', 'acciones'];
  readonly lotesColumns = ['numeroLote', 'nombreProducto', 'cantidadActual', 'fechaIngreso', 'fechaVencimiento', 'estado'];

  readonly activeTab = signal<TabType>('productos');
  readonly loading = signal(false);
  readonly productos = signal<Producto[]>([]);
  readonly lotes = signal<Lote[]>([]);
  readonly stockBajo = signal<Producto[]>([]);
  readonly proveedores = signal<Proveedor[]>([]);
  readonly loadingProveedores = signal(false);
  readonly loadingProductosLookup = signal(false);

  // Modal states
  readonly showProductoModal = signal(false);
  readonly showLoteModal = signal(false);

  // Producto form signals
  readonly formIdProveedor = signal('');
  readonly formNombre = signal('');
  readonly formCategoria = signal('');
  readonly formUnidadMedida = signal('');
  readonly formTempMinC = signal('');
  readonly formTempMaxC = signal('');
  readonly formStockMinimo = signal('');
  readonly formPrecioUnitario = signal('');

  // Lote form signals
  readonly formLoteIdProducto = signal('');
  readonly formLoteIdProveedor = signal('');
  readonly formLoteNumero = signal('');
  readonly formLoteCantidad = signal('');
  readonly formLoteFechaIngreso = signal('');
  readonly formLoteFechaVencimiento = signal('');

  // Proximos a vencer
  readonly showProximosVencer = signal(false);
  readonly diasVencer = signal(7);
  readonly loadingProximos = signal(false);

  // Ver lotes FIFO
  readonly showFifoPanel = signal(false);
  readonly fifoLoteProducto = signal<string>('');
  readonly loadingFifo = signal(false);
  readonly fifoLotes = signal<Lote[]>([]);

  // Computed
  readonly isProductoFormValid = computed(() => {
    return (
      this.formIdProveedor().trim().length > 0 &&
      this.formNombre().trim().length > 0 &&
      this.formCategoria().trim().length > 0 &&
      this.formUnidadMedida().trim().length > 0 &&
      this.formStockMinimo().trim().length > 0 &&
      this.formPrecioUnitario().trim().length > 0
    );
  });

  readonly isLoteFormValid = computed(() => {
    const isValid = (
      this.formLoteIdProducto().trim().length > 0 &&
      this.formLoteIdProveedor().trim().length > 0 &&
      this.formLoteNumero().trim().length > 0 &&
      this.formLoteCantidad().trim().length > 0 &&
      this.formLoteFechaIngreso().trim().length > 0 &&
      this.formLoteFechaVencimiento().trim().length > 0
    );
    if (!isValid) return false;

    // Validate fechaVencimiento must be after fechaIngreso
    const fechaIngreso = new Date(this.formLoteFechaIngreso());
    const fechaVencimiento = new Date(this.formLoteFechaVencimiento());
    return fechaVencimiento > fechaIngreso;
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        const tab = this.activeTab();
        if (tab === 'productos') this.cargarProductos();
        if (tab === 'lotes') this.cargarProximosVencer();
      });
    }
  }

  onTabChange(index: number): void {
    this.activeTab.set(index === 0 ? 'productos' : 'lotes');
  }

  // Productos methods
  cargarProductos(): void {
    this.loading.set(true);
    this.service.getProductos().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (data) => {
        this.productos.set(data);
        this.checkStockBajo(data);
      },
      error: () => this.snackBar.open('Error al cargar productos', 'Cerrar', { duration: 3000 }),
    });
  }

  checkStockBajo(productos: Producto[]): void {
    this.service.getStockBajo().subscribe({
      next: (data) => this.stockBajo.set(data),
      error: () => this.stockBajo.set([]),
    });
  }

  openProductoModal(): void {
    this.showProductoModal.set(true);
    void this.loadProveedoresLookup();
  }

  closeProductoModal(): void {
    this.showProductoModal.set(false);
    this.resetProductoForm();
  }

  resetProductoForm(): void {
    this.formIdProveedor.set('');
    this.formNombre.set('');
    this.formCategoria.set('');
    this.formUnidadMedida.set('');
    this.formTempMinC.set('');
    this.formTempMaxC.set('');
    this.formStockMinimo.set('');
    this.formPrecioUnitario.set('');
  }

  submitProducto(): void {
    if (!this.isProductoFormValid()) return;

    const producto = {
      idProveedor: Number(this.formIdProveedor()),
      nombre: this.formNombre().trim(),
      categoria: this.formCategoria(),
      unidadMedida: this.formUnidadMedida().trim(),
      tempMinC: Number(this.formTempMinC()) || 0,
      tempMaxC: Number(this.formTempMaxC()) || 0,
      stockMinimo: Number(this.formStockMinimo()),
      precioUnitario: Number(this.formPrecioUnitario()),
    };

    this.service.createProducto(producto).subscribe({
      next: () => {
        this.snackBar.open('Producto creado exitosamente', 'Cerrar', { duration: 3000 });
        this.closeProductoModal();
        this.cargarProductos();
      },
      error: () => this.snackBar.open('Error al crear producto', 'Cerrar', { duration: 3000 }),
    });
  }

  verLotesFIFO(producto: Producto): void {
    this.fifoLoteProducto.set(producto.nombre);
    this.showFifoPanel.set(true);
    this.loadingFifo.set(true);
    this.service.getLotesFIFO(producto.idProducto).pipe(finalize(() => this.loadingFifo.set(false))).subscribe({
      next: (data) => this.fifoLotes.set(data),
      error: () => {
        this.snackBar.open('Error al cargar lotes FIFO', 'Cerrar', { duration: 3000 });
        this.fifoLotes.set([]);
      },
    });
  }

  closeFifoPanel(): void {
    this.showFifoPanel.set(false);
    this.fifoLotes.set([]);
  }

  // Lotes methods
  cargarProximosVencer(): void {
    this.loadingProximos.set(true);
    this.service.getLotesProximosVencer(this.diasVencer()).pipe(finalize(() => this.loadingProximos.set(false))).subscribe({
      next: (data) => this.lotes.set(data),
      error: () => this.snackBar.open('Error al cargar lotes', 'Cerrar', { duration: 3000 }),
    });
  }

  openLoteModal(): void {
    this.showLoteModal.set(true);
    void this.loadProductosLookup();
    void this.loadProveedoresLookup();
  }

  closeLoteModal(): void {
    this.showLoteModal.set(false);
    this.resetLoteForm();
  }

  resetLoteForm(): void {
    const today = new Date().toISOString().split('T')[0];
    this.diasVencer.set(7);
    this.formLoteIdProducto.set('');
    this.formLoteIdProveedor.set('');
    this.formLoteNumero.set('');
    this.formLoteCantidad.set('');
    this.formLoteFechaIngreso.set(today);
    this.formLoteFechaVencimiento.set('');
  }

  submitLote(): void {
    if (!this.isLoteFormValid()) return;

    const lote = {
      idProducto: Number(this.formLoteIdProducto()),
      idProveedor: Number(this.formLoteIdProveedor()),
      nombreProducto: '',
      numeroLote: this.formLoteNumero().trim(),
      cantidadActual: Number(this.formLoteCantidad()),
      fechaIngreso: this.formLoteFechaIngreso(),
      fechaVencimiento: this.formLoteFechaVencimiento(),
    };

    this.service.createLote(lote).subscribe({
      next: () => {
        this.snackBar.open('Lote ingresado exitosamente', 'Cerrar', { duration: 3000 });
        this.closeLoteModal();
        this.cargarProximosVencer();
      },
      error: () => this.snackBar.open('Error al crear lote', 'Cerrar', { duration: 3000 }),
    });
  }

  loadProximosVencer(): void {
    this.cargarProximosVencer();
  }

  async loadProveedoresLookup(force: boolean = false): Promise<void> {
    if (!force && this.proveedores().length > 0) return;

    this.loadingProveedores.set(true);
    try {
      const data = await firstValueFrom(this.service.getProveedores());
      this.proveedores.set(data);
    } catch {
      this.proveedores.set([]);
      this.snackBar.open('Error al cargar proveedores', 'Cerrar', { duration: 3000 });
    } finally {
      this.loadingProveedores.set(false);
    }
  }

  async loadProductosLookup(force: boolean = false): Promise<void> {
    if (!force && this.productos().length > 0) return;

    this.loadingProductosLookup.set(true);
    try {
      const data = await firstValueFrom(this.service.getProductos());
      this.productos.set(data);
    } catch {
      this.snackBar.open('Error al cargar productos para selección', 'Cerrar', { duration: 3000 });
    } finally {
      this.loadingProductosLookup.set(false);
    }
  }

  onDiasVencerChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.diasVencer.set(Number(target.value) || 7);
  }

  // Template helpers
  isFechaVencimientoInvalid(): boolean {
    const fechaIngreso = this.formLoteFechaIngreso();
    const fechaVencimiento = this.formLoteFechaVencimiento();
    if (!fechaIngreso || !fechaVencimiento) return false;
    return new Date(fechaVencimiento) <= new Date(fechaIngreso);
  }

  onNitInput(field: 'formIdProveedor' | 'formNombre' | 'formCategoria' | 'formUnidadMedida' | 'formTempMinC' | 'formTempMaxC' | 'formStockMinimo' | 'formPrecioUnitario', event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    this[field].set(target.value);
  }

  onLoteInput(field: 'formLoteIdProducto' | 'formLoteIdProveedor' | 'formLoteNumero' | 'formLoteCantidad' | 'formLoteFechaIngreso' | 'formLoteFechaVencimiento', event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    this[field].set(target.value);
  }
}