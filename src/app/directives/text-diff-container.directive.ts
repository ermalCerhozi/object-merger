import { Directive, Input, ElementRef } from '@angular/core';

@Directive({
  selector: '[tdContainer]',
  standalone: true,
})
export class ContainerDirective {
  @Input() id!: string;

  element: HTMLTableCellElement;

  constructor(private _el: ElementRef) {
    this.element = this._el.nativeElement;
  }
}
