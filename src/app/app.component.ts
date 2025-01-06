import { Component, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {MatCardModule} from '@angular/material/card';
import { DiffContent } from './models/text-diff.model';
import { ObjectMergerComponent } from './object-merger/object-merger.component';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true,
  imports: [ObjectMergerComponent, MatCardModule, JsonPipe],
})
export class AppComponent implements OnInit {
    public diffContent$ = new BehaviorSubject<DiffContent>({ leftContent: {}, rightContent: {} })

    public mergedObject: Record<string, any> = {};

    ngOnInit() {
        this.diffContent$.next({
            leftContent: {
                name: 'Python',
                createdBy: 'Guido van Rossum',
                firstAppeared: 1991,
                typing: 'Dynamic',
                version: '3.11',
                license: 'Python Software Foundation License',
                influencedBy: ['C', 'Java', 'C++'],
                platform: 'Web, Server, Desktop',
                category: 'Programming Language',
                popularity: 'High',
                books: 'Learn Python the Hard Way',
                numberOfDevelopers: 100,
                numberOfOpenPositions: 5
            },
            rightContent: {
                name: 'JavaScript',
                createdBy: 'Brendan Eich',
                firstAppeared: 1995,
                typing: 'Dynamic',
                version: 'ES2023',
                license: 'MIT',
                influencedBy: ['Java', 'Scheme', 'Self'],
                platform: 'Web, Server',
                category: 'Programming Language',
                popularity: 'Very High',
                books: ['Eloquent JavaScript', 'You Don’t Know JS'],
                numberOfDevelopers: 150,
                numberOfOpenPositions: 3
            }
        });
    }

    public merge(object: { combinedContent: Record<string, any> }) {
        this.mergedObject = object.combinedContent;
        console.log(object);
    }

    get isMergedObjectEmpty(): boolean {
        return Object.keys(this.mergedObject).length === 0;
    }
}
