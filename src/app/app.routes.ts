import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login.component';
import { ShellComponent } from './shared/layout/shell.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Redirect root to login
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // Public route (no guards)
  {
    path: 'login',
    component: LoginComponent,
  },

  // Protected routes with ShellComponent
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      // Dashboard routes - role specific
      {
        path: 'dashboard',
        canActivateChild: [roleGuard],
        children: [
          {
            path: '',
            redirectTo: 'admin',
            pathMatch: 'full',
          },
          {
            path: 'admin',
            loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
            data: { roles: ['admin'] },
          },
          {
            path: 'operador',
            loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
            data: { roles: ['operador'] },
          },
          {
            path: 'conductor',
            loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
            data: { roles: ['conductor'] },
          },
          {
            path: 'cliente',
            loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
            data: { roles: ['cliente'] },
          },
        ],
      },
      // Feature routes with role guards
      {
        path: 'proveedores',
        loadComponent: () => import('./features/proveedores/proveedores.component').then((m) => m.ProveedoresComponent),
        canActivate: [roleGuard],
        data: { roles: ['admin', 'operador'] },
      },
      {
        path: 'inventario',
        loadComponent: () => import('./features/inventario/inventario.component').then((m) => m.InventarioComponent),
        canActivate: [roleGuard],
        data: { roles: ['admin', 'operador'] },
      },
      {
        path: 'pedidos',
        loadComponent: () => import('./features/pedidos/pedidos.component').then((m) => m.PedidosComponent),
        canActivate: [roleGuard],
        data: { roles: ['admin', 'operador', 'cliente'] },
      },
      {
        path: 'rutas',
        loadComponent: () => import('./features/rutas/rutas.component').then((m) => m.RutasComponent),
        canActivate: [roleGuard],
        data: { roles: ['admin', 'operador', 'conductor'] },
      },
      {
        path: 'facturacion',
        loadComponent: () => import('./features/facturacion/facturacion.component').then((m) => m.FacturacionComponent),
        canActivate: [roleGuard],
        data: { roles: ['admin', 'operador'] },
      },
      {
        path: 'sensores',
        loadComponent: () => import('./features/sensores/sensores.component').then((m) => m.SensoresComponent),
        canActivate: [roleGuard],
        data: { roles: ['admin', 'operador'] },
      },
      {
        path: 'mantenimiento',
        loadComponent: () => import('./features/mantenimiento/mantenimiento.component').then((m) => m.MantenimientoComponent),
        canActivate: [roleGuard],
        data: { roles: ['admin', 'operador'] },
      },
      {
        path: 'vehiculos',
        loadComponent: () => import('./features/vehiculos/vehiculos.component').then((m) => m.VehiculosComponent),
        canActivate: [roleGuard],
        data: { roles: ['admin', 'operador'] },
      },
    ],
  },

  // Wildcard route - redirect to login
  { path: '**', redirectTo: '/login', pathMatch: 'full' },
];