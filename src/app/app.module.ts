import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

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

// Initialize Firebase
const app = initializeApp(environment.firebaseConfig);
// Get Firebase service instances
const firestore = getFirestore(app);
const auth = getAuth(app);

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule, 
    IonicModule.forRoot(), 
    AppRoutingModule,
    HttpClientModule, // Add HttpClientModule for HTTP requests
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // Removed any references to 'fr'
    FirebaseService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
