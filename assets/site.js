/* ═══════════════════════════════════════════════════════════════════════
   site.js — progressive enhancement only.

   [03 §7] G-4: answer content is server-rendered, never JS-injected.
   Nothing in this file creates content an answer engine needs to cite.
   Every behaviour here adds a layer on top of a document that is already
   complete and readable with JavaScript disabled.

   [SD-20] The performance floor is launch-blocking. One file, no
   dependencies, deferred, no framework.
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── SOURCE ATTRIBUTION ───────────────────────────────────────────────
     [09a §5] The UTM scheme tells analytics where TRAFFIC came from. This
     carries the same answer into the enquiry, so a lead is attributable
     without a dashboard: the notification reads "audit request — instagram".

     ⚠️ WHY IT RUNS FIRST AND STORES. The visitor lands on /notes/ from a
     post and submits the audit form four pages later — by then the URL has
     no UTM and document.referrer is this site. Capturing at submit time
     attributes every real lead to "direct", which is the failure this
     exists to prevent. First touch is stored once and never overwritten.

     ⛔ sessionStorage, NOT a cookie, and that is a positioning decision.
     [SD-20] makes the Lighthouse floor launch-blocking and /standard/
     publishes this site's own accessibility conformance — a consent banner
     is a real cost on the page carrying the argument. sessionStorage set
     first-party for one session, read only by this form, needs no banner
     under GDPR/PECR because it is not tracking across sites or sessions.
     ⚠️ It is also LESS capable than a cookie on purpose: a visitor who
     returns next week is "direct", and that undercount is the honest trade.

     ⛔ NOTHING IS SENT ANYWHERE. No beacon, no third party. The value sits
     in a hidden input until the visitor chooses to submit a form they were
     already filling in. [05 Page3 A4]: measurement is not a subscription. */
  var SOURCE_KEY = "src";

  function readSource() {
    /* A UTM wins outright — it is a link we placed and tagged ourselves. */
    var qs;
    try {
      qs = new URLSearchParams(window.location.search);
    } catch (e) {
      return null;
    }
    var utm = qs.get("utm_source");
    if (utm) {
      var medium = qs.get("utm_medium");
      var campaign = qs.get("utm_campaign");
      return [utm, medium, campaign].filter(Boolean).join(" / ");
    }

    /* No UTM: fall back to the referrer's host. ⚠️ This is the half that
       catches what UTMs structurally cannot — a post someone else shared,
       a forwarded link, a link stripped of its query string. */
    var ref = document.referrer;
    if (!ref) return null;
    var host;
    try {
      host = new URL(ref).hostname.replace(/^www\./, "");
    } catch (e) {
      return null;
    }
    /* Same-site navigation is not a source. */
    if (host === window.location.hostname.replace(/^www\./, "")) return null;

    /* ⭐ Named where the name is the useful answer, and the MEDIUM is named
       with it — "google / organic" and "instagram / social" are different
       kinds of arrival and collapsing both to "referral" loses the
       distinction that matters most: what you placed vs. what found you.

       ⚠️ The list stays short deliberately. It is not a referrer taxonomy —
       that is an analytics tool's job. An unlisted host reports its own
       hostname, which is a perfectly good answer. */
    var known = {
      "instagram.com": "instagram / social",
      "l.instagram.com": "instagram / social",
      "facebook.com": "facebook / social",
      "l.facebook.com": "facebook / social",
      "lm.facebook.com": "facebook / social",
      "linkedin.com": "linkedin / social",
      "lnkd.in": "linkedin / social",
      "t.co": "twitter / social",
      "x.com": "twitter / social",
      "twitter.com": "twitter / social",
      "github.com": "github / referral",
      "community.shopify.com": "shopify-community / referral",
      "google.com": "google / organic",
      "bing.com": "bing / organic",
      "duckduckgo.com": "duckduckgo / organic",
      /* ⭐ [01c §7] makes GEO a Tier-1 verdict — these are the arrivals that
         tell you whether the answer-engine play is working, and no UTM can
         ever tag them because you did not place the link. */
      "chatgpt.com": "chatgpt / ai-answer",
      "perplexity.ai": "perplexity / ai-answer",
      "claude.ai": "claude / ai-answer",
      "gemini.google.com": "gemini / ai-answer",
      "copilot.microsoft.com": "copilot / ai-answer",
    };
    return known[host] || host + " / referral";
  }

  /* First touch only — stored once per session, never overwritten. */
  var source = null;
  try {
    source = sessionStorage.getItem(SOURCE_KEY);
    if (!source) {
      source = readSource();
      if (source) sessionStorage.setItem(SOURCE_KEY, source);
    }
  } catch (e) {
    /* Private mode, or storage blocked. Fall back to this page's own
       reading — worse than first-touch, better than nothing, and it must
       never throw on a page that is otherwise fine. */
    source = readSource();
  }

  /* ⚠️ Written at submit, not at load: the Astro island and the form may
     mount in either order, and a value written too early can be clobbered
     by a browser restoring form state on back-navigation. */
  document.querySelectorAll("form[data-form]").forEach(function (form) {
    form.addEventListener("submit", function () {
      var field = form.querySelector("[data-source-field]");
      if (field && !field.value) field.value = source || "direct";
    });
  });

  /* ── Toast ────────────────────────────────────────────────────────────
     [frontend-design] The action keeps its name through the flow: the
     button says "Copy", the toast says "Copied". */
  var toastEl = document.getElementById("toast");
  var toastTimer;
  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.setAttribute("data-show", "true");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.setAttribute("data-show", "false");
    }, 2600);
  }

  /* ── Header: hairline on scroll ────────────────────────────────────────
     [Call §5.5] client input — "transparent, then solid on scroll".
     Rendered as a rule rather than a fill, to keep the calm register. */
  var header = document.querySelector(".site-header");
  if (header) {
    // ⚠️ ".stage", not ".hero" — and the difference was a real bug.
    //
    // PageHeader renders `.page-header.stage` on every interior page and
    // only adds `.hero` when size="lg", which NO page passes. So this
    // selector matched the homepage alone: every other page put a pale
    // header over its own dark stage, and the inverted treatment below
    // never fired. PageHeader's own docblock says the stage is on every
    // page "because a site where only the homepage does that reads as one
    // designed page followed by eighteen documents" — the header was the
    // one element still reading it as one page plus eighteen documents.
    //
    // `.stage` is what the dark treatment is actually keyed to, so it is
    // what decides whether the header rides over dark.
    var stage = document.querySelector(".stage");

    // On a page with a dark stage, the header rides transparent over it
    // and resolves to the paper treatment once the reader passes it.
    // Set here rather than in the template so the inverted state can
    // never render without the JS that clears it.
    if (stage) header.setAttribute("data-over", "dark");

    var onScroll = function () {
      // Switch just before the stage's bottom edge reaches the header, so
      // the wordmark never sits light-on-paper for a frame.
      var threshold = stage
        ? stage.offsetTop + stage.offsetHeight - header.offsetHeight - 8
        : 8;
      header.setAttribute(
        "data-scrolled",
        window.scrollY > threshold ? "true" : "false"
      );
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  }

  /* ── Mobile nav ───────────────────────────────────────────────────────── */
  var navToggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!open));
      navToggle.setAttribute("aria-label", open ? "Open menu" : "Close menu");
      nav.setAttribute("data-open", String(!open));
    });
    // Esc closes, and focus returns to the control that opened it.
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
        navToggle.setAttribute("aria-expanded", "false");
        nav.setAttribute("data-open", "false");
        navToggle.focus();
      }
    });
  }

  /* ── Reveal ───────────────────────────────────────────────────────────
     One orchestrated device, applied only where the sequence IS the
     content (the twelve). Reduced motion skips it entirely and the
     elements are shown — never left hidden. */
  var revealables = document.querySelectorAll("[data-reveal]");
  if (revealables.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealables.forEach(function (el) {
        el.setAttribute("data-reveal", "in");
      });
    } else {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.setAttribute("data-reveal", "in");
              io.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
      );
      revealables.forEach(function (el) {
        io.observe(el);
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     THE SCORECARD — the signature.

     [SD-12] "The reader leaves able to judge ANY Shopify developer,
              including their current one."
     [M1]    The check the reader runs on the developer they already have.

     What this does: lets the reader mark each of the twelve pass / fail /
     unsure against a store they own, keeps that state across visits, and
     exports it as a plain-text report they can send to a developer.

     What it deliberately does NOT do: gate any content. Every check's
     three-part payload is in the markup before this runs. Turn JS off
     and /criteria/ is still the complete instrument — the scorecard is
     the difference between reading it and running it.
     ═══════════════════════════════════════════════════════════════════════ */
  var scorecard = document.querySelector("[data-scorecard]");
  if (scorecard) {
    var STORE_KEY = "tj_scorecard_v1";
    var checks = Array.prototype.slice.call(
      scorecard.querySelectorAll(".check[data-check-id]")
    );
    var rail = document.querySelector(".scorecard-rail");
    var state = {};

    function load() {
      try {
        state = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      } catch (e) {
        state = {};
      }
      if (typeof state !== "object" || state === null) state = {};
    }

    function save() {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(state));
      } catch (e) {
        /* Private browsing or storage full. The scorecard still works for
           the session; it just will not persist. Nothing to report. */
      }
    }

    function counts() {
      var c = { pass: 0, fail: 0, unsure: 0 };
      Object.keys(state).forEach(function (k) {
        if (c[state[k]] !== undefined) c[state[k]]++;
      });
      return c;
    }

    function render() {
      // Per-check controls
      checks.forEach(function (el) {
        var id = el.getAttribute("data-check-id");
        var current = state[id] || "";
        el.setAttribute("data-state", current);
        el.querySelectorAll(".check-state-btn").forEach(function (btn) {
          btn.setAttribute(
            "aria-pressed",
            String(btn.getAttribute("data-state") === current)
          );
        });
      });

      if (!rail) return;

      var c = counts();
      var marked = c.pass + c.fail + c.unsure;
      var total = checks.length;

      rail.querySelector('[data-tally="pass"]').textContent = c.pass;
      rail.querySelector('[data-tally="fail"]').textContent = c.fail;
      rail.querySelector('[data-tally="unsure"]').textContent = c.unsure;

      rail.querySelector('[data-seg="pass"]').style.width =
        (c.pass / total) * 100 + "%";
      rail.querySelector('[data-seg="fail"]').style.width =
        (c.fail / total) * 100 + "%";
      rail.querySelector('[data-seg="unsure"]').style.width =
        (c.unsure / total) * 100 + "%";

      var hint = rail.querySelector("[data-hint]");
      if (hint) {
        hint.textContent =
          marked === 0
            ? "Nothing marked yet"
            : marked + " of " + total + " marked";
      }

      // The export and reset controls only mean anything once there is
      // something to export. Empty states are an invitation, not a
      // disabled button with no explanation.
      var exportBtn = rail.querySelector("[data-export]");
      // ⚠️ NOT rail.querySelector — [data-reset] moved OUT of the rail on
      // 2026-09-12 so it is not a thumb's width from Copy on a phone.
      // Scoping this to the rail silently broke the Clear button.
      var resetBtn = document.querySelector("[data-reset]");
      if (exportBtn) exportBtn.hidden = marked === 0;
      if (resetBtn) resetBtn.hidden = marked === 0;
    }

    function setState(id, value) {
      if (state[id] === value) {
        delete state[id]; // Clicking the active state clears it.
      } else {
        state[id] = value;
      }
      save();
      render();

      // I1 — funnel event. The scorecard being used is the leading
      // indicator that [SD-12] is working: the instrument is being run,
      // not just read.
      if (window.tjTrack) {
        window.tjTrack("criteria_check_marked", {
          check: id,
          state: state[id] || "cleared",
          marked_total: counts().pass + counts().fail + counts().unsure,
        });
      }
    }

    scorecard.addEventListener("click", function (e) {
      var btn = e.target.closest(".check-state-btn");
      if (!btn) return;
      var check = btn.closest(".check[data-check-id]");
      if (!check) return;
      setState(check.getAttribute("data-check-id"), btn.getAttribute("data-state"));
    });

    /* ── Export ───────────────────────────────────────────────────────────
       The instrument leaves with the reader. Plain text, because the
       destination is an email to a developer — not a PDF nobody opens. */
    function buildReport() {
      var c = counts();
      var lines = [];
      var when = new Date().toISOString().slice(0, 10);

      lines.push("THE STANDARD — SCORECARD");
      lines.push("Run on: " + (storeLabel() || "(store not named)"));
      lines.push("Date: " + when);
      lines.push("");
      lines.push(
        "Passed: " + c.pass + "   Failed: " + c.fail + "   Unsure: " + c.unsure +
        "   Not marked: " + (checks.length - c.pass - c.fail - c.unsure)
      );
      lines.push("");
      lines.push("--------------------------------------------------");
      lines.push("");

      checks.forEach(function (el) {
        var id = el.getAttribute("data-check-id");
        var n = el.getAttribute("data-check-n");
        var title = el.getAttribute("data-check-title");
        var mark = state[id];
        var label =
          mark === "pass" ? "PASS" :
          mark === "fail" ? "FAIL" :
          mark === "unsure" ? "UNSURE" : "—";
        lines.push(label.padEnd(8) + n + "  " + title);
      });

      lines.push("");
      lines.push("--------------------------------------------------");
      lines.push("");
      lines.push("What these checks miss:");
      lines.push("They do not tell you whether the design is right, they");
      lines.push("cannot predict how a third-party app behaves after an");
      lines.push("update, and they assess the store rather than the person.");
      lines.push("");
      lines.push("The full criteria, with how to run each check:");
      lines.push("https://tajumal.com/criteria/");

      return lines.join("\n");
    }

    function storeLabel() {
      var input = document.querySelector("[data-store-label]");
      return input && input.value ? input.value.trim() : "";
    }

    var exportBtn = document.querySelector("[data-export]");
    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        var text = buildReport();
        var done = function () {
          toast("Scorecard copied — paste it into an email");
          if (window.tjTrack) {
            window.tjTrack("criteria_scorecard_exported", counts());
          }
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, fallbackCopy);
        } else {
          fallbackCopy();
        }
        function fallbackCopy() {
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          try {
            document.execCommand("copy");
            done();
          } catch (err) {
            toast("Copy failed — select the text and copy it manually");
          }
          document.body.removeChild(ta);
        }
      });
    }

    var resetBtn = document.querySelector("[data-reset]");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        state = {};
        save();
        render();
        toast("Scorecard cleared");
      });
    }

    // The rail is meaningless without JS, so it ships hidden and is
    // revealed here. The document underneath it is complete either way.
    if (rail) rail.hidden = false;
    // The row under the rail — the store label and Clear — is meaningless
    // without JS for the same reason the rail is.
    var below = document.querySelector("[data-scorecard-below]");
    if (below) below.hidden = false;
    document.querySelectorAll(".check__control").forEach(function (el) {
      el.hidden = false;
    });

    load();
    render();
  }

  /* ═══════════════════════════════════════════════════════════════════════
     [03b C8] BOOKING — the performance guard.

     "The Calendly embed is the heaviest third-party script on the site
      and the site's speed IS the argument [X1]. Link-out or lazy-mounted
      island, NEVER a blocking embed."

     Resolved as: lazy-mounted on explicit user intent. Nothing from
     calendly.com is requested until the reader asks for it, and the
     link-out remains as the no-JS path.
     ═══════════════════════════════════════════════════════════════════════ */
  var bookingMount = document.querySelector("[data-booking-mount]");
  if (bookingMount) {
    var trigger = document.querySelector("[data-booking-open]");
    var loaded = false;

    var mount = function () {
      if (loaded) return;
      loaded = true;

      var url = bookingMount.getAttribute("data-booking-mount");
      var frame = document.createElement("iframe");
      frame.src = url + "?hide_gdpr_banner=1&embed_domain=" + location.hostname +
                  "&embed_type=Inline";
      frame.title = "Booking calendar — choose a 30-minute slot";
      frame.style.width = "100%";
      frame.style.height = "44rem";
      frame.style.border = "0";
      frame.loading = "lazy";

      bookingMount.textContent = "";
      bookingMount.appendChild(frame);

      if (trigger) trigger.hidden = true;
      if (window.tjTrack) window.tjTrack("call_booking_opened", {});
    };

    if (trigger) trigger.addEventListener("click", mount);
  }

  /* ── Conversion events on outbound doors ─────────────────────────────── */
  document.querySelectorAll("[data-event]").forEach(function (el) {
    el.addEventListener("click", function () {
      if (window.tjTrack) {
        window.tjTrack(el.getAttribute("data-event"), {
          label: (el.textContent || "").trim().slice(0, 80),
          href: el.getAttribute("href") || "",
        });
      }
    });
  });

  /* ── Forms: validation messages that say what to fix ──────────────────
     [frontend-design] "Errors don't apologize, and they are never vague
     about what happened." Native validation is kept; the message is
     placed beside the field rather than in a browser bubble. */
  document.querySelectorAll("form[data-validate]").forEach(function (form) {
    form.setAttribute("novalidate", "");
    form.addEventListener("submit", function (e) {
      var firstInvalid = null;
      form.querySelectorAll("input, textarea, select").forEach(function (input) {
        var field = input.closest(".field");
        if (!field) return;
        var ok = input.checkValidity();
        field.setAttribute("data-invalid", String(!ok));
        input.setAttribute("aria-invalid", String(!ok));
        if (!ok && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) {
        e.preventDefault();
        firstInvalid.focus();
        return;
      }
      if (window.tjTrack) {
        window.tjTrack(form.getAttribute("data-event") || "form_submitted", {
          form: form.getAttribute("name") || "unnamed",
        });
      }
    });

    // Clear the error the moment it is fixed, not on the next submit.
    form.addEventListener("input", function (e) {
      var field = e.target.closest(".field");
      if (field && field.getAttribute("data-invalid") === "true" && e.target.checkValidity()) {
        field.setAttribute("data-invalid", "false");
        e.target.setAttribute("aria-invalid", "false");
      }
    });
  });
})();
