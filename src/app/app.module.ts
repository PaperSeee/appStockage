import { NgModule, CUSTOM_ELEMENTS_SCHEMA, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { environment } from '../environments/environment';

// Import FirebaseService
import { FirebaseService } from './services/firebase.service';

// Import ngx-translate modules
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

// Import GrService
import { GrService } from './services/gr.service'; // Assurez-vous que ce chemin est correct

// Import LinkHandlerService
import { LinkHandlerService } from './services/link-handler.service';

// Import ServiceWorkerModule
import { ServiceWorkerModule } from '@angular/service-worker';

// Import PwaUpdateComponent and PwaInstallService
import { PwaUpdateComponent } from './components/pwa-update/pwa-update.component';
import { PwaInstallService } from './services/pwa-install.service';
import { PwaInstallComponent } from './components/pwa-install/pwa-install.component';

// Initialize Firebase
const app = initializeApp(environment.firebaseConfig);
// Get Firebase service instances
const firestore = getFirestore(app);
const auth = getAuth(app);

// ngx-translate loader factory function
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

// Factory pour initialiser le service LinkHandler
export function initLinkHandlerFactory(linkHandler: LinkHandlerService) {
  return () => {
    // Le constructeur du service lance déjà l'initialisation
    return Promise.resolve();
  };
}

@NgModule({
  declarations: [
    AppComponent,
    PwaUpdateComponent,
    PwaInstallComponent // Ajout du composant d'installation PWA
  ],
  imports: [
    BrowserModule, 
    IonicModule.forRoot(), 
    AppRoutingModule,
    HttpClientModule, // Add HttpClientModule for HTTP requests
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerImmediately' // Changé pour s'enregistrer immédiatement
    })
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    FirebaseService,
    GrService, // Ajoutez le service ici
    // Initialiser le service au démarrage de l'app
    {
      provide: APP_INITIALIZER,
      useFactory: initLinkHandlerFactory,
      deps: [LinkHandlerService],
      multi: true
    },
    PwaInstallService
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA] // Ajoutez ceci
})
export class AppModule {
  constructor(private pwaInstallService: PwaInstallService) {
    console.log('AppModule providers:', [
      { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
      FirebaseService,
    ]);
    // Initialiser Capacitor au démarrage de l'application
    import('../utils/capacitor-init').then(module => {
      module.CapacitorInit.init();
    });
  }
}
