import { CUSTOM_ELEMENTS_SCHEMA, Component, signal, type OnDestroy } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { SUB, configure } from '@sub/angular'
import { demos, formEntries, rendered } from '../../shared/gallery'
import { frameworkLinks } from '../../shared/frameworks'
import { GalleryComponent } from './gallery.component'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SUB, FormsModule, GalleryComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <main class="page">
      <header class="top">
        <h1>SUB × Angular</h1>
        <p class="status" data-status [attr.data-ok]="status().ok === status().total">
          {{ status().ok }} / {{ status().total }} components rendered
          @if (status().missing.length) { (missing: {{ status().missing.join(', ') }}) }
        </p>
        <ul class="frameworks">
          @for (f of frameworks; track f.id) {
            <li><a [href]="f.href" [attr.aria-current]="f.current ? 'page' : null">{{ f.name }}</a></li>
          }
        </ul>
      </header>

      <section class="checks" aria-label="Framework checks">
        <article class="card" data-check="binding">
          <h2>Two-way binding</h2>
          <div class="preview">
            <div class="stack">
              <sub-input label="Your name" [(ngModel)]="name"></sub-input>
              <sub-switch label="Email alerts" [(ngModel)]="alerts"></sub-switch>
              <sub-select label="Plan" [(ngModel)]="plan">
                <sub-option value="free">Free</sub-option>
                <sub-option value="pro">Pro</sub-option>
              </sub-select>
              <sub-button variant="secondary" (click)="reset()">Reset</sub-button>
            </div>
          </div>
          <output class="log" data-test="mirror">name={{ name }} · alerts={{ alerts }} · plan={{ plan }}</output>
        </article>

        <article class="card" data-check="form">
          <h2>Native form</h2>
          <div class="preview">
            <form class="stack" ngNoForm (submit)="submit($event)">
              <sub-input name="email" label="Email" type="email" value="ada@example.com"></sub-input>
              <sub-select name="size" label="Size" value="m">
                <sub-option value="s">Small</sub-option>
                <sub-option value="m">Medium</sub-option>
              </sub-select>
              <sub-switch name="news" label="Newsletter" checked></sub-switch>
              <sub-button type="submit">Send</sub-button>
            </form>
          </div>
          <output class="log" data-test="form-result">{{ sent() }}</output>
        </article>

        <article class="card" data-check="router">
          <h2>Router</h2>
          <div class="preview">
            <div class="stack">
              <sub-breadcrumbs label="Breadcrumb">
                <a href="/">Home</a>
                <a href="/docs">Docs</a>
                <span>Guide</span>
              </sub-breadcrumbs>
              <sub-nav-menu label="Sections">
                <a href="/profile" (click)="profile($event)">Profile</a>
              </sub-nav-menu>
              <sub-button href="/settings">Settings</sub-button>
            </div>
          </div>
          <output class="log" data-test="route">Route: {{ route() }}</output>
        </article>
      </section>

      <h2 class="section-title">Every component ({{ count }})</h2>
      <app-gallery></app-gallery>
    </main>
  `,
})
export class AppComponent implements OnDestroy {
  readonly count = demos.length
  readonly frameworks = frameworkLinks('angular')
  readonly status = signal(rendered())
  readonly sent = signal('(not sent)')
  readonly route = signal('/')
  // two-way binding through the generated value accessors ([(ngModel)])
  name = 'Ada'
  alerts = true
  plan = 'pro'
  private readonly timer = setInterval(() => this.status.set(rendered()), 300)

  constructor() {
    configure({ navigate: (href) => void this.route.set(href) })
  }

  reset(): void {
    this.name = 'Ada'
    this.alerts = true
    this.plan = 'pro'
  }

  submit(event: Event): void {
    event.preventDefault()
    this.sent.set(formEntries(event.currentTarget as HTMLFormElement))
  }

  profile(event: Event): void {
    event.preventDefault()
    this.route.set('/profile (link handler)')
  }

  ngOnDestroy(): void {
    clearInterval(this.timer)
    configure({ navigate: undefined })
  }
}
