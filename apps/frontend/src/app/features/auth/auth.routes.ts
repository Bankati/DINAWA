import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { Verify2FAComponent } from './pages/verify-2fa/verify-2fa.component';

export const authRoutes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    title: 'Connexion - WARAH'
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: 'Inscription - WARAH'
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
    title: 'Mot de passe oublié - WARAH'
  },
  {
    path: 'verify-2fa',
    component: Verify2FAComponent,
    title: 'Vérification 2FA - WARAH'
  }
];
