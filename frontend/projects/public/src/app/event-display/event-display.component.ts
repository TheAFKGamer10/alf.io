import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {EventService} from '../shared/event.service';
import {ActivatedRoute, Router} from '@angular/router';
import {UntypedFormArray, UntypedFormBuilder, UntypedFormGroup} from '@angular/forms';
import {ReservationService} from '../shared/reservation.service';
import {Event as AlfioEvent} from '../model/event';
import {TranslateService} from '@ngx-translate/core';
import {TicketCategory} from '../model/ticket-category';
import {ReservationRequest} from '../model/reservation-request';
import {handleServerSideValidationError} from '../shared/validation-helper';
import {debounceTime, Subject, Subscription, zip} from 'rxjs';
import {AdditionalService} from '../model/additional-service';
import {I18nService} from '../shared/i18n.service';
import {WaitingListSubscriptionRequest} from '../model/waiting-list-subscription-request';
import {ItemsByCategory, TicketCategoryForWaitingList} from '../model/items-by-category';
import {DynamicDiscount, EventCode} from '../model/event-code';
import {AnalyticsService} from '../shared/analytics.service';
import {ErrorDescriptor} from '../model/validated-response';
import {SearchParams} from '../model/search-params';
import {FeedbackService} from "../shared/feedback/feedback.service";

@Component({
  selector: 'app-event-display',
  templateUrl: './event-display.component.html',
  styleUrls: ['./event-display.component.scss']
})
export class EventDisplayComponent implements OnInit, OnDestroy {

  event: AlfioEvent;
  ticketCategories: TicketCategory[];
  expiredCategories: TicketCategory[];
  //
  supplementCategories: AdditionalService[];
  donationCategories: AdditionalService[];
  //
  reservationForm: UntypedFormGroup;
  globalErrors: ErrorDescriptor[] = [];
  //
  ticketCategoryAmount: {[key: number]: number[]};
  //

  //
  preSales: boolean;
  waitingList: boolean;
  ticketCategoriesForWaitingList: TicketCategoryForWaitingList[];
  waitingListForm: UntypedFormGroup;
  waitingListRequestSubmitted: boolean;
  waitingListRequestResult: boolean;
  //

  eventCode: EventCode;
  eventCodeError: boolean;

  displayPromoCodeForm: boolean;
  promoCodeForm: UntypedFormGroup;
  @ViewChild('promoCode')
  promoCodeElement: ElementRef<HTMLInputElement>;
  @ViewChild('tickets')
  tickets: ElementRef<HTMLDivElement>;
  expiredCategoriesExpanded = false;

  private dynamicDiscount: DynamicDiscount;
  private refreshDebouncer = new Subject<any>();
  private subscription?: Subscription;
  private promoCodeSubscription?: Subscription; //Fix for #1437

  submitInProgress: boolean = false;
  refreshInProgress: boolean = false;

  // https://alligator.io/angular/reactive-forms-formarray-dynamic-fields/

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private reservationService: ReservationService,
    private formBuilder: UntypedFormBuilder,
    public translate: TranslateService,
    private i18nService: I18nService,
    private analytics: AnalyticsService,
    private feedbackService: FeedbackService) { }

  ngOnInit(): void {
    // Ensure a default translation exists for the Fast Pass summary label so the UI shows a friendly label
    // even if the server-provided translation bundle doesn't include it yet. Merge with existing translations.
    const fallback = { 'show-event.fast-pass': 'Fast Pass' };
    try {
      this.translate.setTranslation(this.translate.currentLang || 'en', fallback, true);
    } catch (e) {
      // noop - if translate service isn't ready yet, ignore
    }
    this.subscription = this.refreshDebouncer
        .pipe(debounceTime(500))
        .subscribe(() => this.doRefreshCategories());
    const code = this.route.snapshot.queryParams['code'];
    const errors = this.route.snapshot.queryParams['errors'];
    if (errors) {
      this.globalErrors = errors.split(',').map(val => { const ed = new ErrorDescriptor(); ed.code = val; return ed; });
    }

    this.route.params.subscribe(params => {
      const eventShortName = params['eventShortName'];

      zip(this.eventService.getEvent(eventShortName), this.eventService.getEventTicketsInfo(eventShortName)).subscribe( ([event, itemsByCat]) => {
        this.event = event;

        this.i18nService.setPageTitle('show-event.header.title', event);

        this.reservationForm = this.formBuilder.group({
          reservation: this.formBuilder.array(this.createItems(itemsByCat.ticketCategories)),
          additionalService: this.formBuilder.array([]),
          captcha: null,
          promoCode: null
        });

        this.promoCodeForm = this.formBuilder.group({
          promoCode: this.formBuilder.control(code)
        });

	// Added for #1437
        this.promoCodeSubscription = this.promoCodeForm.get('promoCode').valueChanges
	  .subscribe(value => {
	    if (value) {
	      this.promoCodeForm.get('promoCode').setValue(value.toUpperCase(), { emitEvent: false });
	  }
	});

        this.applyItemsByCat(itemsByCat);
        this.analytics.pageView(event.analyticsConfiguration);

        if (code) {
          this.internalApplyPromoCode(code, err => this.globalErrors = err);
        }
      });
    });
  }

  ngOnDestroy() {
      this.subscription?.unsubscribe();
      this.promoCodeSubscription?.unsubscribe(); //Added for #1437
  }

  private applyItemsByCat(itemsByCat: ItemsByCategory) {
    this.ticketCategories = itemsByCat.ticketCategories;
    this.expiredCategories = itemsByCat.expiredCategories || [];

    this.ticketCategoryAmount = {};
    this.ticketCategories.forEach(tc => {
      this.ticketCategoryAmount[tc.id] = [];
      // Allow user to select more than the promo-limited maximum. We'll still show how many tickets will be discounted.
      const availableFallback = itemsByCat.maxTicketsPerReservation ?? 10;
      const available = tc.availableTickets == null ? availableFallback : tc.availableTickets;
      // keep the UI selectable up to the general available limit (not strictly the promo-limited maximum)
      const maxSelectable = Math.min(available, availableFallback);
      for (let i = 0; i <= maxSelectable; i++) {
        this.ticketCategoryAmount[tc.id].push(i);
      }
      // store how many discounted slots remain for UI hint (maximumSaleableTickets already factors promo remaining slots)
      // if maximumSaleableTickets is null, treat as 0 (no promo limits)
      (this as any).discountedRemaining = (this as any).discountedRemaining || {};
      (this as any).discountedRemaining[tc.id] = tc.maximumSaleableTickets ?? 0;
    });

    this.supplementCategories = itemsByCat.additionalServices.filter(e => e.type === 'SUPPLEMENT');
    this.donationCategories = itemsByCat.additionalServices.filter(e => e.type === 'DONATION');

    this.preSales = itemsByCat.preSales;
    this.waitingList = itemsByCat.waitingList;
    this.ticketCategoriesForWaitingList = itemsByCat.ticketCategoriesForWaitingList;

    this.createWaitingListFormIfNecessary();
  }

  private createWaitingListFormIfNecessary() {
    if (this.waitingList && !this.waitingListForm) {
      this.waitingListForm = this.formBuilder.group({
        firstName: null,
        lastName: null,
        email: null,
        selectedCategory: null,
        userLanguage: null,
        termAndConditionsAccepted: null,
        privacyPolicyAccepted: null,
        waiverAccepted: null
      });
    }
  }

  private createItems(ticketCategories: TicketCategory[]): UntypedFormGroup[] {
    return ticketCategories.map(category => this.formBuilder.group({ticketCategoryId: category.id, amount: 0}));
  }

  submitForm(eventShortName: string, reservation: ReservationRequest) {
    if (this.submitInProgress) {
        // ignoring click, as there is a pending request
        return;
    }
    this.submitInProgress = true;
    const request = reservation;
    if (reservation.additionalService != null && reservation.additionalService.length > 0) {
      request.additionalService = reservation.additionalService.filter(as => (as.amount != null && as.amount > 0) || (as.quantity != null && as.quantity > 0));
    }
    this.reservationService.reserveTickets(eventShortName, request, this.translate.currentLang).subscribe({
        next: res => {
            if (res.success) {
                this.router.navigate(['event', eventShortName, 'reservation', res.value, 'book'], {
                    queryParams: SearchParams.transformParams(this.route.snapshot.queryParams, this.route.snapshot.params)
                });
            }
            this.submitInProgress = false;
        },
        error: err => {
            this.submitInProgress = false;
            this.globalErrors = handleServerSideValidationError(err, this.reservationForm);
            this.scrollToTickets();
        }
    });
  }

  private scrollToTickets(): void {
    // Delay to ensure DOM is rendered/updated (forms, details, ngFor, etc.)
    setTimeout(() => {
      try {
        const fragment = this.route.snapshot.fragment;
        if (fragment) {
          const target = document.getElementById(fragment);
          if (target) {
            // If the target is inside a Fast Pass <details> (or any details), open it first
            const details = target.closest('details.fast-pass-details, details');
            if (details && (details as HTMLDetailsElement).open === false) {
              (details as HTMLDetailsElement).open = true;
            }

            // Scroll the specific target into view
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
        }

        // Fallback: scroll to the tickets anchor
        if (this.tickets?.nativeElement != null) {
          this.tickets.nativeElement.scrollIntoView(true);
        }
      } catch (e) {
        // If anything goes wrong, fall back to the original behavior
        if (this.tickets?.nativeElement != null) {
          this.tickets.nativeElement.scrollIntoView(true);
        }
      }
    }, 10);
  }

  submitWaitingListRequest(eventShortName: string, waitingListSubscriptionRequest: WaitingListSubscriptionRequest) {

    this.eventService.submitWaitingListSubscriptionRequest(eventShortName, waitingListSubscriptionRequest).subscribe(res => {
      this.waitingListRequestSubmitted = true;
      this.waitingListRequestResult = res.value;
    }, (err) => {
      this.globalErrors = handleServerSideValidationError(err, this.waitingListForm);
    });
  }

  handleRecaptchaResponse(recaptchaValue: string): void {
    this.reservationForm.get('captcha').setValue(recaptchaValue);
  }

  private internalApplyPromoCode(promoCode: string, errorHandler: ((errors: ErrorDescriptor[]) => void)): void {
    this.globalErrors = [];
    this.eventCodeError = false;

    if (promoCode === null || promoCode === undefined || promoCode.trim() === '') {
      return;
    }

    this.eventService.validateCode(this.event.shortName, promoCode).subscribe(res => {
      if (res.success) {
        // this.router.navigate([], {relativeTo: this.route, queryParams: {code: promoCode}, queryParamsHandling: "merge"})
        // TODO, set promo code in url, fetch ticket category, rebuild the reservationForm.reservation

        //
        this.reloadTicketsInfo(promoCode, res.value);
        this.displayPromoCodeForm = false;
        //
      } else {
        this.eventCode = null; // should never enter here
        this.reservationForm.get('promoCode').setValue(null);
      }
    }, (err) => {
      errorHandler(handleServerSideValidationError(err, this.promoCodeForm));
      this.eventCode = null;
      this.reloadTicketsInfo(null, null);
      this.eventCodeError = true;
    });
  }

  applyPromoCode(): void {
    const promoCode = this.promoCodeForm.get('promoCode').value;
    this.globalErrors = [];
    this.internalApplyPromoCode(promoCode, () => {});
  }

  removePromoCode(): void {
    this.reloadTicketsInfo(null, null);
  }

  togglePromoCodeVisible(): void {
    this.displayPromoCodeForm = !this.displayPromoCodeForm;
    if (this.displayPromoCodeForm) {
      setTimeout(() => this.promoCodeElement.nativeElement.focus(), 200);
    } else {
      this.promoCodeForm.get('promoCode').setValue(null);
    }
  }

  ticketsLeftCountVisible(): boolean {
     return this.event.availableTicketsCount != null
       && this.event.availableTicketsCount > 0
       && this.ticketCategories.every(tc => !tc.bounded);
  }

  reservationFormItem(parent: UntypedFormGroup, counter: number): UntypedFormGroup {
    return (parent.get('reservation') as UntypedFormArray).at(counter) as UntypedFormGroup;
  }

  ticketsLeftCountVisibleForCategory(category: TicketCategory): boolean {
    return category.availableTickets != null && category.availableTickets > 0;
  }

  private reloadTicketsInfo(promoCode: string | null, eventCode: EventCode) {
    this.eventService.getEventTicketsInfo(this.event.shortName, promoCode).subscribe(itemsByCat => {
      this.reservationForm.get('promoCode')!.setValue(promoCode);
      this.reservationForm.setControl('reservation', this.formBuilder.array(this.createItems(itemsByCat.ticketCategories)));
      this.applyItemsByCat(itemsByCat);
      this.eventCode = eventCode;
      if (eventCode != null) {
        this.scrollToTickets();
      }
    });
  }

  promoCodeOnEnter(ev: Event) {
    ev.preventDefault();
    if (this.promoCodeForm.invalid) {
      return;
    }
    this.applyPromoCode();
  }

  selectionChange(): void {
    if (this.eventCode == null || this.eventCode.type === 'ACCESS') {
      this.reservationService.checkDynamicDiscountAvailability(this.event.shortName, this.reservationForm.value)
        .subscribe(d => {
          this.dynamicDiscount = d;
        });
    }
  }

  get dynamicDiscountMessage(): string {
    if (this.dynamicDiscount != null) {
      return this.dynamicDiscount.formattedMessage[this.translate.currentLang];
    }
    return null;
  }

  get isEventOnline(): boolean {
    return this.event.format === 'ONLINE';
  }

  public displayOnlineTicketTag(category: TicketCategory): boolean {
    return this.event.format === 'HYBRID' && category.ticketAccessType === 'ONLINE';
  }

  get displayMap(): boolean {
    return (this.event.mapUrl?.length > 0) && !this.isEventOnline;
  }

  handleRefreshCommand() {
    this.refreshDebouncer.next(null);
  }

  /** Number of ticket categories whose name starts with 'Fast Pass:' */
  get fastPassCount(): number {
    if (!this.ticketCategories) {
      return 0;
    }
    return this.ticketCategories.filter(tc => tc.name && tc.name.startsWith('Fast Pass:')).length;
  }

  /** Whether there are any Fast Pass ticket categories */
  get hasFastPass(): boolean {
    return this.fastPassCount > 0;
  }

  private doRefreshCategories() {
    this.refreshInProgress = true;
    this.eventService.getEventTicketsInfo(this.event.shortName)
        .subscribe(itemsByCat => {
            this.applyItemsByCat(itemsByCat);
            this.feedbackService.showSuccess('show-event.category-refresh.complete');
            this.refreshInProgress = false;
        })
  }
}
