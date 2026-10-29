import {Component, Input} from '@angular/core';
import {Event} from '../model/event';
import {TranslateService} from '@ngx-translate/core';
import {DateValidity} from '../model/date-validity';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-event-summary',
  templateUrl: './event-summary.component.html'
})
export class EventSummaryComponent {

  @Input()
  event: Event;

  @Input()
  dateValidityProvider: DateValidity;

  constructor(public translate: TranslateService, private sanitizer: DomSanitizer) { }

  get isEventOnline(): boolean {
    return this.event.format === 'ONLINE';
  }

  /**
   * Extracts the content within the first <a> tag in the event location HTML, or returns the plain text if no <a> tag is present.
   * This is useful for plain text emails, calendar locations, etc.
   */
  get locationPlainText(): string {
    if (!this.event || !this.event.location) return '';
    // Try to extract first <a ...>text</a> and its href
    const anchorMatch = this.event.location.match(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/i);
    if (anchorMatch && anchorMatch[1]) {
      const href = anchorMatch[1].trim();
      const body = (anchorMatch[2] || '').replace(/<[^>]+>/g, '').trim();
      if (body) return `${body} (${href})`;
      return href;
    }
    // Fallback: strip any HTML tags
    return this.event.location.replace(/<[^>]+>/g, '').trim();
  }

  /** Returns the event location as sanitized HTML for binding to [innerHTML] */
  get locationHtml(): SafeHtml {
    if (!this.event || !this.event.location) return '' as any;
    return this.sanitizer.bypassSecurityTrustHtml(this.event.location);
  }

  /** Returns the event description (if present) as sanitized HTML for binding to [innerHTML] */
  get descriptionHtml(): SafeHtml {
    // some events use `description` or `longDescription` — attempt both
    const raw = (this.event && (this.event.description || (this.event as any).longDescription)) || '';

    let desc = '';
    if (typeof raw === 'string') {
      desc = raw;
    } else if (raw && typeof raw === 'object') {
      // Prefer the current language if present, otherwise pick the first string value
      const lang = (this.translate && this.translate.currentLang) ? this.translate.currentLang : undefined;
      if (lang && raw[lang] && typeof raw[lang] === 'string') {
        desc = raw[lang];
      } else {
        const vals = Object.values(raw).filter(v => typeof v === 'string' && v.trim());
        if (vals.length) desc = vals[0] as string;
      }
    } else {
      desc = '';
    }

    if (!desc) return '' as any;
    return this.sanitizer.bypassSecurityTrustHtml(desc);
  }
}


