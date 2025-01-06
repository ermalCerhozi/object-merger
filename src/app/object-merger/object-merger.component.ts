import {
    Component,
    Input,
    OnDestroy,
    OnInit,
    Output,
    EventEmitter,
    ViewChildren,
    QueryList,
    AfterViewInit,
} from '@angular/core'
import { Observable, Subject, takeUntil } from 'rxjs'
import { ScrollDispatcher, CdkScrollable, ScrollingModule } from '@angular/cdk/scrolling'
import { FormsModule } from '@angular/forms'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatButtonToggleModule } from '@angular/material/button-toggle'
import { MatButtonModule } from '@angular/material/button'
import { NgClass, NgStyle } from '@angular/common'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatIconModule } from '@angular/material/icon'
import { SelectionModel } from '@angular/cdk/collections'
import { ContainerDirective } from '../directives/text-diff-container.directive'
import { FormatLinePipe } from '../pipes/format-line.pipe'
import { DiffTableFormat, DiffContent, DiffResults, DiffTableRowResult, DiffTableFormatOption, DiffPart } from '../models/text-diff.model'
import { DiffService } from '../services/diff.service'

@Component({
    selector: 'app-object-merger',
    templateUrl: './object-merger.component.html',
    styleUrl: './object-merger.component.scss',
    standalone: true,
    imports: [
        FormatLinePipe,
        ContainerDirective,
        NgClass,
        NgStyle,
        FormsModule,
        ScrollingModule,
        MatCheckboxModule,
        MatButtonToggleModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatIconModule,
    ],
})
export class ObjectMergerComponent implements OnInit, AfterViewInit, OnDestroy {
    private _hideMatchingLines = false
    @ViewChildren(ContainerDirective) public containers!: QueryList<ContainerDirective>
    @Input() public format: DiffTableFormat = 'SideBySide'
    @Input() public left = ''
    @Input() public right = ''
    @Input() public diffContent!: Observable<DiffContent>
    @Input() public showToolbar = true
    @Input() public showBtnToolbar = false
    @Input()
    get hideMatchingLines() {
        return this._hideMatchingLines
    }

    set hideMatchingLines(hide: boolean) {
        this._hideMatchingLines = hide
        this.hideMatchingLinesChanged(hide)
    }
    @Input() public outerContainerClass!: string
    @Input() public outerContainerStyle: any
    @Input() public toolbarClass!: string
    @Input() public toolbarStyle: any
    @Input() public compareRowsClass!: string
    @Input() public compareRowsStyle: any
    @Input() public synchronizeScrolling = true
    @Input() public rowHeight: string = '42px'
    @Input() public showActionButton = false
    @Input() public showBorders = true
    @Output() public compareResults = new EventEmitter<DiffResults>()
    @Output() public mergeObjects = new EventEmitter<{ combinedContent: Record<string, any> }>()
    // @Output() public cancelAssociation = new EventEmitter<void>()

    private destroy$ = new Subject<void>()
    public tableRows: DiffTableRowResult[] = []
    public filteredTableRows: DiffTableRowResult[] = []
    public tableRowsLineByLine: DiffTableRowResult[] = []
    public filteredTableRowsLineByLine: DiffTableRowResult[] = []
    public diffsCount = 0

    public selectionLeft = new SelectionModel<number>(true, []);
    public selectionRight = new SelectionModel<number>(true, []);

    public isAllSelectedLeft = false;
    public isAllSelectedRight = false;

    public conflictingLineNumbers: number[] = []

    public formatOptions: DiffTableFormatOption[] = [
        {
            id: 'side-by-side',
            name: 'side-by-side',
            label: 'Side by Side',
            value: 'SideBySide',
            icon: 'la-code',
        },
        {
            id: 'line-by-line',
            name: 'line-by-line',
            label: 'Line by Line',
            value: 'LineByLine',
            icon: 'la-file-text',
        },
    ]

    constructor(
        private scrollService: ScrollDispatcher,
        private diff: DiffService
    ) {}

    ngOnInit() {
        if (this.diffContent) {
            this.diffContent.pipe(takeUntil(this.destroy$)).subscribe((content) => {
                this.left = this.formatContent(content.leftContent)
                this.right = this.formatContent(content.rightContent)
                this.selectionLeft.clear();
                this.selectionRight.clear();
                this.renderDiffs()
                    .then(() => {
                        this.hideMatchingLinesChanged(this._hideMatchingLines)
                    })
            })
        }
        this.renderDiffs()
            .then(() => {
                this.hideMatchingLinesChanged(this._hideMatchingLines)
            })
    }

    ngAfterViewInit() {
        this.initScrollListener()
    }

    ngOnDestroy(): void {
        this.destroy$.next()
        this.destroy$.complete()
    }

    public hideMatchingLinesChanged(value: boolean) {
        this._hideMatchingLines = value
        if (this.hideMatchingLines) {
            this.filteredTableRows = this.tableRows.filter(
                (row) =>
                    (row.leftContent && row.leftContent.prefix === '-') ||
                    (row.rightContent && row.rightContent.prefix === '+')
            )
            this.filteredTableRowsLineByLine = this.tableRowsLineByLine.filter(
                (row) =>
                    (row.leftContent && row.leftContent.prefix === '-') ||
                    (row.rightContent && row.rightContent.prefix === '+')
            )
        } else {
            this.filteredTableRows = this.tableRows
            this.filteredTableRowsLineByLine = this.tableRowsLineByLine
        }
    }

    public setDiffTableFormat(format: DiffTableFormat) {
        this.format = format
    }

    public async renderDiffs() {
        try {
            this.diffsCount = 0
            this.tableRows = await this.diff.getDiffsByLines(this.left, this.right)
            this.tableRowsLineByLine = this.tableRows.reduce(
                (tableLineByLine: DiffTableRowResult[], row: DiffTableRowResult) => {
                    if (!tableLineByLine) {
                        tableLineByLine = []
                    }
                    if (row.hasDiffs) {
                        if (row.leftContent) {
                            tableLineByLine.push({
                                leftContent: row.leftContent,
                                rightContent: null,
                                belongTo: row.belongTo,
                                hasDiffs: true,
                                numDiffs: row.numDiffs,
                            })
                        }
                        if (row.rightContent) {
                            tableLineByLine.push({
                                leftContent: null,
                                rightContent: row.rightContent,
                                belongTo: row.belongTo,
                                hasDiffs: true,
                                numDiffs: row.numDiffs,
                            })
                        }
                    } else {
                        tableLineByLine.push(row)
                    }

                    return tableLineByLine
                },
                []
            )
            this.diffsCount = this.tableRows.filter((row) => row.hasDiffs).length
            this.conflictingLineNumbers = this.tableRows
                .filter((row) => row.hasDiffs)
                .map((row) => row.leftContent?.lineNumber ?? row.rightContent?.lineNumber)
                .filter((lineNumber): lineNumber is number => lineNumber !== undefined)
            this.filteredTableRows = this.tableRows
            this.filteredTableRowsLineByLine = this.tableRowsLineByLine
            this.emitCompareResultsEvent()
        } catch (e) {
            throw e
        }
    }

    public emitCompareResultsEvent() {
        const diffResults: DiffResults = {
            hasDiff: this.diffsCount > 0,
            diffsCount: this.diffsCount,
            rowsWithDiff: this.tableRows
                .filter((row) => row.hasDiffs)
                .map((row) => ({
                    leftLineNumber: row.leftContent ? row.leftContent.lineNumber : undefined,
                    rightLineNumber: row.rightContent ? row.rightContent.lineNumber : undefined,
                    numDiffs: row.numDiffs ?? 0,
                })),
        }

        this.compareResults.next(diffResults)
    }

    public trackTableRows(index: any, row: DiffTableRowResult) {
        return row && row.leftContent
            ? row.leftContent.lineContent
            : row && row.rightContent
              ? row.rightContent.lineContent
              : undefined
    }

    public trackDiffs(index: any, diff: DiffPart) {
        return diff && diff.content ? diff.content : undefined
    }

    public merge() {
        const combinedContent: Record<string, any> = {};
        this.tableRows.forEach(row => {
            const lineNumber = row.leftContent?.lineNumber || row.rightContent?.lineNumber;
            if (lineNumber === undefined) return;

            const isSelectedLeft = this.selectionLeft.isSelected(lineNumber);
            const isSelectedRight = this.selectionRight.isSelected(lineNumber);

            if (isSelectedLeft) {
                const selectedContent = this.getSelectedContentSingle(lineNumber, 'left');
                Object.assign(combinedContent, selectedContent);
            } else if (isSelectedRight) {
                const selectedContent = this.getSelectedContentSingle(lineNumber, 'right');
                Object.assign(combinedContent, selectedContent);
            } else if (row.leftContent) {
                const [key, value] = row.leftContent.lineContent.split(':').map(s => s.trim());
                combinedContent[key] = value;
            }
        });
        this.selectionLeft.clear();
        this.selectionRight.clear();
        this.mergeObjects.emit({
            combinedContent,
        });
    }

    private getSelectedContentSingle(lineNumber: number, side: 'left' | 'right'): Record<string, any> {
        const row = this.tableRows.find(r => 
            side === 'left' ? r.leftContent?.lineNumber === lineNumber : r.rightContent?.lineNumber === lineNumber
        );
        if (row) {
            const lineContent = side === 'left' ? row.leftContent?.lineContent : row.rightContent?.lineContent;
            if (lineContent) {
                const [key, value] = lineContent.split(':').map(s => s.trim());
                return { [key]: value };
            }
        }
        return {};
    }

    public toggleLeftSelection(lineNumber: number): void {
        this.selectionLeft.toggle(lineNumber);
        if (this.selectionLeft.isSelected(lineNumber)) {
            this.selectionRight.deselect(lineNumber);
        }
        this.updateSelectAllState();
    }
    public toggleRightSelection(lineNumber: number): void {
        this.selectionRight.toggle(lineNumber);
        if (this.selectionRight.isSelected(lineNumber)) {
            // Deselect the same line number from the left selection
            this.selectionLeft.deselect(lineNumber);
        }
        this.updateSelectAllState();
    }

    public toggleSelectAllLeft(isChecked: boolean): void {
        const lineNumbers = this.getDiffLineNumbers('left');
        if (isChecked) {
            this.selectionLeft.select(...lineNumbers);
            this.selectionRight.deselect(...lineNumbers);
        } else {
            this.selectionLeft.clear();
        }
        this.updateSelectAllState();
    }

    public toggleSelectAllRight(isChecked: boolean): void {
        const lineNumbers = this.getDiffLineNumbers('right');
        if (isChecked) {
            this.selectionRight.select(...lineNumbers);
            this.selectionLeft.deselect(...lineNumbers);
        } else {
            this.selectionRight.clear();
        }
        this.updateSelectAllState();
    }

    private updateSelectAllState(): void {
        const leftLineNumbers = this.getDiffLineNumbers('left');
        const rightLineNumbers = this.getDiffLineNumbers('right');
        this.isAllSelectedLeft = this.selectionLeft.selected.length === leftLineNumbers.length && leftLineNumbers.length > 0;
        this.isAllSelectedRight = this.selectionRight.selected.length === rightLineNumbers.length && rightLineNumbers.length > 0;
    }

    private getDiffLineNumbers(side: 'left' | 'right'): number[] {
        return this.filteredTableRows
            .filter(row => row.hasDiffs)
            .map(row => side === 'left' ? row.leftContent?.lineNumber : row.rightContent?.lineNumber)
            .filter((lineNumber): lineNumber is number => lineNumber !== undefined);
    }

    private initScrollListener() {
        this.scrollService
            .scrolled()
            .pipe(takeUntil(this.destroy$))
            .subscribe((scrollableEv: void | CdkScrollable) => {
                if (scrollableEv instanceof CdkScrollable && this.synchronizeScrolling) {
                    const scrollableId = scrollableEv.getElementRef().nativeElement.id
                    const nonScrolledContainer = this.containers.find(
                        (container) => container.id !== scrollableId
                    )
                    if (nonScrolledContainer) {
                        nonScrolledContainer.element.scrollTo({
                            top: scrollableEv.measureScrollOffset('top'),
                            left: scrollableEv.measureScrollOffset('left'),
                        })
                    }
                }
            })
    }

    private formatContent(content: Record<string, any>): string {
        return Object.entries(content)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n')
    }

    private getSelectedContent(selection: SelectionModel<number>, side: 'left' | 'right'): Record<string, any> {
        const selectedLines = selection.selected;
        const content: Record<string, any> = {};
        for (const lineNumber of selectedLines) {
            const row = this.filteredTableRows.find(row =>
                side === 'left'
                    ? row.leftContent?.lineNumber === lineNumber
                    : row.rightContent?.lineNumber === lineNumber
            );
            if (row) {
                const lineContent = side === 'left' ? row.leftContent?.lineContent : row.rightContent?.lineContent;
                if (lineContent) {
                    const [key, value] = lineContent.split(':').map(s => s.trim());
                    content[key] = value;
                }
            }
        }
        return content;
    }

    get isSaveButtonDisabled(): boolean {
        return !this.areAllConflictsResolved()
    }

    private areAllConflictsResolved(): boolean {
        for (const lineNumber of this.conflictingLineNumbers) {
            const leftSelected = this.selectionLeft.isSelected(lineNumber)
            const rightSelected = this.selectionRight.isSelected(lineNumber)
            if (!(leftSelected || rightSelected)) {
                return false // Conflict not resolved
            }
            if (leftSelected && rightSelected) {
                return false // Both sides selected for the same line
            }
        }
        return true // All conflicts resolved
    }
}

