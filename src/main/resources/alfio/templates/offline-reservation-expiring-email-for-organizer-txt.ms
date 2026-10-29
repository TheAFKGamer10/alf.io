For event {{eventName}} the following offline reservation are going to expire soon:

{{#ticketReservations}} - {{#format-date}}{{zonedExpiration}} yyyy-MM-dd h:mm a locale:{{#i18n}}locale{{/i18n}}{{/format-date}}: {{fullName}} <{{email}}>: {{baseUrl}}/admin/#/events/{{eventShortName}}/reservation/{{id}}
 {{/ticketReservations}}