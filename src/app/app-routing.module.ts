import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { RegisterPage } from './register/register.page';
import { ProfilePage } from './Pages/Profile/profile.page';
import { LoginPage } from './login/login.page'; // Importer la nouvelle page

const routes: Routes = [
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
  },
  {
    path: '',
    redirectTo: 'tabs/tab1',
    pathMatch: 'full'
  },
  { path: 'register', component: RegisterPage },
  { path: 'profile', component: ProfilePage },
  { path: 'login', component: LoginPage } // Ajouter la route de connexion
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
