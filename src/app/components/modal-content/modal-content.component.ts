import { Component, Input, TemplateRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ModalController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-modal-content',
  template: `
    <ng-container *ngTemplateOutlet="contentTemplate; context: {formGroup: formGroup}"></ng-container>
  `,
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule]
})
export class ModalContentComponent {
  @Input() contentTemplate!: TemplateRef<any>;
  @Input() formGroup!: FormGroup;

  constructor(private modalController: ModalController) {}

  dismissModal(saved: boolean = false) {
    this.modalController.dismiss({
      saved: saved
    });
  }
}
