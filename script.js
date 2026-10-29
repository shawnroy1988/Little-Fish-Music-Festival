(function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  var desktop = window.matchMedia("(min-width: 900px)");

  function setOpen(open) {
    if (!toggle || !nav) return;
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("nav-open", open);
    if (!open && document.activeElement && nav.contains(document.activeElement)) {
      toggle.focus();
    }
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener("click", function (event) {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(event.target) || toggle.contains(event.target)) return;
      setOpen(false);
    });

    function onDesktopChange(event) {
      if (event.matches) setOpen(false);
    }

    if (typeof desktop.addEventListener === "function") {
      desktop.addEventListener("change", onDesktopChange);
    } else if (typeof desktop.addListener === "function") {
      desktop.addListener(onDesktopChange);
    }
  }

  var navLinks = nav ? Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]')) : [];
  var sections = navLinks
    .map(function (link) { return document.querySelector(link.getAttribute("href")); })
    .filter(Boolean);

  function setActive(id) {
    navLinks.forEach(function (link) {
      var on = link.getAttribute("href") === id;
      if (on) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  if (sections.length && "IntersectionObserver" in window) {
    var current = "#home";
    var observer = new IntersectionObserver(function (entries) {
      var visible = entries
        .filter(function (entry) { return entry.isIntersecting; })
        .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; })[0];
      if (!visible) return;
      current = "#" + visible.target.id;
      setActive(current);
    }, { rootMargin: "-20% 0px -55% 0px", threshold: [0.15, 0.4, 0.7] });

    sections.forEach(function (section) { observer.observe(section); });

    navLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        setActive(link.getAttribute("href"));
      });
    });

    window.addEventListener("scroll", function () {
      var bottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 48;
      if (bottom) setActive("#tickets");
    }, { passive: true });
  }

  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('[role="tabpanel"]'));

  function selectTab(tab) {
    tabs.forEach(function (item) {
      var selected = item === tab;
      item.setAttribute("aria-selected", selected ? "true" : "false");
      item.tabIndex = selected ? 0 : -1;
      var panel = document.getElementById(item.getAttribute("aria-controls"));
      if (!panel) return;
      panel.hidden = !selected;
      if (selected) panel.setAttribute("data-open", "");
      else panel.removeAttribute("data-open");
    });
  }

  if (tabs.length) {
    selectTab(tabs[0]);
    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () { selectTab(tab); });
      tab.addEventListener("keydown", function (event) {
        var next = index;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % tabs.length;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabs.length - 1;
        else return;
        event.preventDefault();
        tabs[next].focus();
        selectTab(tabs[next]);
      });
    });
  }

  function partsInZone(date, timeZone) {
    var fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    var map = {};
    fmt.formatToParts(date).forEach(function (part) { map[part.type] = part.value; });
    if (map.hour === "24") map.hour = "00";
    return {
      year: Number(map.year),
      month: Number(map.month),
      day: Number(map.day),
      hour: Number(map.hour),
      minute: Number(map.minute),
      second: Number(map.second)
    };
  }

  function zoneOffset(date, timeZone) {
    var parts = partsInZone(date, timeZone);
    var asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    return asUtc - date.getTime();
  }

  function zonedTime(year, month, day, hour, minute, timeZone) {
    var guess = Date.UTC(year, month - 1, day, hour, minute, 0);
    var offset = zoneOffset(new Date(guess), timeZone);
    var result = new Date(guess - offset);
    var offset2 = zoneOffset(result, timeZone);
    if (offset2 !== offset) result = new Date(guess - offset2);
    return result;
  }

  var ZONE = "America/New_York";

  function festivalYear(now) {
    var parts = partsInZone(now, ZONE);
    if (parts.month > 10 || (parts.month === 10 && parts.day > 7)) return parts.year + 1;
    return parts.year;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function stamp(date) {
    return date.getUTCFullYear()
      + pad(date.getUTCMonth() + 1)
      + pad(date.getUTCDate())
      + "T"
      + pad(date.getUTCHours())
      + pad(date.getUTCMinutes())
      + pad(date.getUTCSeconds())
      + "Z";
  }

  var countdown = document.getElementById("countdown");
  var countdownStatus = document.getElementById("countdown-status");
  var units = countdown ? countdown.querySelectorAll("[data-unit]") : [];
  var year = festivalYear(new Date());

  function renderCountdown() {
    if (!countdown || !countdownStatus) return;
    var now = new Date();
    year = festivalYear(now);
    var start = zonedTime(year, 10, 6, 0, 0, ZONE);
    var end = zonedTime(year, 10, 8, 0, 0, ZONE);
    if (now >= start && now < end) {
      countdown.classList.add("is-quiet");
      countdownStatus.textContent = "October 6th and 7th, " + year + " — festival weekend.";
      return;
    }
    countdown.classList.remove("is-quiet");
    var diff = Math.max(0, start.getTime() - now.getTime());
    var totalSeconds = Math.floor(diff / 1000);
    var days = Math.floor(totalSeconds / 86400);
    var hours = Math.floor((totalSeconds % 86400) / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    var values = { days: String(days), hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds) };
    Array.prototype.forEach.call(units, function (node) {
      node.textContent = values[node.getAttribute("data-unit")];
    });
    countdownStatus.textContent = "Counting down to October 6, " + year + ", Eastern Time";
  }

  renderCountdown();
  window.setInterval(renderCountdown, 1000);

  var description = "Two days of live music, good people, and good times in Lancaster, Kentucky.";
  var locationText = "123 Hurt Lane, Lancaster, KY 40444";

  function calendarUrl(targetYear) {
    return "https://calendar.google.com/calendar/render?action=TEMPLATE"
      + "&text=" + encodeURIComponent("Little Fish Music Festival")
      + "&dates=" + targetYear + "1006/" + targetYear + "1008"
      + "&details=" + encodeURIComponent(description)
      + "&location=" + encodeURIComponent(locationText);
  }

  var gcal = document.getElementById("gcal-button");
  if (gcal) {
    gcal.setAttribute("aria-label", "Add to Google Calendar, opens in a new tab");
    gcal.addEventListener("click", function () {
      window.open(calendarUrl(festivalYear(new Date())), "_blank", "noopener");
    });
  }

  var icsButton = document.getElementById("ics-button");
  if (icsButton) {
    icsButton.addEventListener("click", function () {
      var targetYear = festivalYear(new Date());
      var now = new Date();
      var ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Little Fish Music Festival//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        "UID:little-fish-" + targetYear + "@shawnroy1988.github.io",
        "DTSTAMP:" + stamp(now),
        "DTSTART;VALUE=DATE:" + targetYear + "1006",
        "DTEND;VALUE=DATE:" + targetYear + "1008",
        "SUMMARY:Little Fish Music Festival",
        "LOCATION:123 Hurt Lane\\, Lancaster\\, KY 40444",
        "DESCRIPTION:Two days of live music\\, good people\\, and good times in Lancaster\\, Kentucky.",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\r\n");
      var blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = "little-fish-music-festival.ics";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }

  var posterButton = document.querySelector(".poster-open");
  var dialog = document.getElementById("poster-dialog");
  if (posterButton && dialog && typeof dialog.showModal === "function") {
    posterButton.addEventListener("click", function () {
      dialog.showModal();
    });
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
    dialog.querySelectorAll("[data-close-poster]").forEach(function (button) {
      button.addEventListener("click", function () { dialog.close(); });
    });
  }
})();
