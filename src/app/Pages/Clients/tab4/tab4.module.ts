import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Tab4PageRoutingModule } from './tab4-routing.module';
import { ExploreContainerComponentModule } from '../../../explore-container/explore-container.module';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    Tab4PageRoutingModule,
    ExploreContainerComponentModule
  ],
  declarations: []
})
export class Tab4PageModule { }
