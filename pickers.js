/* ═══════════════════════════════════════════════════════════
 *  pickers.js — انتخابگر تاریخ و ساعت مستقل
 *  بدون وابستگی به کتابخانه؛ فقط DOM + توابع تبدیل تقویم
 * ═══════════════════════════════════════════════════════════ */

// ─── پشتهٔ پاپ‌آپ‌ها (برای Esc و کلیک‌بیرون) ───
// هر بار که یک پاپ‌آپ باز می‌شود، به این پشته اضافه می‌شود.
// Esc یا کلیک‌بیرون فقط بالاترین (آخرین) را می‌بندد.
// وقتی پشته خالی شد، قفل اسکرول صفحه آزاد می‌شود.
const POPUP_STACK = [];

function pushPopup(el, closeFn) {
  POPUP_STACK.push({ el, closeFn });
  // قفل اسکرول صفحهٔ اصلی تا کاربر نتواند زیر پاپ‌آپ اسکرول کند
  document.body.style.overflow = 'hidden';
}

function popPopup() {
  const top = POPUP_STACK.pop();
  if (!top) return;
  if (top.closeFn) top.closeFn();
  if (top.el && top.el.parentNode) top.el.remove();
  if (POPUP_STACK.length === 0) {
    document.body.style.overflow = '';
  }
}

// Esc — فقط بالاترین پاپ‌آپ را می‌بندد (و رویداد به مودال والد نمی‌رسد)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && POPUP_STACK.length > 0) {
    e.stopPropagation(); // جلوی رسیدن به مودال والد را می‌گیرد
    e.preventDefault();
    popPopup();
  }
});

// کلیک‌بیرون — بالاترین پاپ‌آپی که کلیک خارج آن بوده بسته شود
document.addEventListener('mousedown', (e) => {
  for (let i = POPUP_STACK.length - 1; i >= 0; i--) {
    const { el } = POPUP_STACK[i];
    if (el && !el.contains(e.target)) {
      // این پاپ‌آپ باید بسته شود؛ اما اگر زیرش پاپ‌آپ دیگری هست،
      // فقط همین را می‌بندیم (نه همه را)
      POPUP_STACK.splice(i, 1)[0].closeFn && POPUP_STACK.splice(i, 1)[0].closeFn();
      // ساده‌تر: فقط آخرین را می‌بندیم
      popPopup();
      break;
    }
  }
});

// ─── ابزارهای عمومی ───
// جایگزینی ارقام لاتین ↔ بومی بر اساس نگاشت محلی
function localizeDigits(s, locale) {
  const from = '0123456789';
  const to = locale.digits || '0123456789';
  const map = {};
  for (let i = 0; i < 10; i++) {
    map[from[i]] = to[i];
    map[to[i]] = from[i]; // دوطرفه: هم ورودی، هم خروجی
  }
  return String(s).replace(/[0-9]|./g, (ch) => map[ch] || ch);
}
const toLatin = (s, locale) => localizeDigits(s, locale);
const toNative = (s, locale) => localizeDigits(s, locale);

// تبدیل ارقام ورودی کاربر به لاتین برای پردازش،
// و هر نویسهٔ نامعتبر را حذف می‌کند
function normalizeDigits(s, locale) {
  return toLatin(s, locale).replace(/[^\d:/\-\.]/g, '');
}

// ─── پوزیشن‌یابی هوشمند پاپ‌آپ ───
// پاپ‌آپ را زیر لنگر قرار می‌دهد؛ اگر جا نبود، بالا می‌برد
function positionPopup(popup, anchor) {
  popup.style.visibility = 'hidden';
  popup.style.display = 'block';
  requestAnimationFrame(() => {
    const r = anchor.getBoundingClientRect();
    const w = popup.offsetWidth;
    const h = popup.offsetHeight;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // راست‌چین یا چپ‌چین بر اساس جهت لنگر
    const isRTL = getComputedStyle(anchor).direction === 'rtl';

    // موقعیت عمودی: ترجیحاً زیر لنگر؛ اگر جا نبود، بالای لنگر
    let top = r.bottom + 6;
    if (top + h > viewportH - 8) {
      top = Math.max(8, r.top - h - 6);
    }

    // موقعیت افقی: تراز با لبهٔ شروع لنگر (RTL = راست)
    let left;
    if (isRTL) {
      left = Math.max(8, r.right - w);
    } else {
      left = Math.min(r.left, viewportW - w - 8);
    }

    popup.style.top = top + 'px';
    popup.style.left = left + 'px';
    popup.style.visibility = '';
  });
}

/* ═══════════════════════════════════════════════
 *  DATE PICKER — انتخابگر تاریخ
 * ═══════════════════════════════════════════════ */
/**
 * @param {Object} opts
 * @param {HTMLInputElement} opts.input      — فیلد متنی متصل
 * @param {Object} opts.calendar             — توابع تبدیل تقویم:
 *     { toParts(iso), fromParts(y,m,d), monthLen(y,m), months[], weekDays[], weekStart, todayISO() }
 *     iso = "YYYY-MM-DD" (میلادی) برای ذخیره/انتقال
 * @param {Object} opts.locale               — { digits: "۰۱۲۳۴۵۶۷۸۹", dir: "rtl" }
 * @param {Function} opts.onPick(iso)        — پس از انتخاب نهایی صدا زده می‌شود
 */
function createDatePicker({ input, calendar, locale, onPick }) {
  const state = {
    view: { y: 0, m: 0 },     // سال و ماه در حال نمایش
    selected: null,            // { y, m, d } انتخاب نهایی
    viewMode: 'days',          // 'days' | 'months' | 'years'
    yearsBase: 0,              // پایهٔ دهه/دوازده‌سال برای view years
    popup: null,
  };

  // ─── قالب‌بندی ───
  // iso → "YYYY/MM/DD" با ارقام بومی (برای نمایش در input)
  function formatForInput(iso) {
    if (!iso) return '';
    const p = calendar.toParts(iso);
    const y = String(p.jy).padStart(4, '0');
    const m = String(p.jm).padStart(2, '0');
    const d = String(p.jd).padStart(2, '0');
    return toNative(`${y}/${m}/${d}`, locale);
  }
  // مقدار input را می‌خواند و در صورت اعتبار به iso برمی‌گرداند
  function parseInput() {
    const raw = normalizeDigits(input.value, locale);
    if (!raw) return null;
    let y, m, d;
    // قالب‌های قابل‌قبول: YYYY/MM/DD یا YYMMDD یا YYYYMMDD
    if (/^\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2}$/.test(raw)) {
      [y, m, d] = raw.split(/[/\-.]/).map(Number);
    } else if (/^\d{6}$/.test(raw)) {
      y = +raw.slice(0, 2) + 1400; m = +raw.slice(2, 4); d = +raw.slice(4);
    } else if (/^\d{8}$/.test(raw)) {
      y = +raw.slice(0, 4); m = +raw.slice(4, 6); d = +raw.slice(6);
    } else {
      return null;
    }
    if (y < 100) y += 1400;
    if (y < 1300 || y > 1500 || m < 1 || m > 12) return null;
    const ml = calendar.monthLen(y, m);
    if (d < 1 || d > ml) return null;
    return calendar.fromParts(y, m, d);
  }

  // ─── رندر پاپ‌آپ ───
  function renderDays(container) {
    const { y, m } = state.view;
    const today = calendar.toParts(calendar.todayISO());
    const sel = state.selected;

    // سربرگ: فلش قبلی | ماه سال | فلش بعدی (mirror-aware با CSS)
    const head = document.createElement('div');
    head.className = 'pk-head';
    head.innerHTML = `
      <button type="button" class="pk-nav" data-act="prev" aria-label="قبلی">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="pk-title">
        <button type="button" class="pk-title-btn" data-act="view-months">${calendar.months[m - 1]}</button>
        <button type="button" class="pk-title-btn" data-act="view-years">${toNative(String(y), locale)}</button>
      </div>
      <button type="button" class="pk-nav" data-act="next" aria-label="بعدی">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    `;
    container.appendChild(head);

    // ردیف روزهای هفته (با weekStart قابل پیکربندی)
    const week = document.createElement('div');
    week.className = 'pk-week';
    const days = calendar.weekDays;
    const start = calendar.weekStart || 0;
    for (let i = 0; i < 7; i++) {
      const sp = document.createElement('span');
      sp.textContent = days[(i + start) % 7];
      week.appendChild(sp);
    }
    container.appendChild(week);

    // شبکهٔ روزها
    const grid = document.createElement('div');
    grid.className = 'pk-grid';
    const firstIso = calendar.fromParts(y, m, 1);
    const firstParts = calendar.toParts(firstIso);
    // محاسبهٔ offset: چند خانه خالی قبل از روز ۱
    // getDay میلادی را به offset در شبکه تبدیل می‌کنیم
    const firstDate = new Date(...firstIso.split('-').map((n, i) => i === 1 ? +n - 1 : +n));
    const dow = firstDate.getDay(); // 0=Sun .. 6=Sat
    const offset = (dow - start + 7) % 7;
    for (let i = 0; i < offset; i++) {
      const blank = document.createElement('span');
      blank.className = 'pk-blank';
      grid.appendChild(blank);
    }
    const len = calendar.monthLen(y, m);
    for (let d = 1; d <= len; d++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pk-day';
      btn.textContent = toNative(String(d), locale);
      btn.dataset.d = d;
      if (today.jy === y && today.jm === m && today.jd === d) btn.classList.add('today');
      if (sel && sel.y === y && sel.m === m && sel.d === d) btn.classList.add('selected');
      grid.appendChild(btn);
    }
    container.appendChild(grid);

    // دکمهٔ امروز (pill، کوچک، پایین وسط)
    const foot = document.createElement('div');
    foot.className = 'pk-foot';
    const todayBtn = document.createElement('button');
    todayBtn.type = 'button';
    todayBtn.className = 'pk-today';
    todayBtn.textContent = 'امروز';
    todayBtn.dataset.act = 'today';
    foot.appendChild(todayBtn);
    container.appendChild(foot);
  }

  function renderMonths(container) {
    const { y } = state.view;
    const head = document.createElement('div');
    head.className = 'pk-head';
    head.innerHTML = `
      <button type="button" class="pk-nav" data-act="prev">‹</button>
      <div class="pk-title">
        <button type="button" class="pk-title-btn" data-act="view-days">${toNative(String(y), locale)}</button>
      </div>
      <button type="button" class="pk-nav" data-act="next">›</button>
    `;
    container.appendChild(head);
    const grid = document.createElement('div');
    grid.className = 'pk-months';
    calendar.months.forEach((name, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = name;
      b.dataset.m = i + 1;
      if (state.selected && state.selected.y === y && state.selected.m === i + 1) b.classList.add('selected');
      grid.appendChild(b);
    });
    container.appendChild(grid);
  }

  function renderYears(container) {
    const base = state.yearsBase;
    const head = document.createElement('div');
    head.className = 'pk-head';
    head.innerHTML = `
      <button type="button" class="pk-nav" data-act="prev">‹</button>
      <div class="pk-title">
        <button type="button" class="pk-title-btn" data-act="view-days">${toNative(`${base}–${base + 11}`, locale)}</button>
      </div>
      <button type="button" class="pk-nav" data-act="next">›</button>
    `;
    container.appendChild(head);
    const grid = document.createElement('div');
    grid.className = 'pk-years';
    for (let y = base; y < base + 12; y++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = toNative(String(y), locale);
      b.dataset.y = y;
      if (state.selected && state.selected.y === y) b.classList.add('selected');
      grid.appendChild(b);
    }
    container.appendChild(grid);
  }

  function render() {
    if (!state.popup) return;
    const body = state.popup.querySelector('.pk-body');
    body.innerHTML = '';
    if (state.viewMode === 'days') renderDays(body);
    else if (state.viewMode === 'months') renderMonths(body);
    else renderYears(body);
  }

  // ─── مدیریت کلیک داخل پاپ‌آپ (event delegation) ───
  function handleAction(e) {
    const t = e.target.closest('[data-act], [data-d], [data-m], [data-y]');
    if (!t) return;
    if (t.dataset.act === 'prev') {
      if (state.viewMode === 'days') {
        state.view.m--;
        if (state.view.m < 1) { state.view.m = 12; state.view.y--; }
      } else if (state.viewMode === 'months') state.view.y--;
      else state.yearsBase -= 12;
    } else if (t.dataset.act === 'next') {
      if (state.viewMode === 'days') {
        state.view.m++;
        if (state.view.m > 12) { state.view.m = 1; state.view.y++; }
      } else if (state.viewMode === 'months') state.view.y++;
      else state.yearsBase += 12;
    } else if (t.dataset.act === 'view-months') state.viewMode = 'months';
    else if (t.dataset.act === 'view-years') {
      state.yearsBase = Math.floor((state.view.y - 1) / 12) * 12 + 1;
      state.viewMode = 'years';
    } else if (t.dataset.act === 'view-days') state.viewMode = 'days';
    else if (t.dataset.act === 'today') {
      const tParts = calendar.toParts(calendar.todayISO());
      state.view.y = tParts.jy;
      state.view.m = tParts.jm;
      state.selected = tParts;
      // پاپ‌آپ باز می‌ماند (طبق درخواست)
    } else if (t.dataset.d) {
      const d = +t.dataset.d;
      const iso = calendar.fromParts(state.view.y, state.view.m, d);
      state.selected = { y: state.view.y, m: state.view.m, d };
      commitPick(iso);
      return;
    } else if (t.dataset.m) {
      state.view.m = +t.dataset.m;
      state.viewMode = 'days';
    } else if (t.dataset.y) {
      state.view.y = +t.dataset.y;
      state.viewMode = 'days';
    }
    render();
  }

  function commitPick(iso) {
    input.value = formatForInput(iso);
    onPick && onPick(iso);
    closePopup();
  }

  // ─── باز/بستن ───
  function openPopup() {
    if (state.popup) return;
    const iso = parseInput() || calendar.todayISO();
    const p = calendar.toParts(iso);
    state.selected = p;
    state.view = { y: p.jy, m: p.jm };
    state.viewMode = 'days';

    const popup = document.createElement('div');
    popup.className = 'pk-popup pk-date';
    popup.dir = locale.dir || 'rtl';
    popup.innerHTML = '<div class="pk-body"></div>';
    popup.addEventListener('click', handleAction);
    document.body.appendChild(popup);
    state.popup = popup;
    positionPopup(popup, input);
    pushPopup(popup, () => { state.popup = null; });
    render();
  }

  function closePopup() {
    popPopup();
  }

  // ─── اتصال به input ───
  input.addEventListener('click', openPopup);
  input.addEventListener('focus', openPopup);
  // blur: اعتبارسنجی؛ نامعتبر = revert به مقدار قبلی
  let lastValid = input.value;
  input.addEventListener('focus', () => { lastValid = input.value; });
  input.addEventListener('blur', () => {
    const raw = input.value.trim();
    if (!raw) { lastValid = ''; return; }
    const iso = parseInput();
    if (!iso) {
      input.value = lastValid; // revert
    } else {
      input.value = formatForInput(iso);
      lastValid = input.value;
    }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const iso = parseInput();
      if (iso) {
        input.value = formatForInput(iso);
        onPick && onPick(iso);
      } else {
        input.value = lastValid;
      }
    }
  });

  // API عمومی
  return {
    setValue(iso) { input.value = formatForInput(iso); lastValid = input.value; },
    getValue() { return parseInput(); },
    open: openPopup,
    close: closePopup,
  };
}

/* ═══════════════════════════════════════════════
 *  TIME PICKER — انتخابگر ساعت (دایرهٔ ۲۴ ساعته)
 * ═══════════════════════════════════════════════ */
function createTimePicker({ input, locale, onPick }) {
  const state = {
    h: 8, m: 0,
    phase: 'hour',   // 'hour' | 'minute'
    popup: null,
    drag: false,
  };

  function formatForInput(h, m) {
    const s = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return toNative(s, locale);
  }
  function parseInput() {
    const raw = normalizeDigits(input.value, locale);
    if (!raw) return null;
    let h = null, m = null;
    if (raw.includes(':')) {
      const p = raw.split(':');
      if (p.length !== 2) return null;
      h = +p[0]; m = +p[1];
    } else if (/^\d{4}$/.test(raw)) { h = +raw.slice(0, 2); m = +raw.slice(2); }
    else if (/^\d{3}$/.test(raw)) {
      if (+raw.slice(0, 2) <= 23) { h = +raw.slice(0, 2); m = +raw[2]; }
      else { h = +raw[0]; m = +raw.slice(1); }
    } else if (/^\d{1,2}$/.test(raw)) { h = +raw; m = 0; }
    else return null;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return { h, m };
  }

  function render() {
    if (!state.popup) return;
    const body = state.popup.querySelector('.pk-body');
    body.innerHTML = '';

    // نمایشگر دیجیتال
    const digital = document.createElement('div');
    digital.className = 'pk-digital';
    const hBtn = document.createElement('button');
    hBtn.type = 'button'; hBtn.className = 'pk-seg' + (state.phase === 'hour' ? ' active' : '');
    hBtn.dataset.phase = 'hour';
    hBtn.textContent = toNative(String(state.h).padStart(2, '0'), locale);
    const colon = document.createElement('span'); colon.className = 'pk-colon'; colon.textContent = ':';
    const mBtn = document.createElement('button');
    mBtn.type = 'button'; mBtn.className = 'pk-seg' + (state.phase === 'minute' ? ' active' : '');
    mBtn.dataset.phase = 'minute';
    mBtn.textContent = toNative(String(state.m).padStart(2, '0'), locale);
    digital.appendChild(hBtn); digital.appendChild(colon); digital.appendChild(mBtn);
    body.appendChild(digital);

    // صفحهٔ دایره‌ای
    const dial = document.createElement('div');
    dial.className = 'pk-dial';
    // برچسب‌ها
    const count = state.phase === 'hour' ? 24 : 12;
    const step = state.phase === 'hour' ? 1 : 5;
    for (let i = 0; i < count; i++) {
      const v = i * step;
      // زاویه: 00 بالا، ساعت‌گرد
      const angle = (v * (state.phase === 'hour' ? 15 : 6)) * Math.PI / 180;
      const x = 50 + 42 * Math.sin(angle);
      const y = 50 - 42 * Math.cos(angle);
      const lbl = document.createElement('span');
      lbl.className = 'pk-label';
      const isActive = state.phase === 'hour' ? v === state.h : v === state.m;
      if (isActive) lbl.classList.add('active');
      lbl.style.left = x + '%';
      lbl.style.top = y + '%';
      lbl.textContent = toNative(String(v).padStart(2, '0'), locale);
      dial.appendChild(lbl);
    }
    // عقربه
    const hand = document.createElement('div');
    hand.className = 'pk-hand';
    const angleDeg = state.phase === 'hour'
      ? (state.h + state.m / 60) * 15
      : state.m * 6;
    hand.style.transform = `rotate(${angleDeg}deg)`;
    const dot = document.createElement('span'); dot.className = 'pk-hand-dot';
    hand.appendChild(dot);
    dial.appendChild(hand);
    // مرکز
    const center = document.createElement('span'); center.className = 'pk-center';
    dial.appendChild(center);
    body.appendChild(dial);

    // متن راهنما
    const hint = document.createElement('div');
    hint.className = 'pk-hint';
    hint.textContent = state.phase === 'hour'
      ? 'ساعت را انتخاب کنید (۲۴ ساعته)'
      : 'دقیقه را انتخاب کنید (بین مضرب‌های ۵ هم قابل انتخاب است)';
    body.appendChild(hint);
  }

  // اعمال کلیک/کشیدن روی صفحه
  function applyFromPoint(e) {
    const dial = state.popup.querySelector('.pk-dial');
    if (!dial) return;
    const r = dial.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    // زاویه از بالا، ساعت‌گرد مثبت
    const ang = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
    if (state.phase === 'hour') {
      state.h = Math.round(ang / 15) % 24;
    } else {
      state.m = Math.round(ang / 6) % 60; // هر ۶ درجه = ۱ دقیقه
    }
    render();
  }

  function handleAction(e) {
    const t = e.target.closest('[data-phase]');
    if (t) {
      state.phase = t.dataset.phase;
      render();
    }
  }

  function commitPick() {
    const s = formatForInput(state.h, state.m);
    input.value = s;
    onPick && onPick(`${String(state.h).padStart(2, '0')}:${String(state.m).padStart(2, '0')}:00`);
    closePopup();
  }

  function openPopup() {
    if (state.popup) return;
    const parsed = parseInput();
    if (parsed) { state.h = parsed.h; state.m = parsed.m; }
    state.phase = 'hour';

    const popup = document.createElement('div');
    popup.className = 'pk-popup pk-time';
    popup.dir = locale.dir || 'rtl';
    popup.innerHTML = '<div class="pk-body"></div>';
    popup.addEventListener('click', handleAction);

    // کشیدن روی صفحه برای انتخاب دقیقه بین مضرب‌های ۵
    popup.addEventListener('pointerdown', (e) => {
      const dial = e.target.closest('.pk-dial');
      if (!dial) return;
      dial.setPointerCapture(e.pointerId);
      state.drag = true;
      applyFromPoint(e);
    });
    popup.addEventListener('pointermove', (e) => { if (state.drag) applyFromPoint(e); });
    popup.addEventListener('pointerup', (e) => {
      if (!state.drag) return;
      state.drag = false;
      // اگر در حالت دقیقه بود، با رها کردن، انتخاب نهایی انجام شود
      if (state.phase === 'minute') {
        // کمی تأخیر تا render آخر دیده شود
        setTimeout(commitPick, 120);
      } else {
        // بعد از انتخاب ساعت، خودکار به حالت دقیقه برو
        state.phase = 'minute';
        render();
      }
    });

    document.body.appendChild(popup);
    state.popup = popup;
    positionPopup(popup, input);
    pushPopup(popup, () => { state.popup = null; });
    render();
  }

  function closePopup() { popPopup(); }

  // اتصال به input
  let lastValid = input.value;
  input.addEventListener('focus', () => { lastValid = input.value; });
  input.addEventListener('click', openPopup);
  input.addEventListener('blur', () => {
    const raw = input.value.trim();
    if (!raw) { lastValid = ''; return; }
    const p = parseInput();
    if (!p) { input.value = lastValid; }
    else { input.value = formatForInput(p.h, p.m); lastValid = input.value; }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const p = parseInput();
      if (p) {
        input.value = formatForInput(p.h, p.m);
        onPick && onPick(`${String(p.h).padStart(2, '0')}:${String(p.m).padStart(2, '0')}:00`);
      } else {
        input.value = lastValid;
      }
    }
  });

  return {
    setValue(h, m) { input.value = formatForInput(h, m); lastValid = input.value; },
    getValue() { return parseInput(); },
    open: openPopup,
    close: closePopup,
  };
}

// خروجی سراسری برای استفاده در app.js
window.Pickers = { createDatePicker, createTimePicker };