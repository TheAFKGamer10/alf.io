{{#i18n}}email.hello [{{ticket.fullName}}]{{/i18n}}
{{#render-markdown}}{{custom-header-text}}.text{{/render-markdown}}
{{#i18n}}email-ticket.attached [{{event.displayName}}]{{/i18n}}

{{#i18n}}email-confirmation.reservationURL [{{ticketUrl}}]{{/i18n}}
{{#render-markdown}}{{custom-body-text}}.text{{/render-markdown}}
#### {{#i18n}}email.event-info{{/i18n}} ####

{{#i18n}}email.event-reminder-location{{/i18n}}

 {{#event.locationPlainText}}{{event.locationPlainText}}{{/event.locationPlainText}}{{^event.locationPlainText}}{{event.location}}{{/event.locationPlainText}}

{{#i18n}}email.event-reminder-date{{/i18n}}

 {{#validitySameDay}}{{#format-date}}{{validityStart}} EEEE, MMMM d, yyyy{{/format-date}} from {{#format-date}}{{validityStart}} h:mm a{{/format-date}} to {{#format-date}}{{validityEnd}} h:mm a (z){{/format-date}}{{/validitySameDay}}{{^validitySameDay}}{{#format-date}}{{validityStart}} EEEE, MMMM d, yyyy{{/format-date}} at {{#format-date}}{{validityStart}} h:mm a{{/format-date}} - {{#format-date}}{{validityEnd}} EEEE, MMMM d, yyyy{{/format-date}} at {{#format-date}}{{validityEnd}} h:mm a (z){{/format-date}} {{/validitySameDay}}

{{#i18n}}email-ticket.add-to-calendar [{{googleCalendarUrl}}]{{/i18n}}
{{#render-markdown}}{{custom-footer-text}}.text{{/render-markdown}}
{{#i18n}}email.kind-regards{{/i18n}}
{{organization.name}} <{{organization.email}}>

{{#hasMailFooter}}{{#render-markdown}}{{mailFooter}}.text{{/render-markdown}}{{/hasMailFooter}}