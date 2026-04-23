import { Component, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  imports: [MatIconModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  // Signal-based form state
  readonly correo = signal('');
  readonly contrasena = signal('');
  readonly nombre = signal('');
  readonly rol = signal('admin');
  readonly licencia = signal('');
  readonly tipoLicencia = signal('');
  readonly isRegisterMode = signal(false);
  readonly loading = signal(false);

  // Computed validation
  readonly isEmailValid = computed(() => {
    const email = this.correo();
    return email.includes('@') && email.length > 5;
  });

  readonly isPasswordValid = computed(() => this.contrasena().length >= 3);

  readonly isNameValid = computed(() => this.nombre().trim().length >= 3);

  readonly isLicenseValid = computed(() => this.licencia().trim().length >= 3);

  readonly isTipoLicenciaValid = computed(() => this.tipoLicencia().trim().length >= 3);

  readonly isFormValid = computed(() => this.isEmailValid() && this.isPasswordValid());

  readonly isRegisterFormValid = computed(
    () =>
      this.isFormValid() &&
      this.isNameValid() &&
      this.isLicenseValid() &&
      this.isTipoLicenciaValid()
  );

  readonly isDisabled = computed(() => {
    const isValid = this.isRegisterMode() ? this.isRegisterFormValid() : this.isFormValid();
    return this.loading() || !isValid;
  });

  readonly roles = [
    { label: 'Admin', value: 'admin' },
    { label: 'Operador', value: 'operador' },
    { label: 'Conductor', value: 'conductor' },
    { label: 'Cliente', value: 'cliente' },
  ];

  async onSubmit(): Promise<void> {
    if (this.isDisabled()) return;

    this.loading.set(true);
    try {
      if (this.isRegisterMode()) {
        await firstValueFrom(
          this.authService.register({
            nombre: this.nombre().trim(),
            correo: this.correo(),
            contrasena: this.contrasena(),
            rol: this.rol(),
            licencia: this.licencia().trim(),
            tipoLicencia: this.tipoLicencia().trim(),
          })
        );

        this.snackBar.open('Registro exitoso. Ahora puedes iniciar sesión.', 'Cerrar', {
          duration: 5000,
          verticalPosition: 'top',
        });

        this.isRegisterMode.set(false);
        this.contrasena.set('');
      } else {
        const login$ = this.authService.login(this.correo(), this.contrasena());
        const user = await firstValueFrom(login$);
        await this.router.navigate(['/dashboard', user.rol]);
      }
    } catch {
      const errorMessage = this.isRegisterMode()
        ? 'No fue posible registrar el usuario. Verifica los datos e intenta de nuevo.'
        : 'Credenciales inválidas. Por favor verifique sus datos.';

      this.snackBar.open(errorMessage, 'Cerrar', {
        duration: 5000,
        verticalPosition: 'top',
        panelClass: ['error-snackbar'],
      });
    } finally {
      this.loading.set(false);
    }
  }

  toggleMode(): void {
    this.isRegisterMode.update((value) => !value);
    this.contrasena.set('');
  }

  onNombreInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.nombre.set(input.value);
  }

  onRolChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.rol.set(select.value);
  }

  onLicenciaInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.licencia.set(input.value);
  }

  onTipoLicenciaInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.tipoLicencia.set(input.value);
  }

  onCorreoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.correo.set(input.value.trim());
  }

  onContrasenaInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.contrasena.set(input.value);
  }
}