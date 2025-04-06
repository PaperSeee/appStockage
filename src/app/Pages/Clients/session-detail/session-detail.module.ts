import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { SessionDetailPageRoutingModule } from './session-detail-routing.module';
import { SessionDetailPage } from './session-detail.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SessionDetailPageRoutingModule,
    SessionDetailPage // Import it instead of declaring it since it's standalone
  ],
  // Remove declarations since the component is standalone
})
export class SessionDetailPageModule {}
