import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tab1Page } from './tab1.page';

import { Tab1PageRoutingModule } from './tab1-routing.module';
import { OptimizedImageDirective } from '../../../directives/optimized-image.directive';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    Tab1PageRoutingModule,
    OptimizedImageDirective,  // Ajout de la directive standalone
    Tab1Page  // Import the standalone component instead of declaring it
  ],
  declarations: []  // Remove Tab1Page from declarations
})
export class Tab1PageModule {}
