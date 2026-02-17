import { Component, inject, DestroyRef, HostListener } from '@angular/core';
import { AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { faker } from '@faker-js/faker';

type InvoiceStatus = 'Paid' | 'Unpaid' | 'PartiallyPaid';

type InvoiceRow = {
  invoiceNo: string;
  clientName: string;
  date: string; //yyyy-mm-dd
  total: number;
  status: InvoiceStatus;
};

@Component({
  selector: 'app-filter-grid',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './filter-grid.html',
  styleUrl: './filter-grid.css',
})
export class FilterGrid implements AfterViewInit {
  // This code generates a random amount of information such as Invoice numbers, Client names
  // dates, totals and payment statuses.
  invoices: InvoiceRow[] = Array.from({ length: 500 }, (_, i) => ({
    invoiceNo: faker.string.numeric(5),
    clientName: faker.company.name(),
    date: faker.date.between({ from: '2024-01-01', to: '2025-12-31' }).toISOString().split('T')[0], // formats to yyyy-mm-dd
    total: faker.number.float({ min: 100, max: 50000, fractionDigits: 2 }),
    status: faker.helpers.arrayElement(['Paid', 'Unpaid', 'PartiallyPaid']) as InvoiceStatus,
  }));

  // Context menu state
  showContextmenu = false;
  contextMenuX = 0;
  contextMenuY = 0;
  selectedColumns: string = '';

  // Track which columns are highlighted and with what color
  columnsHighlights: { [key: string]: string } = {};

  onRightClick(event: MouseEvent, columnName: string): void {
    // This stops the browser's default right click menu
    event.preventDefault();

    // Store which columns were clicked
    this.selectedColumns = columnName;

    //Position the menu where the mouse is
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;

    //Show the custom menu
    this.showContextmenu = true;
  }

  highlightYellow(): void {
    this.columnsHighlights[this.selectedColumns] = '#fff3cd';
    this.closeMenu();
  }

  highlightGreen(): void {
    this.columnsHighlights[this.selectedColumns] = '#d4edda';
    this.closeMenu();
  }

  highlightRed(): void {
    this.columnsHighlights[this.selectedColumns] = '#f8d7da';
    this.closeMenu();
  }

  clearHighlights(): void {
    delete this.columnsHighlights[this.selectedColumns];
    this.closeMenu();
  }

  closeMenu(): void {
    this.showContextmenu = false;
  }

  @HostListener('document: click')
  onDocumentClick(): void {
    this.showContextmenu = false;
  }

  displayedColumns: (keyof InvoiceRow)[] = ['invoiceNo', 'clientName', 'date', 'total', 'status'];

  // Mock data (TEMPORARY)
  // Will later be replaced with API data
  rows: InvoiceRow[] = [
    {
      invoiceNo: '18809',
      clientName: 'Elite Technologies',
      date: '2026-02-01',
      total: 1520.55,
      status: 'Unpaid',
    },
    {
      invoiceNo: '18810',
      clientName: 'Elite Technologies',
      date: '2026-02-02',
      total: 980.0,
      status: 'Paid',
    },
    {
      invoiceNo: '32561',
      clientName: 'Ascot Site Solutions',
      date: '2026-01-28',
      total: 4200.0,
      status: 'PartiallyPaid',
    },
  ];

  dataSource = new MatTableDataSource<InvoiceRow>(this.invoices);
  searchCtrl = new FormControl<string>('', { nonNullable: true });

  // Date range form group - holds both the start and end date in one group.
  // FormGroup bundles related controls together, so instead of two separate
  // FormControls floating around, they're neatly paired.
  dateRange = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });

  @ViewChild(MatSort) sort!: MatSort;

  // inject() must be called in the constructor/field-initializer phase,
  // so we store the reference here for use in ngAfterViewInit
  private destroyRef = inject(DestroyRef);

  // ── Lifecycle ──────────────────────────────────────────────────────
  ngAfterViewInit(): void {
    // Wire up Material sorting
    this.dataSource.sort = this.sort;

    // Both inputs call the same applyFilters method so that
    // the text search and date range work together
    this.searchCtrl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.applyFilters();
    });

    // valueChanges on the FormGroup fires whenever either
    // the start or end date changes - so one subscription covers both
    this.dateRange.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.applyFilters();
    });
  }

  // ── Clear the date range ───────────────────────────────────────────
  // Called from a "clear" button in the template so users can
  // easily reset the date filter without clearing the search text
  clearDateRange(): void {
    this.dateRange.reset();
  }

  // ── Combined filter logic ──────────────────────────────────────────
  private applyFilters(): void {
    const search = this.searchCtrl.value.trim().toLowerCase();
    const startDate = this.dateRange.value.start;
    const endDate = this.dateRange.value.end;

    this.dataSource.filterPredicate = (row: InvoiceRow): boolean => {
      // Text search - matches if search is empty OR any column contains the text
      const matchesSearch =
        !search ||
        row.invoiceNo.toLowerCase().includes(search) ||
        row.clientName.toLowerCase().includes(search) ||
        row.status.toLowerCase().includes(search) ||
        row.date.includes(search) ||
        row.total.toFixed(2).includes(search);

      // Date range filter
      // Convert the row's date string (yyyy-mm-dd) to a Date object for comparison
      const rowDate = new Date(row.date + 'T00:00:00');

      // Check if the row falls within the selected range.
      // If only start is picked, show everything from that date onwards.
      // If only end is picked, show everything up to that date.
      // If both are picked, show everything in between (inclusive).
      const afterStart = !startDate || rowDate >= startDate;
      const beforeEnd = !endDate || rowDate <= endDate;
      const matchesDate = afterStart && beforeEnd;

      // Row only shows if BOTH conditions pass
      return matchesSearch && matchesDate;
    };

    // Material only re-runs the filter when dataSource.filter changes.
    // Since our filterPredicate doesn't use the filter string directly,
    // we set it to the current timestamp to force a re-filter every time.
    this.dataSource.filter = Date.now().toString();
  }
} // <-- class ends here, after ALL properties and methods
