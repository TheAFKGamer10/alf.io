{{#i18n}}email.hello [{{subscription.fullName}}]{{/i18n}}

{{#i18n}}email-waiting-queue-acquired.text [{{event.displayName}}] [{{reservationUrl}}]{{/i18n}}

#### {{#i18n}}email-waiting-queue-acquired.warning[{{#format-date}}{{reservationTimeout}} EEEE, MMMM d, yyyy locale:{{#i18n}}locale{{/i18n}}{{/format-date}}] [{{#format-date}}{{reservationTimeout}} h:mm a (z){{/format-date}}]{{/i18n}} ####


#### {{#i18n}}email.event-info{{/i18n}} ####

{{#i18n}}email.event-reminder-location{{/i18n}}

 {{#event.locationPlainText}}{{event.locationPlainText}}{{/event.locationPlainText}}{{^event.locationPlainText}}{{event.location}}{{/event.locationPlainText}}

{{#i18n}}email.event-reminder-date{{/i18n}}

{{#event.sameDay}}{{#i18n}}event-days.same-day [{{#format-date}}{{event.begin}} EEEE, MMMM d, yyyy locale:{{#i18n}}locale{{/i18n}}{{/format-date}}] [{{#format-date}}{{event.begin}} h:mm a{{/format-date}}] [{{#format-date}}{{event.end}} h:mm a (z){{/format-date}}] {{/i18n}}{{/event.sameDay}}{{^event.sameDay}}{{#i18n}}event-days.not-same-day [{{#format-date}}{{event.begin}} EEEE, MMMM d, yyyy locale:{{#i18n}}locale{{/i18n}}{{/format-date}}] [{{#format-date}}{{event.begin}} h:mm a{{/format-date}}]{{/i18n}} - {{#i18n}}event-days.not-same-day [{{#format-date}}{{event.end}} EEEE, MMMM d, yyyy locale:{{#i18n}}locale{{/i18n}}{{/format-date}}] [{{#format-date}}{{event.end}} h:mm a (z){{/format-date}}]{{/i18n}} {{/event.sameDay}}

{{#i18n}}email.kind-regards{{/i18n}}

{{organization.name}} <{{organization.email}}>
{{#hasMailFooter}}{{#render-markdown}}{{mailFooter}}.text{{/render-markdown}}{{/hasMailFooter}}