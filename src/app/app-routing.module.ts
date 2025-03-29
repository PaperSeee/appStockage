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
  { path: 'login', component: LoginPage }, // Ajouter la route de connexion
  {
    path: 'messaging',
    children: [
      {
        path: '',
        loadComponent: () => 
          import('./Pages/messaging/conversations-list/conversations-list.component').then(m => m.ConversationsListComponent)
      },
      {
        path: 'new',
        loadComponent: () => 
          import('./Pages/messaging/new-chat/new-chat.component').then(m => m.NewChatComponent)
      },
      {
        path: 'chat/:id',
        loadComponent: () => 
          import('./Pages/messaging/chat/chat.component').then(m => m.ChatComponent)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
