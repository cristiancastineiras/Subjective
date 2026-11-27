import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef, Component, ElementRef, inject, type AfterViewInit } from '@angular/core'
import { SUB } from '@sub/angular'
import { demos, describe } from '../../shared/gallery'

/**
 * Every demo compiled by Angular: the template is generated from the playground demos (Angular only renders markup
 * it compiled), every <sub-*> gets its @sub/angular directive (typed inputs, outputs), and each event is logged.
 */
@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [SUB],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './generated/gallery.html',
  host: { class: 'grid' },
})
export class GalleryComponent implements AfterViewInit {
  readonly logs: Record<string, string> = {}
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement
  private readonly changes = inject(ChangeDetectorRef)

  log(id: string, event: Event): void {
    this.write(id, describe(event))
  }

  private write(id: string, line: string): void {
    this.logs[id] = line
    this.changes.markForCheck()
  }

  /** the playground demos' own wiring (rows of a table...), once Angular rendered them */
  ngAfterViewInit(): void {
    for (const demo of demos) {
      const preview = this.host.querySelector<HTMLElement>(`[data-preview="${demo.id}"]`)
      if (preview) demo.setup?.(preview, (line) => this.write(demo.id, line))
    }
  }
}
