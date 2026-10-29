<!DOCTYPE html>
<html lang="en" data-ng-app="adminApplication" data-ng-csp {{#devModeEnabled}}dev-mode-enabled{{/devModeEnabled}} {{#prodModeEnabled}}prod-mode-enabled{{/prodModeEnabled}}>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
    <link rel="stylesheet" href="{{contextPath}}/resources/css/source-sans-pro.css" />
    <link rel="stylesheet" href="{{contextPath}}/resources/css/bootstrap-admin.min.css" />
    <link rel="stylesheet" href="{{contextPath}}/resources/css/admin.css" />
    <link rel="stylesheet" href="{{contextPath}}/resources/bower_components/components-font-awesome/css/font-awesome.min.css" />
    {{#demoModeEnabled}}
        <title>Alf.io Demo: Open Source Event Ticketing System</title>
        <meta name="description" content="You can try Alf.io for free. Use a demo version of Alf.io's ticketing system to experience this great way to control your event and your sensitive attendee data!">
    {{/demoModeEnabled}}
    {{^demoModeEnabled}}
        <title>Authentication</title>
    {{/demoModeEnabled}}
    {{#hasRecaptchaApiKey}}
        <script src='https://www.google.com/recaptcha/api.js' nonce="{{nonce}}"></script>
    {{/hasRecaptchaApiKey}}
    <script>
        var _paq = (window._paq = window._paq || []);
        // Only send the initial pageview if the title is non-empty and not the default placeholder
        (function() {
        var _title = (document.title || '').trim();
        if (_title !== '' && _title !== 'Ticketing - AFK Hosting') {
            _paq.push(["trackPageView"]);
        }
        })();
        _paq.push(["enableLinkTracking"]);
        (function () {
        var u = "//tags.afkhosting.win/";
        _paq.push(["setTrackerUrl", u + "tag.php"]);
        _paq.push(["setSiteId", "bpnkLNVL51"]);
        var d = document,
            g = d.createElement("script"),
            s = d.getElementsByTagName("script")[0];
        g.async = true;
        g.src = u + "tag.js";
        s.parentNode.insertBefore(g, s);
        })();
    </script>
    <script type="text/javascript" src="https://tags.afkhosting.win/plugins/ClickHeat/libs/js/clickheat.js"></script><script type="text/javascript"><!-- clickHeatSite = 6;clickHeatGroup = 'FieldOfScreamsTickets';clickHeatServer = 'https://tags.afkhosting.win/index.php?module=ClickHeat&action=click';initClickHeat(); //-->
    </script>
    <script>
        // Matomo SPA navigation tracking: trigger a pageview when the app changes route
        (function () {
        function trackSpaPageView() {
            try {
            // Do not send pageview when title is empty or the default placeholder
            var _title = (document.title || '').trim();
            if (_title === '' || _title === 'Ticketing - AFK Hosting') return;
            var url = window.location.pathname + window.location.search + window.location.hash;
            // update Matomo with the current SPA URL and title, then track
            _paq.push(["setCustomUrl", url]);
            _paq.push(["setDocumentTitle", document.title]);
            _paq.push(["trackPageView"]);
            } catch (e) {
            // non-fatal: keep app working if Matomo isn't ready
            if (window.console && console.error) console.error("Matomo SPA tracking error:", e);
            }
        }

        // Wrap history methods to emit a consistent event on push/replace
        function wrapHistoryMethod(method) {
            var orig = history[method];
            history[method] = function () {
            var returnValue = orig.apply(this, arguments);
            try {
                window.dispatchEvent(new Event("spa:navigate"));
            } catch (e) {
                /* older browsers */
            }
            return returnValue;
            };
        }

        wrapHistoryMethod("pushState");
        wrapHistoryMethod("replaceState");

        // popstate and hashchange also indicate navigation
        window.addEventListener("popstate", function () {
            window.dispatchEvent(new Event("spa:navigate"));
        });
        window.addEventListener("hashchange", function () {
            window.dispatchEvent(new Event("spa:navigate"));
        });

        // When our synthetic spa:navigate event fires, let Matomo track the new page.
        // Use setTimeout 0 to ensure SPA has updated location/title first.
        window.addEventListener("spa:navigate", function () {
            setTimeout(trackSpaPageView, 0);
        });

        // Optional: if the app updates the document.title without navigation, observe it and track once.
        var titleEl = document.querySelector("title");
        if (titleEl && window.MutationObserver) {
            var titleObserver = new MutationObserver(function () {
            // Only track when title is non-empty and has changed away from the default placeholder
            var _title = (document.title || '').trim();
            if (_title !== '' && _title !== 'Ticketing - AFK Hosting') {
                trackSpaPageView();
            }
            });
            titleObserver.observe(titleEl, { childList: true });
        }
        })();
    </script>
</head>
<body>
    <div class="container">
        <div class="row">
            <div class="col-sm-10 col-sm-push-1 col-xs-12 col-md-6 col-md-push-3">
                <form role="form" name="loginForm" action="{{request.contextPath}}/authenticate" method="post">
                    <input name="_csrf" type="hidden" value="{{_csrf.token}}" />
                        <div class="page-header">
                            <h2>Authentication requested</h2>
                            {{^demoModeEnabled}}
                                <span>Please login with Username and Password</span>
                            {{/demoModeEnabled}}
                        </div>
                    {{#demoModeEnabled}}
                        <div class="alert alert-info">
                            <div class="row">
                                <div class="col-xs-1"><i class="fa fa-info-circle fa-3x"></i></div>
                                <div class="col-xs-11">This instance is in <strong>demo mode</strong>, please enter your email address, a password and click on login</div>
                            </div>
                        </div>
                    {{/demoModeEnabled}}

                    {{#failed}}
                        <div class="alert alert-danger">Unknown user or wrong password. Please try again.</div>
                    {{/failed}}
                    {{#recaptchaFailed}}
                        <div class="alert alert-danger">Recaptcha check failed. Please refresh the page.</div>
                    {{/recaptchaFailed}}
                    <div class="form-group">
                        <label for="username">{{#demoModeEnabled}}Email address{{/demoModeEnabled}}{{^demoModeEnabled}}Username{{/demoModeEnabled}}</label>
                        <input id="username" class="form-control" type="text" name="username" value="" required="required" autofocus="autofocus" autocomplete="username">
                    </div>
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input id="password" class="form-control" type="password" name="password" value="" required="required" autocomplete="current-password">
                    </div>
                    <div class="row">
                        <div class="col-md-4 col-md-push-8 col-xs-12 wMarginBottom"><button type="submit" class="btn btn-success btn-block">Login</button></div>
                        <div class="col-md-4 col-md-pull-4 col-xs-12"><button type="reset" class="btn btn-default btn-block">Cancel</button></div>
                    </div>
                    {{#hasRecaptchaApiKey}}
                        <div class="g-recaptcha" data-sitekey="{{recaptchaApiKey}}"></div>
                    {{/hasRecaptchaApiKey}}
                </form>
            </div>
        </div>
    </div>
    <script src="{{contextPath}}/resources/js/common/warning-msg.js" async="true" nonce="{{nonce}}"></script>
</body>
</html>