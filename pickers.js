/* انتخابگرهای مستقل تاریخ جلالی و ساعت؛ تبدیل تقویم از app.js تزریق می‌شود. */
(() => {
  "use strict";

  // پشته برای ترتیب لایه‌ها، بستن انتخابگر بالایی و بازیابی قفل اسکرول حفظ شده است.
  const POPUP_STACK = [];
  let savedOverflow = "";
  const nativeDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const toLatin = (value, locale) =>
    String(value).replace(/[۰-۹٠-٩]/g, (ch) => {
      const index = nativeDigits.indexOf(ch);
      return String(index >= 0 ? index : arabicDigits.indexOf(ch));
    });
  const toNative = (value, locale) =>
    String(value).replace(
      /\d/g,
      (ch) => (locale.digits || "0123456789")[Number(ch)],
    );
  const pad = (value) => String(value).padStart(2, "0");
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (className, text, action) => {
    const node = element("button", className, text);
    node.type = "button";
    node.addEventListener("click", action);
    return node;
  };

  function popPopup(popup, restoreFocus = false) {
    const index = popup
      ? POPUP_STACK.findIndex((item) => item.el === popup)
      : POPUP_STACK.length - 1;
    if (index < 0) return;
    const [item] = POPUP_STACK.splice(index, 1);
    item.dispose(restoreFocus);
    item.el.remove();
    if (!POPUP_STACK.length) document.body.style.overflow = savedOverflow;
  }

  document.addEventListener(
    "pointerdown",
    (event) => {
      const top = POPUP_STACK.at(-1);
      if (
        top &&
        !top.el.contains(event.target) &&
        !top.anchor.contains(event.target)
      )
        popPopup(top.el);
    },
    true,
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && POPUP_STACK.length) {
        event.preventDefault();
        event.stopImmediatePropagation();
        popPopup(undefined, true);
      }
    },
    true,
  );

  function mountPopup(input, locale, kind, label, onClose) {
    const popup = element("div", `pk-popup pk-${kind}`);
    popup.dir = locale.dir || "rtl";
    popup.setAttribute("role", "dialog");
    popup.setAttribute("aria-label", label);
    const anchor = input.closest(".pk-input-wrap") || input;
    let frame = 0;
    const position = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = anchor.getBoundingClientRect();
        const width = popup.offsetWidth;
        const height = popup.offsetHeight;
        const below = rect.bottom + 8;
        const above = rect.top - height - 8;
        const isAbove = below + height > innerHeight - 8 && above >= 8;
        const preferred = locale.dir === "rtl" ? rect.right - width : rect.left;
        const left = Math.max(8, Math.min(preferred, innerWidth - width - 8));
        popup.style.left = `${left}px`;
        popup.style.top = `${Math.max(8, Math.min(isAbove ? above : below, innerHeight - height - 8))}px`;
        popup.classList.toggle("pk-above", isAbove);
        popup.style.setProperty(
          "--pk-arrow-x",
          `${Math.max(18, Math.min(rect.left + rect.width / 2 - left, width - 18))}px`,
        );
        popup.style.visibility = "visible";
      });
    };
    popup.style.visibility = "hidden";
    if (!POPUP_STACK.length) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    popup.style.zIndex = String(2100 + POPUP_STACK.length);
    document.body.appendChild(popup);
    input.setAttribute("aria-expanded", "true");
    input.classList.add("pk-input-open");
    POPUP_STACK.push({
      el: popup,
      anchor,
      dispose(restoreFocus) {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", position);
        document.removeEventListener("scroll", position, true);
        input.setAttribute("aria-expanded", "false");
        input.classList.remove("pk-input-open");
        onClose(restoreFocus);
      },
    });
    window.addEventListener("resize", position);
    document.addEventListener("scroll", position, true);
    position();
    return { popup, position };
  }

  // بخش فعال از محل نشانگر یا انتخاب متن مشخص می‌شود؛ انتخاب کل فیلد یعنی بخش آخر.
  function activeSegment(input, widths) {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    if (start === 0 && end === input.value.length) return widths.length - 1;
    const segments = [...input.value.matchAll(/[0-9۰-۹٠-٩]+/g)];
    if (segments.length === widths.length) {
      const index = segments.findIndex(
        (part) => start >= part.index && start <= part.index + part[0].length,
      );
      return index < 0 ? widths.length - 1 : index;
    }
    let offset = 0;
    for (let i = 0; i < widths.length; i++) {
      offset += widths[i];
      if (start < offset) return i;
    }
    return widths.length - 1;
  }

  function selectSegment(input, index) {
    const part = [...input.value.matchAll(/[0-9۰-۹٠-٩]+/g)][index];
    if (part) input.setSelectionRange(part.index, part.index + part[0].length);
  }

  function bindInput({
    input,
    open,
    parse,
    write,
    clear,
    commit,
    step,
    label,
    icon,
  }) {
    const controller = new AbortController();
    const listen = (type, action) =>
      input.addEventListener(type, action, { signal: controller.signal });
    let wrapper = null,
      trigger = null;
    input.setAttribute("aria-haspopup", "dialog");
    input.setAttribute("aria-expanded", "false");
    if (!input.getAttribute("aria-label"))
      input.setAttribute("aria-label", label);
    const remember = () => {
      input.classList.remove("invalid");
      input.removeAttribute("aria-invalid");
    };
    const restoreFocus = () => input.focus({ preventScroll: true });
    // فوکوس به‌تنهایی انتخابگر را باز نمی‌کند؛ جهت‌نما برای ویرایش بخش فعال است.
    listen("click", () => open());
    listen("input", () => {
      clear();
      remember();
    });
    const validate = () => {
      if (!input.value.trim()) {
        clear();
        remember();
        return true;
      }
      const parsed = parse();
      if (parsed === null) {
        clear();
        input.classList.add("invalid");
        input.setAttribute("aria-invalid", "true");
        if (typeof window.showToast === "function")
          window.showToast("error", `${label} معتبر نیست.`);
        return false;
      }
      write(parsed);
      remember();
      return true;
    };
    listen("blur", validate);
    listen("keydown", (event) => {
      if (
        input.disabled ||
        input.readOnly ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        step(event.key === "ArrowUp" ? 1 : -1);
        remember();
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } else if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        if (!validate()) return;
        const parsed = parse();
        if (parsed !== null) commit(parsed);
      }
    });
    if (icon) {
      wrapper = element("div", "pk-input-wrap");
      input.before(wrapper);
      wrapper.appendChild(input);
      trigger = button("pk-input-trigger", "", () => open(true));
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "1.8");
      svg.setAttribute("aria-hidden", "true");
      const circle = document.createElementNS(svg.namespaceURI, "circle");
      circle.setAttribute("cx", "12");
      circle.setAttribute("cy", "12");
      circle.setAttribute("r", "9");
      const hand = document.createElementNS(svg.namespaceURI, "path");
      hand.setAttribute("d", "M12 7v5l3 2");
      svg.append(circle, hand);
      trigger.appendChild(svg);
      trigger.setAttribute("aria-label", `باز کردن انتخابگر ${label}`);
      trigger.disabled = input.disabled;
      wrapper.appendChild(trigger);
    }
    return {
      restoreFocus,
      remember,
      setDisabled(disabled) {
        input.disabled = !!disabled;
        if (trigger) trigger.disabled = !!disabled;
      },
      destroy() {
        controller.abort();
        if (wrapper?.parentNode) {
          wrapper.before(input);
          wrapper.remove();
        }
        input.classList.remove("pk-input-open");
        input.removeAttribute("aria-haspopup");
        input.removeAttribute("aria-expanded");
      },
    };
  }

  function createDatePicker({ input, calendar, locale, onPick }) {
    const label =
      input
        .closest(".form-group")
        ?.querySelector("label")
        ?.textContent.trim() || "تاریخ تحویل";
    let overlay = null;
    let view = { y: 1405, m: 1 };
    let selected = null;
    let mode = "days";
    let yearsBase = 1400;
    const clear = () => {
      delete input.dataset.iso;
    };
    const validParts = (y, m, d) =>
      Number.isInteger(y) &&
      y >= 1300 &&
      y <= 1500 &&
      m >= 1 &&
      m <= 12 &&
      d >= 1 &&
      d <= calendar.monthLen(y, m);
    const parse = () => {
      const raw = toLatin(input.value, locale).trim();
      let parts;
      if (/^\d{4}[/.-]\d{1,2}[/.-]\d{1,2}$/.test(raw))
        parts = raw.split(/[/.-]/).map(Number);
      else if (/^\d{8}$/.test(raw))
        parts = [+raw.slice(0, 4), +raw.slice(4, 6), +raw.slice(6)];
      else if (/^\d{6}$/.test(raw))
        parts = [1400 + +raw.slice(0, 2), +raw.slice(2, 4), +raw.slice(4)];
      else return null;
      return validParts(...parts) ? calendar.fromParts(...parts) : null;
    };
    const write = (iso) => {
      const p = calendar.toParts(iso);
      input.value = toNative(`${p.jy}/${pad(p.jm)}/${pad(p.jd)}`, locale);
      input.dataset.iso = iso;
    };
    const close = (restoreFocus = false) => {
      if (overlay) popPopup(overlay.popup, restoreFocus);
    };
    const commit = (iso) => {
      write(iso);
      binding.remember();
      if (onPick) onPick(iso);
      close(true);
    };
    const makeTitle = (text, action) => button("pk-title-btn", text, action);
    function navigate(step) {
      if (mode === "days") {
        const index = view.y * 12 + view.m - 1 + step;
        const y = Math.floor(index / 12);
        if (y < 1300 || y > 1500) return;
        view = { y, m: (index % 12) + 1 };
      } else if (mode === "months")
        view.y = Math.max(1300, Math.min(1500, view.y + step));
      else yearsBase = Math.max(1300, Math.min(1489, yearsBase + step * 12));
      render();
    }
    function render() {
      if (!overlay) return;
      const { popup } = overlay;
      popup.replaceChildren();
      const head = element("div", "pk-head");
      const prev = button("pk-nav", "‹", () => navigate(-1));
      const next = button("pk-nav", "›", () => navigate(1));
      prev.setAttribute("aria-label", "قبلی");
      next.setAttribute("aria-label", "بعدی");
      const title = element("div", "pk-title");
      if (mode === "days")
        title.appendChild(
          makeTitle(calendar.months[view.m - 1], () => {
            mode = "months";
            render();
          }),
        );
      title.appendChild(
        makeTitle(
          toNative(
            mode === "years" ? `${yearsBase}–${yearsBase + 11}` : view.y,
            locale,
          ),
          () => {
            if (mode === "years") mode = "days";
            else {
              yearsBase = Math.max(
                1300,
                Math.min(1489, view.y - (view.y % 12)),
              );
              mode = "years";
            }
            render();
          },
        ),
      );
      head.append(prev, title, next);
      popup.appendChild(head);
      if (mode === "days") {
        const week = element("div", "pk-week");
        const start = calendar.weekStart || 0;
        const fullDays = [
          "شنبه",
          "یکشنبه",
          "دوشنبه",
          "سه‌شنبه",
          "چهارشنبه",
          "پنجشنبه",
          "جمعه",
        ];
        const shortDays = ["شن", "یک", "دو", "سه", "چهار", "پنج", "جم"];
        for (let i = 0; i < 7; i++) {
          const dayIndex = (i + start) % 7;
          const day = element(
            "span",
            "",
            locale.dir === "rtl"
              ? shortDays[dayIndex]
              : calendar.weekDays[dayIndex],
          );
          day.title = fullDays[dayIndex];
          week.appendChild(day);
        }
        const grid = element("div", "pk-grid");
        const firstISO = calendar.fromParts(view.y, view.m, 1);
        const [gy, gm, gd] = firstISO.split("-").map(Number);
        // weekStart در تقویم تزریق‌شده اندیس شنبه‌محور است، نه getDay میلادی.
        const offset = (new Date(gy, gm - 1, gd).getDay() + 1 - start + 7) % 7;
        for (let i = 0; i < offset; i++)
          grid.appendChild(element("span", "pk-blank"));
        const today = calendar.todayISO();
        for (let d = 1; d <= calendar.monthLen(view.y, view.m); d++) {
          const iso = calendar.fromParts(view.y, view.m, d);
          const day = button("pk-day", toNative(d, locale), () => commit(iso));
          day.dataset.d = String(d);
          day.classList.toggle("today", iso === today);
          day.classList.toggle("selected", iso === selected);
          day.setAttribute("aria-pressed", String(iso === selected));
          day.setAttribute(
            "aria-label",
            toNative(`${d} ${calendar.months[view.m - 1]} ${view.y}`, locale),
          );
          grid.appendChild(day);
        }
        const foot = element("div", "pk-foot");
        foot.appendChild(
          button(
            "pk-today",
            toNative(
              (() => {
                const p = calendar.toParts(calendar.todayISO());
                return `${p.jy}/${pad(p.jm)}/${pad(p.jd)}`;
              })(),
              locale,
            ),
            () => commit(calendar.todayISO()),
          ),
        );
        popup.append(week, grid, foot);
      } else {
        const grid = element(
          "div",
          mode === "months" ? "pk-months" : "pk-years",
        );
        const p = selected ? calendar.toParts(selected) : null;
        const count = 12;
        for (let i = 0; i < count; i++) {
          const value = mode === "months" ? i + 1 : yearsBase + i;
          const text =
            mode === "months" ? calendar.months[i] : toNative(value, locale);
          const item = button("", text, () => {
            if (mode === "months") view.m = value;
            else view.y = value;
            mode = "days";
            render();
          });
          item.classList.toggle(
            "selected",
            !!p &&
              (mode === "months"
                ? p.jy === view.y && p.jm === value
                : p.jy === value),
          );
          grid.appendChild(item);
        }
        popup.appendChild(grid);
      }
      overlay.position();
    }
    function open(focusPopup = false) {
      if (input.disabled || input.readOnly) return;
      if (!overlay) {
        selected = parse();
        const p = calendar.toParts(selected || calendar.todayISO());
        view = { y: p.jy, m: p.jm };
        mode = "days";
        overlay = mountPopup(
          input,
          locale,
          "date",
          `انتخاب ${label}`,
          (restoreFocus) => {
            overlay = null;
            if (restoreFocus) binding.restoreFocus();
          },
        );
        render();
      }
      if (focusPopup === true)
        requestAnimationFrame(() => {
          overlay?.popup.querySelector(".selected, .pk-day, button")?.focus();
        });
    }
    function step(direction) {
      const raw = toLatin(input.value, locale);
      const index = activeSegment(
        input,
        /^\d{6}$/.test(raw) ? [2, 2, 2] : [4, 2, 2],
      );
      const p = calendar.toParts(parse() || calendar.todayISO());
      let { jy, jm, jd } = p;
      if (index === 0) jy = Math.max(1300, Math.min(1500, jy + direction));
      if (index === 1) jm = Math.max(1, Math.min(12, jm + direction));
      const limit = calendar.monthLen(jy, jm);
      jd = Math.min(jd, limit);
      if (index === 2) jd = Math.max(1, Math.min(limit, jd + direction));
      const iso = calendar.fromParts(jy, jm, jd);
      write(iso);
      selected = iso;
      view = { y: jy, m: jm };
      if (overlay) {
        mode = "days";
        render();
      }
      if (onPick) onPick(iso);
      selectSegment(input, index);
    }
    const binding = bindInput({
      input,
      open,
      parse,
      write,
      clear,
      commit,
      step,
      label,
    });
    return {
      open,
      close,
      setDisabled(disabled) {
        if (disabled) close();
        binding.setDisabled(disabled);
      },
      destroy() {
        close();
        binding.destroy();
      },
      getValue() {
        const iso = parse();
        if (iso) input.dataset.iso = iso;
        else clear();
        return iso;
      },
      setValue(iso) {
        if (!iso) {
          input.value = "";
          clear();
        } else write(iso);
        binding.remember();
      },
    };
  }

  function createTimePicker({ input, locale, onPick }) {
    const label =
      input
        .closest(".form-group")
        ?.querySelector("label")
        ?.textContent.trim() || "ساعت تحویل";
    let overlay = null;
    let h = 8,
      m = 0,
      phase = "hour",
      pointerId = null;
    let dial, labels, hand, hourButton, minuteButton, hint;
    const clear = () => {
      delete input.dataset.hms;
    };
    const parse = () => {
      const raw = toLatin(input.value, locale).trim();
      let match = /^(\d{1,2}):(\d{2})(?::00)?$/.exec(raw);
      if (!match && /^\d{4}$/.test(raw))
        match = [raw, raw.slice(0, 2), raw.slice(2)];
      if (!match && /^\d{1,2}$/.test(raw)) match = [raw, raw, "0"];
      if (!match) return null;
      const value = { h: +match[1], m: +match[2] };
      return value.h <= 23 && value.m <= 59 ? value : null;
    };
    const write = (value) => {
      input.value = toNative(`${pad(value.h)}:${pad(value.m)}`, locale);
      input.dataset.hms = `${pad(value.h)}:${pad(value.m)}:00`;
    };
    const close = (restoreFocus = false) => {
      if (overlay) popPopup(overlay.popup, restoreFocus);
    };
    const commit = (value) => {
      write(value);
      binding.remember();
      if (onPick) onPick(input.dataset.hms);
      close(true);
    };
    function paint() {
      labels.replaceChildren();
      const isHour = phase === "hour";
      const count = isHour ? 24 : 12;
      for (let i = 0; i < count; i++) {
        const value = isHour ? i : i * 5;
        const inner = isHour && value >= 1 && value <= 12;
        const angle =
          ((isHour ? (value % 12) * 30 : value * 6) * Math.PI) / 180;
        const radius = inner ? 28 : 40;
        const item = element("span", "pk-label", toNative(pad(value), locale));
        item.style.left = `${50 + radius * Math.sin(angle)}%`;
        item.style.top = `${50 - radius * Math.cos(angle)}%`;
        item.classList.toggle("active", value === (isHour ? h : m));
        labels.appendChild(item);
      }
      const radius = isHour && h >= 1 && h <= 12 ? 28 : 40;
      const angle = isHour ? (h % 12) * 30 : m * 6;
      hand.style.height = `${radius}%`;
      hand.style.top = `${50 - radius}%`;
      hand.style.transform = `rotate(${angle}deg)`;
      hourButton.textContent = toNative(pad(h), locale);
      minuteButton.textContent = toNative(pad(m), locale);
      hourButton.classList.toggle("active", isHour);
      minuteButton.classList.toggle("active", !isHour);
      hourButton.setAttribute("aria-pressed", String(isHour));
      minuteButton.setAttribute("aria-pressed", String(!isHour));
      dial.setAttribute(
        "aria-label",
        isHour
          ? "انتخاب ساعت؛ با کلیدهای جهت‌نما تغییر دهید"
          : "انتخاب دقیقه؛ با کلیدهای جهت‌نما تغییر دهید",
      );
      dial.setAttribute("aria-valuemax", isHour ? "23" : "59");
      dial.setAttribute("aria-valuenow", String(isHour ? h : m));
      hint.textContent = isHour
        ? "ساعت را انتخاب کنید (۲۴ ساعته)"
        : "دقیقه را انتخاب کنید (۰ تا ۵۹)";
    }
    function applyPoint(event) {
      const rect = dial.getBoundingClientRect();
      const dx = event.clientX - rect.left - rect.width / 2;
      const dy = event.clientY - rect.top - rect.height / 2;
      const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
      if (phase === "hour") {
        const slot = Math.round(angle / 30) % 12;
        const inner = Math.hypot(dx, dy) < rect.width * 0.34;
        h = inner ? slot || 12 : slot === 0 ? 0 : slot + 12;
      } else m = Math.round(angle / 6) % 60;
      paint();
    }
    function open(focusPopup = false) {
      if (input.disabled || input.readOnly) return;
      if (!overlay) {
        const parsed = parse();
        if (parsed) {
          h = parsed.h;
          m = parsed.m;
        }
        phase = "hour";
        overlay = mountPopup(
          input,
          locale,
          "time",
          `انتخاب ${label}`,
          (restoreFocus) => {
            pointerId = null;
            overlay = null;
            if (restoreFocus) binding.restoreFocus();
          },
        );
        dial = element("div", "pk-dial");
        dial.dir = "ltr";
        dial.tabIndex = 0;
        dial.setAttribute("role", "slider");
        dial.setAttribute("aria-valuemin", "0");
        labels = element("div", "pk-labels");
        labels.setAttribute("aria-hidden", "true");
        hand = element("div", "pk-hand");
        hand.setAttribute("aria-hidden", "true");
        hand.appendChild(element("span", "pk-hand-dot"));
        dial.append(hand, labels, element("span", "pk-center"));
        const digital = element("div", "pk-digital");
        digital.dir = "ltr";
        hourButton = button("pk-seg", "", () => {
          phase = "hour";
          paint();
        });
        minuteButton = button("pk-seg", "", () => {
          phase = "minute";
          paint();
        });
        hourButton.setAttribute("aria-label", "انتخاب ساعت");
        minuteButton.setAttribute("aria-label", "انتخاب دقیقه");
        digital.append(
          hourButton,
          element("span", "pk-colon", ":"),
          minuteButton,
        );
        hint = element("div", "pk-hint");
        hint.setAttribute("aria-live", "polite");
        const foot = element("div", "pk-foot");
        foot.appendChild(button("pk-today", "تأیید", () => commit({ h, m })));
        overlay.popup.append(dial, digital, hint, foot);
        // خود صفحهٔ ساعت هنگام کشیدن بازسازی نمی‌شود؛ pointer capture پایدار می‌ماند.
        dial.addEventListener("pointerdown", (event) => {
          if (!event.isPrimary || event.button !== 0 || pointerId !== null)
            return;
          event.preventDefault();
          dial.focus();
          pointerId = event.pointerId;
          dial.setPointerCapture(pointerId);
          applyPoint(event);
        });
        dial.addEventListener("pointermove", (event) => {
          if (pointerId === event.pointerId) applyPoint(event);
        });
        dial.addEventListener("pointerup", (event) => {
          if (pointerId !== event.pointerId) return;
          applyPoint(event);
          pointerId = null;
          if (dial.hasPointerCapture(event.pointerId))
            dial.releasePointerCapture(event.pointerId);
          if (phase === "hour") {
            phase = "minute";
            paint();
          } else commit({ h, m });
        });
        const cancel = () => {
          pointerId = null;
        };
        dial.addEventListener("pointercancel", cancel);
        dial.addEventListener("lostpointercapture", cancel);
        dial.addEventListener("keydown", (event) => {
          const steps = {
            ArrowRight: 1,
            ArrowUp: 1,
            ArrowLeft: -1,
            ArrowDown: -1,
          };
          if (event.key in steps) {
            event.preventDefault();
            if (phase === "hour") h = (h + steps[event.key] + 24) % 24;
            else m = (m + steps[event.key] + 60) % 60;
            paint();
          } else if (event.key === "Enter") {
            event.preventDefault();
            if (phase === "hour") {
              phase = "minute";
              paint();
            } else commit({ h, m });
          }
        });
        paint();
        overlay.position();
      }
      if (focusPopup === true)
        requestAnimationFrame(() => {
          if (overlay) dial.focus();
        });
    }
    function step(direction) {
      const index = activeSegment(input, [2, 2]);
      const value = parse() || { h: 8, m: 0 };
      if (index === 0) value.h = Math.max(0, Math.min(23, value.h + direction));
      else value.m = Math.max(0, Math.min(59, value.m + direction));
      h = value.h;
      m = value.m;
      write(value);
      if (overlay) paint();
      if (onPick) onPick(input.dataset.hms);
      selectSegment(input, index);
    }
    const binding = bindInput({
      input,
      open,
      parse,
      write,
      clear,
      commit,
      step,
      label,
      icon: true,
    });
    return {
      open,
      close,
      setDisabled(disabled) {
        if (disabled) close();
        binding.setDisabled(disabled);
      },
      destroy() {
        close();
        binding.destroy();
      },
      getValue() {
        const value = parse();
        if (value) write(value);
        else clear();
        return value;
      },
      setValue(hour, minute) {
        if (hour === null || hour === undefined) {
          input.value = "";
          clear();
        } else if (
          Number.isInteger(hour) &&
          Number.isInteger(minute) &&
          hour >= 0 &&
          hour <= 23 &&
          minute >= 0 &&
          minute <= 59
        )
          write({ h: hour, m: minute });
        binding.remember();
      },
    };
  }
  window.Pickers = { createDatePicker, createTimePicker };
})();
