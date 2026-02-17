import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FilterGrid } from './filter-grid/filter-grid';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FilterGrid],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('filter-grid');
}
