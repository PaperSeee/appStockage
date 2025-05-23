import { NgModule, CUSTOM_ELEMENTS_SCHEMA, APP_INITIALIZER, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';

// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Import FirebaseService
import { FirebaseService } from './services/firebase.service';

// Import ngx-translate modules
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

// Import GrService
import { GrService } from './services/gr.service'; // Assurez-vous que ce chemin est correct

// Import LinkHandlerService
import { LinkHandlerService } from './services/link-handler.service';

// Import OptimizedImageDirective
import { OptimizedImageDirective } from './directives/optimized-image.directive';

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
  declarations: [AppComponent], // Suppression de OptimizedImageDirective des déclarations
  imports: [
    BrowserModule, 
    IonicModule.forRoot(), 
    AppRoutingModule,
    HttpClientModule, // Add HttpClientModule for HTTP requests
    OptimizedImageDirective, // Ajout de la directive comme import car elle est standalone
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
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
    }
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA] // Ajoutez ceci
})
export class AppModule {
  constructor() {
    console.log('AppModule providers:', [
      { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
      FirebaseService,
    ]);
  }
}
