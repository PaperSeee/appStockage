import { enableProdMode } from '@angular/core';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { initCapacitor } from './app/capacitor-init';
import { platformBrowser } from '@angular/platform-browser';

if (environment.production) {
  enableProdMode();
}

// Initialize Capacitor first before bootstrapping the app
initCapacitor().then(() => {
  platformBrowser().bootstrapModule(AppModule)
    .catch(err => console.error(err));
}).catch(err => {
  console.error('Error initializing Capacitor:', err);
  // Still bootstrap the app even if Capacitor fails
  platformBrowser().bootstrapModule(AppModule)
    .catch(err => console.error(err));
});
