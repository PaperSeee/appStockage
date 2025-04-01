import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaInputDirective } from './pwa-input.directive';

@NgModule({
  declarations: [PwaInputDirective],
  imports: [CommonModule],
  exports: [PwaInputDirective]
})
export class DirectivesModule {}
