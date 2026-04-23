import { Component, computed, inject, signal, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser, TitleCasePipe } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';

// Navigation configuration interface
interface NavigationItem {
  label: string;
  icon: string;
  path: string;
  roles: string[];
}

// Centralized navigation configuration - single source of truth
const NAVIGATION_CONFIG: NavigationItem[] = [
  { label: 'Dashboard', icon: 'dashboard', path: '/dashboard', roles: ['admin', 'operador', 'conductor', 'cliente'] },
  { label: 'Proveedores', icon: 'business', path: '/proveedores', roles: ['admin', 'operador'] },
  { label: 'Inventario', icon: 'inventory_2', path: '/inventario', roles: ['admin', 'operador'] },
  { label: 'Pedidos', icon: 'shopping_cart', path: '/pedidos', roles: ['admin', 'operador', 'cliente'] },
  { label: 'Rutas', icon: 'directions_bus', path: '/rutas', roles: ['admin', 'operador', 'conductor'] },
  { label: 'Facturación', icon: 'receipt', path: '/facturacion', roles: ['admin', 'operador'] },
  { label: 'Sensores', icon: 'sensor_door', path: '/sensores', roles: ['admin', 'operador'] },
  { label: 'Mantenimiento', icon: 'maintenance', path: '/mantenimiento', roles: ['admin', 'operador'] },
  { label: 'Vehículos', icon: 'local_shipping', path: '/vehiculos', roles: ['admin', 'operador'] },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TitleCasePipe,
    MatTooltipModule,
  ],
  templateUrl: './shell.component.html',
})
export class ShellComponent implements OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);
  private resizeListener: (() => void) | null = null;

  // Signals for reactive state management
  readonly sidebarOpen = signal(true);
  readonly mobileQuery = signal(false);

  // Computed signals for derived state
  readonly user = this.authService.currentUser;

  readonly navigationItems = computed(() => {
    const user = this.user();
    if (!user) return [];
    return NAVIGATION_CONFIG.filter((item) => item.roles.includes(user.rol));
  });

  readonly sidenavMode = computed(() => (this.mobileQuery() ? 'over' : 'side'));
  readonly isMobile = this.mobileQuery;

  constructor() {
    // Initialize mobile query only in browser
    if (isPlatformBrowser(this.platformId)) {
      this.mobileQuery.set(window.matchMedia('(max-width: 768px)').matches);

      // Close sidebar by default on mobile
      if (this.mobileQuery()) {
        this.sidebarOpen.set(false);
      }

      const updateMobileQuery = () => {
        const isMobileNow = window.matchMedia('(max-width: 768px)').matches;
        this.mobileQuery.set(isMobileNow);
        if (isMobileNow && this.sidebarOpen()) {
          this.sidebarOpen.set(false);
        }
      };

      window.addEventListener('resize', updateMobileQuery);
      this.resizeListener = () => window.removeEventListener('resize', updateMobileQuery);
    }
  }

  ngOnDestroy(): void {
    if (this.resizeListener) {
      this.resizeListener();
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  onNavItemClicked(): void {
    // Close sidebar on mobile after clicking a nav item
    if (this.isMobile()) {
      this.sidebarOpen.set(false);
    }
  }

  logout(): void {
    this.authService.logout();
    this.snackBar.open('Sesión cerrada exitosamente', 'Cerrar', {
      duration: 3000,
      verticalPosition: 'top',
    });
  }
}