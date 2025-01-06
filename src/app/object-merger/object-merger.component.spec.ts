import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObjectMergerComponent } from './object-merger.component';

describe('ObjectMergerComponent', () => {
  let component: ObjectMergerComponent;
  let fixture: ComponentFixture<ObjectMergerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObjectMergerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ObjectMergerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
