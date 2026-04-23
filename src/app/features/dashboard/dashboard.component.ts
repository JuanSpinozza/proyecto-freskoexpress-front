import { Component, computed, effect, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DatePipe, TitleCasePipe, CurrencyPipe, NgClass } from '@angular/common';
import { finalize } from 'rxjs';
import { DashboardService } from './dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { Alerta, Producto, Lote, Pedido, Ruta } from '../../core/models';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

interface KpiCard {
  title: string;
  count: number;
  color: string;
  icon: string;
  route: string;
  loading: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatStepperModule,
    DatePipe,
    TitleCasePipe,
    CurrencyPipe,
    NgClass,
    BaseChartDirective,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private service = inject(DashboardService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  readonly user = this.authService.currentUser;
  readonly today = new Date();
  readonly esAdminOp = computed(() => ['admin', 'operador'].includes(this.user()?.rol ?? ''));
  readonly esConductor = computed(() => this.user()?.rol === 'conductor');
  readonly esCliente = computed(() => this.user()?.rol === 'cliente');

  // Admin/Operador KPIs
  readonly kpis = signal<KpiCard[]>([
    { title: 'Alertas Activas', count: 0, color: 'red', icon: 'warning', route: '/sensores', loading: true },
    { title: 'Stock Bajo', count: 0, color: 'orange', icon: 'inventory_2', route: '/inventario', loading: true },
    { title: 'Lotes por Vencer', count: 0, color: 'yellow', icon: 'schedule', route: '/inventario', loading: true },
    { title: 'Pedidos Sin Ruta', count: 0, color: 'blue', icon: 'shopping_cart', route: '/pedidos', loading: true },
  ]);

  // Today's routes summary
  readonly rutasHoy = signal<Ruta[]>([]);
  readonly rutasLoading = signal(false);

  // Conductor data
  readonly rutasConductor = signal<Ruta[]>([]);
  readonly alertasVehiculos = signal<Map<number, Alerta[]>>(new Map());
  readonly conductorLoading = signal(false);

  // Cliente data
  readonly pedidosRecientes = signal<Pedido[]>([]);
  readonly clienteLoading = signal(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        const user = this.user();
        if (!user) return;

        if (['admin', 'operador'].includes(user.rol)) {
          this.loadAdminKpis();
          this.loadRutasHoy();
        } else if (user.rol === 'conductor') {
          this.loadConductorData(user.idUsuario);
        } else if (user.rol === 'cliente') {
          this.loadClienteData(user.idUsuario);
        }
      });
    }
  }

  // Admin/Operador methods
  loadAdminKpis(): void {
    // Alertas activas
    this.service.getAlertas().subscribe({
      next: (data) => this.updateKpi(0, data.length),
      error: () => this.updateKpi(0, 0),
    });

    // Stock bajo
    this.service.getStockBajo().subscribe({
      next: (data) => this.updateKpi(1, data.length),
      error: () => this.updateKpi(1, 0),
    });

    // Lotes por vencer
    this.service.getLotesProximosVencer(7).subscribe({
      next: (data) => this.updateKpi(2, data.length),
      error: () => this.updateKpi(2, 0),
    });

    // Pedidos sin ruta
    this.service.getPedidosSinRuta().subscribe({
      next: (data) => this.updateKpi(3, data.length),
      error: () => this.updateKpi(3, 0),
    });
  }

  updateKpi(index: number, count: number): void {
    this.kpis.update((kpis) => {
      const newKpis = [...kpis];
      newKpis[index] = { ...newKpis[index], count, loading: false };
      return newKpis;
    });
    // Update bar chart
    this.kpiBarChartData.update((data) => {
      const newData = [...data.datasets[0].data];
      newData[index] = count;
      return { ...data, datasets: [{ ...data.datasets[0], data: newData }] };
    });
  }

  loadRutasHoy(): void {
    const today = new Date().toISOString().split('T')[0];
    this.rutasLoading.set(true);
    this.service.getRutasByFecha(today).pipe(finalize(() => this.rutasLoading.set(false))).subscribe({
      next: (data) => {
        this.rutasHoy.set(data);
        // Update doughnut chart
        const counts = {
          planificada: data.filter((r) => r.estado === 'planificada').length,
          en_curso: data.filter((r) => r.estado === 'en_curso').length,
          completada: data.filter((r) => r.estado === 'completada').length,
          cancelada: data.filter((r) => r.estado === 'cancelada').length,
        };
        this.routeStatusChartData.update((chartData) => ({
          ...chartData,
          datasets: [{ ...chartData.datasets[0], data: [counts.planificada, counts.en_curso, counts.completada, counts.cancelada] }],
        }));
      },
      error: () => this.rutasHoy.set([]),
    });
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  getKpiBgColor(color: string): string {
    switch (color) {
      case 'red': return 'bg-red-50 border-red-200';
      case 'orange': return 'bg-orange-50 border-orange-200';
      case 'yellow': return 'bg-yellow-50 border-yellow-200';
      case 'blue': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }

  getKpiIconColor(color: string): string {
    switch (color) {
      case 'red': return 'text-red-500';
      case 'orange': return 'text-orange-500';
      case 'yellow': return 'text-yellow-500';
      case 'blue': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  }

  getKpiCountColor(color: string): string {
    switch (color) {
      case 'red': return 'text-red-700';
      case 'orange': return 'text-orange-700';
      case 'yellow': return 'text-yellow-700';
      case 'blue': return 'text-blue-700';
      default: return 'text-gray-700';
    }
  }

  getRutaEstadoColor(estado: string): string {
    switch (estado) {
      case 'planificada': return 'bg-gray-100 text-gray-800';
      case 'en_curso': return 'bg-orange-100 text-orange-800';
      case 'completada': return 'bg-green-100 text-green-800';
      case 'cancelada': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // Conductor methods
  loadConductorData(idConductor: number): void {
    this.conductorLoading.set(true);
    this.service.getRutasConductor(idConductor).pipe(finalize(() => this.conductorLoading.set(false))).subscribe({
      next: (data) => {
        this.rutasConductor.set(data);
        // Load alerts for each vehicle
        const vehicleIds = [...new Set(data.map((r) => r.idVehiculo))];
        vehicleIds.forEach((id) => {
          this.service.getAlertasVehiculo(id).subscribe({
            next: (alertas) => {
              this.alertasVehiculos.update((map) => {
                const newMap = new Map(map);
                newMap.set(id, alertas);
                return newMap;
              });
            },
          });
        });
      },
      error: () => this.rutasConductor.set([]),
    });
  }

  updateRutaEstado(ruta: Ruta, estado: string): void {
    // This would call the rutas service, but we'll navigate to rutas module
    this.router.navigate(['/rutas']);
  }

  // Cliente methods
  loadClienteData(idCliente: number): void {
    this.clienteLoading.set(true);
    this.service.getPedidosCliente(idCliente).pipe(finalize(() => this.clienteLoading.set(false))).subscribe({
      next: (data) => this.pedidosRecientes.set(data.slice(0, 5)),
      error: () => this.pedidosRecientes.set([]),
    });
  }

  getPedidoEstadoColor(estado: string): string {
    switch (estado) {
      case 'pendiente': return 'bg-gray-100 text-gray-800';
      case 'confirmado': return 'bg-blue-100 text-blue-800';
      case 'preparacion': return 'bg-indigo-100 text-indigo-800';
      case 'en_ruta': return 'bg-amber-100 text-amber-800';
      case 'entregado': return 'bg-green-100 text-green-800';
      case 'fallido': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getPedidoEstadoOrder(estado: string): number {
    const order = ['pendiente', 'confirmado', 'preparacion', 'en_ruta', 'entregado'];
    return order.indexOf(estado);
  }

  getPedidoTimeline(estado: string): string[] {
    const allStates = ['pendiente', 'confirmado', 'preparacion', 'en_ruta', 'entregado'];
    const currentIndex = allStates.indexOf(estado);
    return currentIndex >= 0 ? allStates.slice(0, currentIndex + 1) : ['pendiente'];
  }

  crearNuevoPedido(): void {
    this.router.navigate(['/pedidos']);
  }

  // Chart configurations
  readonly routeStatusChartData = signal<ChartConfiguration<'doughnut'>['data']>({
    labels: ['Planificada', 'En Curso', 'Completada', 'Cancelada'],
    datasets: [{ data: [0, 0, 0, 0], backgroundColor: ['#6b7280', '#f97316', '#10b981', '#ef4444'], borderWidth: 0 }],
  });
  readonly routeStatusChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15, font: { size: 11 } } },
    },
  };

  readonly kpiBarChartData = signal<ChartConfiguration<'bar'>['data']>({
    labels: ['Alertas', 'Stock Bajo', 'Lotes x Vencer', 'Pedidos s/ Ruta'],
    datasets: [{ data: [0, 0, 0, 0], backgroundColor: ['#ef4444', '#f97316', '#eab308', '#3b82f6'], borderRadius: 8, borderSkipped: false }],
  });
  readonly kpiBarChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, grid: { display: false }, ticks: { stepSize: 1 } },
      y: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };

  // Helper methods for ngClass bindings
  getKpiBgGradient(color: string): string {
    switch (color) {
      case 'red': return 'bg-gradient-to-br from-red-50 to-rose-50';
      case 'orange': return 'bg-gradient-to-br from-orange-50 to-amber-50';
      case 'yellow': return 'bg-gradient-to-br from-yellow-50 to-amber-50';
      case 'blue': return 'bg-gradient-to-br from-blue-50 to-cyan-50';
      default: return 'bg-gradient-to-br from-gray-50 to-slate-50';
    }
  }

  getKpiIconBg(color: string): string {
    switch (color) {
      case 'red': return 'bg-gradient-to-br from-red-500 to-rose-600 text-white';
      case 'orange': return 'bg-gradient-to-br from-orange-500 to-amber-600 text-white';
      case 'yellow': return 'bg-gradient-to-br from-yellow-500 to-amber-600 text-white';
      case 'blue': return 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white';
      default: return 'bg-gradient-to-br from-gray-500 to-slate-600 text-white';
    }
  }

  getKpiBottomLine(color: string): string {
    switch (color) {
      case 'red': return 'bg-gradient-to-r from-red-500 to-rose-500';
      case 'orange': return 'bg-gradient-to-r from-orange-500 to-amber-500';
      case 'yellow': return 'bg-gradient-to-r from-yellow-500 to-amber-500';
      case 'blue': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      default: return 'bg-gradient-to-r from-gray-500 to-slate-500';
    }
  }

  getRutaBgGradient(estado: string): string {
    switch (estado) {
      case 'planificada': return 'from-gray-50 to-slate-50';
      case 'en_curso': return 'from-orange-50 to-amber-50';
      case 'completada': return 'from-green-50 to-emerald-50';
      case 'cancelada': return 'from-red-50 to-rose-50';
      default: return 'from-gray-50 to-slate-50';
    }
  }
}
