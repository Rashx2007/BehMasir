// ─── Data ───
const STORAGE_KEY = "fleet_demo_v1";

// ساختار کامل خودرو طبق دسته‌بندی پروژه:
// bodyType: 'sedan' | 'pickup_single' | 'pickup_double' | 'van' | 'minibus' | 'truck'
// serviceType: 'passenger' | 'cargo' | 'both'
// passengerCapacity: عدد (در صورت سرویس مسافر/ترکیبی)
// cargoCapacity: عدد نمونه/بسته (ظرفیت بار ساده برای دمو)
// hasFridge: true/false
// fridgeCapacity: عدد (در صورت یخچال‌دار بودن)
// shiftStart / shiftEnd: ساعت فعالیت ("07:00" تا "16:00") یا null برای ۲۴ساعته
// ownership: 'org' | 'contractor'
// contractorName: نام شرکت طرف قرارداد (در صبورت ownership=contractor)
// status: 'ok' | 'down' | 'maintenance'
// plate, name: مشخصات نمایشی

const defaultVehicles = [
  {
    id: 1,
    name: "خودرو ۱",
    plate: "۱۲۳-الف",
    bodyType: "sedan",
    serviceType: "both",
    passengerCapacity: 3,
    cargoCapacity: 5,
    hasFridge: false,
    fridgeCapacity: 0,
    shiftStart: "07:00",
    shiftEnd: "16:00",
    ownership: "org",
    contractorName: "",
    status: "ok",
  },
  {
    id: 2,
    name: "خودرو ۲",
    plate: "۴۵۶-ب",
    bodyType: "sedan",
    serviceType: "cargo",
    passengerCapacity: 0,
    cargoCapacity: 5,
    hasFridge: false,
    fridgeCapacity: 0,
    shiftStart: "07:00",
    shiftEnd: "22:00",
    ownership: "org",
    contractorName: "",
    status: "ok",
  },
  {
    id: 3,
    name: "خودرو ۳ (وانت یخچالی)",
    plate: "۷۸۹-ج",
    bodyType: "pickup_single",
    serviceType: "cargo",
    passengerCapacity: 0,
    cargoCapacity: 8,
    hasFridge: true,
    fridgeCapacity: 4,
    shiftStart: null,
    shiftEnd: null,
    ownership: "org",
    contractorName: "",
    status: "ok",
  },
];

const defaultSamples = [
  {
    id: 101,
    carId: 1,
    unit: "امور اداری",
    origin: "کلینیک شریعتی",
    destination: "آزمایشگاه مرکزی",
    time: "09:30",
    status: "delivered",
  },
  {
    id: 102,
    carId: 1,
    unit: "بهداشت و درمان",
    origin: "بیمارستان امام",
    destination: "آزمایشگاه پاتولوژی",
    time: "10:00",
    status: "pending",
  },
  {
    id: 103,
    carId: 2,
    unit: "واحد فنی",
    origin: "درمانگاه ولیعصر",
    destination: "مرکز تشخیص طبی",
    time: "11:15",
    status: "pending",
  },
];

function dateOffset(days) {
  const t = new Date();
  t.setDate(t.getDate() - days);
  return t.toLocaleDateString("en-CA");
}
const defaultHistory = [
  {
    id: 1,
    date: dateOffset(1),
    carId: 1,
    carName: "خودرو ۱",
    unit: "امور اداری",
    origin: "کلینیک شریعتی",
    destination: "آزمایشگاه مرکزی",
    time: "09:10",
  },
  {
    id: 2,
    date: dateOffset(1),
    carId: 2,
    carName: "خودرو ۲",
    unit: "واحد فنی",
    origin: "درمانگاه ولیعصر",
    destination: "مرکز تشخیص طبی",
    time: "12:40",
  },
  {
    id: 3,
    date: dateOffset(2),
    carId: 3,
    carName: "خودرو ۳ (وانت یخچالی)",
    unit: "بهداشت و درمان",
    origin: "بیمارستان امام",
    destination: "آزمایشگاه پاتولوژی",
    time: "08:20",
  },
  {
    id: 4,
    date: dateOffset(3),
    carId: 1,
    carName: "خودرو ۱",
    unit: "امور اداری",
    origin: "مرکز بهداشت شمال",
    destination: "آزمایشگاه مرکزی",
    time: "10:05",
  },
  {
    id: 5,
    date: dateOffset(2),
    carId: 1,
    carName: "خودرو ۱",
    unit: "پشتیبانی",
    origin: "کلینیک شریعتی",
    destination: "آزمایشگاه پاتولوژی",
    time: "11:30",
  },
  {
    id: 6,
    date: dateOffset(3),
    carId: 2,
    carName: "خودرو ۲",
    unit: "امور اداری",
    origin: "بیمارستان امام",
    destination: "آزمایشگاه مرکزی",
    time: "14:15",
  },
  {
    id: 7,
    date: dateOffset(4),
    carId: 3,
    carName: "خودرو ۳ (وانت یخچالی)",
    unit: "بهداشت و درمان",
    origin: "مرکز بهداشت شمال",
    destination: "مرکز تشخیص طبی",
    time: "09:45",
  },
  {
    id: 8,
    date: dateOffset(0),
    carId: 1,
    carName: "خودرو ۱",
    unit: "امور اداری",
    origin: "کلینیک شریعتی",
    destination: "آزمایشگاه مرکزی",
    time: "09:30",
  },
  {
    id: 9,
    date: dateOffset(4),
    carId: 1,
    carName: "خودرو ۱",
    unit: "پشتیبانی",
    origin: "درمانگاه ولیعصر",
    destination: "آزمایشگاه مرکزی",
    time: "13:00",
  },
];

// مراکز (مبدأ/مقصد): در سامانه واقعی ادمین آن‌ها را با کلیک روی نقشه ثبت می‌کند؛
// این‌ها فقط داده اولیه دمو هستند.
const defaultCenters = [
  { id: 1, name: "کلینیک شریعتی", lat: 35.7219, lng: 51.4347 },
  { id: 2, name: "بیمارستان امام", lat: 35.705, lng: 51.401 },
  { id: 3, name: "درمانگاه ولیعصر", lat: 35.682, lng: 51.395 },
  { id: 4, name: "مرکز بهداشت شمال", lat: 35.74, lng: 51.46 },
  { id: 5, name: "آزمایشگاه مرکزی", lat: 35.6961, lng: 51.4231 },
  { id: 6, name: "آزمایشگاه پاتولوژی", lat: 35.71, lng: 51.41 },
  { id: 7, name: "مرکز تشخیص طبی", lat: 35.675, lng: 51.405 },
];

// ─── لایه ذخیره‌سازی (localStorage) ───
// نکته: این لایه به‌گونه‌ای نوشته شده که بعداً جایگزینی آن با فراخوانی API واقعی
// فقط نیاز به تغییر همین چند تابع دارد، نه کل برنامه (توابع دیگر فقط load/save را صدا می‌زنند)
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      // سازگاری با داده‌های ذخیره‌شده قبلی: نسخه‌های قدیمی هنوز «مراکز» نداشتند
      if (!Array.isArray(saved.centers)) {
        saved.centers = defaultCenters.map((c) => ({ ...c }));
        saved.nextCenterId = defaultCenters.length + 1;
      }
      return saved;
    }
  } catch (e) {
    console.warn("خطا در خواندن داده ذخیره‌شده، بازگشت به داده پیش‌فرض", e);
  }
  return {
    vehicles: defaultVehicles,
    samples: defaultSamples,
    nextSampleId: 104,
    nextVehicleId: 4,
    history: defaultHistory,
    centers: defaultCenters,
    nextCenterId: defaultCenters.length + 1,
  };
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      vehicles,
      samples,
      nextSampleId,
      nextVehicleId,
      history,
      centers,
      nextCenterId,
    }),
  );
}

const state = loadState();
let vehicles = state.vehicles;
let samples = state.samples; // بار همه خودروها به این آرایه مشترک منتقل شد (هر نمونه carId دارد)
let nextSampleId = state.nextSampleId;
let nextVehicleId = state.nextVehicleId;
let centers = state.centers; // مراکز (مبدأ/مقصد) ثبت‌شده توسط ادمین
let nextCenterId = state.nextCenterId;
samples.forEach((s) => {
  if (!s.date) s.date = new Date().toLocaleDateString("en-CA");
});
const todayStr = () => new Date().toLocaleDateString("en-CA");
let history = state.history || [];
history = history.filter(
  (h) => (new Date() - new Date(h.date)) / 86400000 <= 7,
);
let historyFilter = "all";

// سازگاری با کد قبلی: cars با samples تعبیه‌شده (مشتق‌شده، نه منبع اصلی داده)
function getCarsWithSamples() {
  return vehicles.map((v) => ({
    ...v,
    samples: todaySamples().filter((s) => s.carId === v.id),
  }));
}

// ─── ابزارهای کمکی عمومی ───
const faNum = (n) => Number(n).toLocaleString("fa-IR");
const ESC_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
// نام مراکز و واحدها ورودی کاربر است؛ پیش از درج در HTML escape می‌شود
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (ch) => ESC_MAP[ch]);
const todaySamples = () => samples.filter((s) => s.date === todayStr());
const getCenter = (name) => centers.find((c) => c.name === name);

const CAR_COLORS = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626"];
const carColor = (car, idx) => car.color || CAR_COLORS[idx % CAR_COLORS.length];
// ─── Helpers ───
const capacityOf = (car) => car.cargoCapacity || 0;
const pct = (car) =>
  capacityOf(car) === 0
    ? 0
    : Math.round((car.samples.length / capacityOf(car)) * 100);
const badgeClass = (car) =>
  pct(car) >= 100
    ? "badge-red"
    : pct(car) >= 60
      ? "badge-amber"
      : "badge-green";
const badgeText = (car) =>
  car.samples.length >= capacityOf(car)
    ? "پر"
    : `${capacityOf(car) - car.samples.length} ظرفیت خالی`;
const fillClass = (car) =>
  pct(car) >= 100 ? "fill-red" : pct(car) >= 60 ? "fill-amber" : "fill-green";

const BODY_TYPE_LABELS = {
  sedan: "سواری سدان",
  pickup_single: "وانت تک‌کابین",
  pickup_double: "وانت دوکابین",
  van: "ون",
  minibus: "مینی‌بوس",
  truck: "کامیونت/کامیون",
};
const SERVICE_TYPE_LABELS = {
  passenger: "مسافر",
  cargo: "بار",
  both: "مسافر و بار",
};
const STATUS_LABELS = {
  ok: "آماده به کار",
  down: "خراب",
  maintenance: "در حال تعمیر",
};
const OWNERSHIP_LABELS = {
  org: "متعلق به اداره",
  contractor: "قراردادی (شرکت بیرونی)",
};

// آیا خودرو در این ساعت مشخص فعال است؟ (شیفت کاری)
function isWithinShift(car, time) {
  if (!car.shiftStart || !car.shiftEnd) return true; // ۲۴ساعته
  return time >= car.shiftStart && time <= car.shiftEnd;
}

// اختلاف دو ساعت "HH:MM" به دقیقه (مقدار مطلق)
function minutesDiff(t1, t2) {
  const [h1, m1] = t1.split(":").map(Number);
  const [h2, m2] = t2.split(":").map(Number);
  return Math.abs(h1 * 60 + m1 - (h2 * 60 + m2));
}

// فاصله Haversine (km)
function haversine(a, b) {
  const R = 6371,
    toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat),
    dLng = toR(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function getSampleStatus(date, time) {
  const today = todayStr();
  const d = date || today;
  if (d > today) return "pending"; // روزهای آینده: هنوز در صف
  if (d < today) return "overdue"; // روز گذشته و تحویل‌نشده: تاخیر
  const now = new Date();
  const [h, m] = String(time).split(":").map(Number);
  const t = new Date();
  t.setHours(h, m, 0, 0);
  const diff = (t - now) / 60000;
  if (diff > 15) return "pending";
  if (diff >= -30) return "active";
  return "overdue";
}

// ─── Render ───
function render() {
  renderStats();
  renderCars();
  renderCenterSelects();
  renderUnitList();
  renderCarSelect();
  renderVehicles();
  renderVehicleSidebar();
  renderDashboard();
  renderRequests();
  renderHistory();
  renderCentersList();
  renderCentersMap();
  updateBell();
}

function renderStats() {
  const cars = getCarsWithSamples();
  const activeCars = cars.filter((c) => c.status === "ok").length;
  const todays = todaySamples();
  const live = samples.filter(
    (s) => s.status !== "delivered" && s.date >= todayStr(),
  );
  const pending = live.filter(
    (s) => getSampleStatus(s.date, s.time) === "pending",
  ).length;
  const moving = live.filter(
    (s) => getSampleStatus(s.date, s.time) === "active",
  ).length;
  const fa = (n) => n.toLocaleString("fa-IR");
  document.getElementById("statsBar").innerHTML = `
    <div class="stat-card"><div class="stat-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div><div><div class="stat-value">${fa(activeCars)}</div><div class="stat-label">خودروهای فعال</div><div class="stat-sub">از ${fa(cars.length)} خودرو</div></div></div>
    <div class="stat-card"><div class="stat-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg></div><div><div class="stat-value">${fa(pending)}</div><div class="stat-label">درخواست‌های در انتظار</div><div class="stat-sub">در انتظار تخصیص</div></div></div>
    <div class="stat-card"><div class="stat-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg></div><div><div class="stat-value">${fa(moving)}</div><div class="stat-label">نمونه‌های در حال انتقال</div><div class="stat-sub">در مسیر به مقصد</div></div></div>
    <div class="stat-card"><div class="stat-icon amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div><div class="stat-value">${fa(todays.length)}</div><div class="stat-label">درخواست‌های امروز</div><div class="stat-sub">کل درخواست‌ها</div></div></div>`;
}

function renderCars() {
  const gridEl = document.getElementById("carsGrid");
  if (!gridEl) return;
  const cars = getCarsWithSamples();
  document.getElementById("carsGrid").innerHTML = cars
    .map(
      (car) => `
    <div class="car-card">
      <div class="car-header">
        <div class="car-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          ${car.name} — ${car.plate}
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="badge ${badgeClass(car)}">${badgeText(car)}</span>
          <button onclick="handleCarEmergency(${car.id})" title="انتقال اضطراری نمونه‌ها"
            style="background:#fee2e2;border:none;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:.75rem;color:#dc2626">
            🚨 بحران
          </button>
        </div>
      </div>
      <div class="car-body">
        <div class="progress-wrap">
          <div class="progress-info">
            <span>${car.samples.length} از ${capacityOf(car)} نمونه</span>
            <span>${pct(car)}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${fillClass(car)}" style="width:${pct(car)}%"></div>
          </div>
        </div>
        ${
          car.samples.length === 0
            ? `<div class="empty-state">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
               <div>نمونه‌ای ثبت نشده</div>
             </div>`
            : `<ul class="sample-list">
               ${car.samples
                 .map((s) => {
                   const st =
                     s.status === "delivered"
                       ? "delivered"
                       : getSampleStatus(s.date, s.time);
                   const statusIcon =
                     st === "delivered" ? "✅" : st === "overdue" ? "⚠️" : "🕐";
                   const statusColor =
                     st === "delivered"
                       ? "#16a34a"
                       : st === "overdue"
                         ? "#dc2626"
                         : "#64748b";
                   return `<li class="sample-item" style="border-right: 3px solid ${statusColor}">
                   <div class="sample-info">
                     <span style="font-size:.8rem">${statusIcon}</span>
                     <span class="sample-route">${s.origin} ← ${s.destination}</span>
                   </div>
                   <span class="sample-time">${s.time}</span>
                   <button class="btn-delete" onclick="deleteSample(${s.id})" title="حذف"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                   </button>
                 </li>`;
                 })
                 .join("")}
             </ul>`
        }
      </div>
    </div>`,
    )
    .join("");
}

function renderCarSelect() {
  const sel = document.getElementById("carSelect");
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = getCarsWithSamples()
    .map((car) => {
      const remaining = Math.max(capacityOf(car) - car.samples.length, 0);
      const label =
        remaining === 0
          ? "ظرفیت تکمیل است"
          : `${faNum(remaining)} ظرفیت باقی‌مانده برای امروز`;
      return `<option value="${car.id}" ${remaining === 0 ? "disabled" : ""}>${esc(car.name)} (${label})</option>`;
    })
    .join("");
  if (prev && [...sel.options].some((o) => o.value === prev && !o.disabled))
    sel.value = prev;
}

function renderVehicleSidebar() {
  const el = document.getElementById("vehicleSidebar");
  if (!el) return;
  const cars = getCarsWithSamples();
  const fa = (n) => n.toLocaleString("fa-IR");
  el.innerHTML = cars
    .map((car, i) => {
      const color = carColor(car, i);
      const cap = capacityOf(car),
        count = car.samples.length;
      const C = 213.6,
        filled = cap ? Math.min(count / cap, 1) * C : 0;
      const ringColor =
        count >= cap && cap > 0
          ? "var(--danger)"
          : count > 0
            ? "var(--primary)"
            : "var(--success)";
      const status =
        car.status !== "ok"
          ? ["خارج از سرویس", "badge-red"]
          : count >= cap
            ? ["ظرفیت تکمیل است", "badge-red"]
            : count > 0
              ? ["در حال حمل نمونه", "badge-green"]
              : ["آماده به کار", "badge-green"];
      return `<div class="vside-card">
      <div>
        <div class="vside-name"><span class="vside-dot" style="background:${color}"></span>${car.name}</div>
        <div class="vside-plate">پلاک ${car.plate}</div>
        <div class="vside-tags">
          <span class="badge ${status[1]}">${status[0]}</span>
          ${car.hasFridge ? '<span class="tag tag-cold">❄️ یخچال‌دار</span>' : ""}
        </div>
        <button class="btn-crisis" onclick="handleCarEmergency(${car.id})" title="انتقال اضطراری نمونه‌ها">🚨 بحران</button>
      </div>
      <div class="ring-wrap">
        <svg class="ring" viewBox="0 0 80 80">
          <g transform="rotate(-90 40 40)">
            <circle class="ring-bg" cx="40" cy="40" r="34"/>
            <circle class="ring-fill" cx="40" cy="40" r="34" style="stroke:${ringColor};stroke-dasharray:${filled} ${C}"/>
          </g>
          <text x="40" y="45" text-anchor="middle" class="ring-text">${fa(count)}/${fa(cap)}</text>
        </svg>
        <div class="ring-label">ظرفیت</div>
      </div>
    </div>`;
    })
    .join("");
}
// ─── داشبورد: خلاصه اطلاعات آماری (به‌جای نقشه) ───
const DASH_TOP_N = 5; // تعداد ردیف در هر باکس رتبه‌بندی
const RECENT_DAYS = 5; // بازه «درخواست‌های موفق اخیر»

function parseLocalDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const DASH_ICONS = {
  vehicle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
};

function getDashboardData() {
  const vehicleIdByName = Object.fromEntries(
    vehicles.map((v) => [v.name, v.id]),
  );

  // «ماموریت» = سفر انجام‌شده (تاریخچه ۷ روز اخیر) + سفر جاری امروز که هنوز تحویل نشده
  // (سفرهای تحویل‌شده امروز قبلاً در تاریخچه ثبت شده‌اند و دوباره شمرده نمی‌شوند)
  const missions = [
    ...history.map((h) => ({
      carId: h.carId ?? vehicleIdByName[h.carName],
      unit: h.unit,
      origin: h.origin,
      destination: h.destination,
    })),
    ...todaySamples()
      .filter((s) => s.status !== "delivered")
      .map((s) => ({
        carId: s.carId,
        unit: s.unit,
        origin: s.origin,
        destination: s.destination,
      })),
  ];

  const count = (keys) => {
    const m = new Map();
    keys.forEach((k) => {
      if (k) m.set(k, (m.get(k) || 0) + 1);
    });
    return m;
  };
  const top = (m) =>
    [...m.entries()]
      .sort(
        (a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "fa"),
      )
      .slice(0, DASH_TOP_N);

  const activeIds = new Set(
    vehicles.filter((v) => v.status === "ok").map((v) => v.id),
  );
  const topVehicles = top(
    count(missions.map((m) => m.carId).filter((id) => activeIds.has(id))),
  ).map(([id, value]) => ({
    label: vehicles.find((v) => v.id === id).name,
    value,
  }));
  const topUnits = top(count(missions.map((m) => m.unit))).map(
    ([label, value]) => ({ label, value }),
  );
  const topCenters = top(
    count(missions.flatMap((m) => [m.origin, m.destination])),
  ).map(([label, value]) => ({ label, value }));

  // درخواست‌های موفق (تحویل‌شده) در RECENT_DAYS روز گذشته، به تفکیک روز
  const days = [];
  for (let i = RECENT_DAYS - 1; i >= 0; i--) {
    const date = dateOffset(i);
    days.push({ date, value: history.filter((h) => h.date === date).length });
  }
  const recentTotal = days.reduce((sum, d) => sum + d.value, 0);

  // خودروهای آماده به کار امروز: وضعیت «آماده به کار»، به‌ترتیب بیشترین ظرفیت باقی‌مانده
  const readyCars = getCarsWithSamples()
    .filter((c) => c.status === "ok")
    .map((car) => ({
      car,
      idx: vehicles.findIndex((v) => v.id === car.id),
      remaining: Math.max(capacityOf(car) - car.samples.length, 0),
    }))
    .sort((a, b) => b.remaining - a.remaining);

  return { topVehicles, topUnits, topCenters, days, recentTotal, readyCars };
}

function dashBoxHead(title, sub, icon) {
  return `<div class="dash-box-head">
      <div>
        <div class="dash-box-title">${title}</div>
        <div class="dash-box-sub">${sub}</div>
      </div>
      <span class="dash-box-icon">${icon}</span>
    </div>`;
}

function rankBox(title, sub, icon, rows, unitLabel) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const body =
    rows.length === 0
      ? `<div class="empty-state">داده‌ای برای نمایش وجود ندارد</div>`
      : `<ol class="rank-list">${rows
          .map(
            (r, i) => `<li class="rank-row">
          <span class="rank-num">${faNum(i + 1)}</span>
          <div class="rank-main">
            <div class="rank-label">${esc(r.label)}</div>
            <div class="rank-bar"><div class="rank-fill" style="width:${Math.round((r.value / max) * 100)}%"></div></div>
          </div>
          <span class="rank-count">${faNum(r.value)} <small>${unitLabel}</small></span>
        </li>`,
          )
          .join("")}</ol>`;
  return `<div class="dash-box">${dashBoxHead(title, sub, icon)}${body}</div>`;
}

function recentBox(days, total) {
  const max = Math.max(...days.map((d) => d.value), 1);
  const bars = days
    .map((d, idx) => {
      const label =
        idx === days.length - 1
          ? "امروز"
          : idx === days.length - 2
            ? "دیروز"
            : parseLocalDate(d.date).toLocaleDateString("fa-IR", {
                weekday: "long",
              });
      const h = d.value ? Math.max(Math.round((d.value / max) * 100), 8) : 3;
      return `<div class="recent-day">
        <div class="recent-bar-wrap"><div class="recent-bar" style="height:${h}%"></div></div>
        <div class="recent-count">${faNum(d.value)}</div>
        <div class="recent-label">${label}</div>
      </div>`;
    })
    .join("");
  return `<div class="dash-box">
    ${dashBoxHead("درخواست‌های موفق", `انجام‌شده در ${faNum(RECENT_DAYS)} روز گذشته`, DASH_ICONS.check)}
    <div class="recent-total"><b>${faNum(total)}</b> درخواست تحویل‌شده</div>
    <div class="recent-days">${bars}</div>
  </div>`;
}

function readyBox(rows) {
  const body =
    rows.length === 0
      ? `<div class="empty-state">امروز خودروی آماده به کاری وجود ندارد</div>`
      : `<ul class="ready-list">${rows
          .map(({ car, idx, remaining }) => {
            const shift =
              car.shiftStart && car.shiftEnd
                ? `${car.shiftStart} تا ${car.shiftEnd}`
                : "۲۴ ساعته";
            return `<li class="ready-row">
          <span class="legend-dot" style="background:${carColor(car, idx)}"></span>
          <div class="ready-main">
            <div class="ready-name">${esc(car.name)}</div>
            <div class="ready-sub">پلاک ${esc(car.plate)} · ${shift}</div>
          </div>
          <span class="badge ${remaining > 0 ? "badge-green" : "badge-red"}">${
            remaining > 0
              ? `${faNum(remaining)} ظرفیت باقی‌مانده`
              : "ظرفیت تکمیل"
          }</span>
        </li>`;
          })
          .join("")}</ul>`;
  return `<div class="dash-box">${dashBoxHead(
    "خودروهای آماده به کار امروز",
    `${faNum(rows.length)} خودرو در وضعیت آماده به کار`,
    DASH_ICONS.clock,
  )}${body}</div>`;
}

function renderDashboard() {
  const el = document.getElementById("dashBoxes");
  if (!el) return;
  const d = getDashboardData();
  el.innerHTML = [
    rankBox(
      "پرماموریت‌ترین خودروها",
      `${faNum(DASH_TOP_N)} خودروی فعال با بیشترین ماموریت (۷ روز اخیر)`,
      DASH_ICONS.vehicle,
      d.topVehicles,
      "ماموریت",
    ),
    rankBox(
      "پردرخواست‌ترین واحدها",
      `${faNum(DASH_TOP_N)} واحد با بیشترین درخواست خودرو`,
      DASH_ICONS.users,
      d.topUnits,
      "درخواست",
    ),
    rankBox(
      "پرترددترین مراکز",
      "به‌عنوان مبدأ یا مقصد",
      DASH_ICONS.pin,
      d.topCenters,
      "تردد",
    ),
    recentBox(d.days, d.recentTotal),
    readyBox(d.readyCars),
  ].join("");
}

function renderRequests() {
  const tbody = document.getElementById("requestsTbody");
  if (!tbody) return;
  const cars = getCarsWithSamples();
  const carMap = Object.fromEntries(cars.map((c) => [c.id, c]));
  const rows = samples
    .filter((s) => s.date >= todayStr())
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  tbody.innerHTML =
    rows.length === 0
      ? `<tr><td colspan="5" class="empty-state">امروز درخواستی ثبت نشده است</td></tr>`
      : rows
          .map((s) => {
            const car = carMap[s.carId];
            const st =
              s.status === "delivered"
                ? "delivered"
                : getSampleStatus(s.date, s.time);
            const stInfo = {
              delivered: ["تحویل شده", "badge-green"],
              active: ["در حال حمل", "badge-blue"],
              pending: ["در انتظار", "badge-amber"],
              overdue: ["تاخیر", "badge-red"],
            }[st];
            const color = car
              ? carColor(
                  car,
                  vehicles.findIndex((v) => v.id === car.id),
                )
              : "#94a3b8";
            return `<tr>
          <td class="req-route">${esc(s.origin)} ← ${esc(s.destination)}${s.unit ? `<div class="req-unit">${esc(s.unit)}</div>` : ""}</td>
          <td><span class="time-chip">${s.time}</span></td>
          <td><span class="badge ${stInfo[1]}">${stInfo[0]}</span></td>
          <td><span class="req-car"><span class="legend-dot" style="background:${color}"></span>${car ? car.name : "—"}</span></td>
                    <td><span class="req-actions">
            ${s.status !== "delivered" ? `<button class="icon-btn success" title="ثبت تحویل" onclick="deliverSample(${s.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></button>` : ""}
            <button class="icon-btn danger" title="حذف" onclick="deleteSample(${s.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
          </span></td>
        </tr>`;
          })
          .join("");
}
function renderHistory() {
  const tbody = document.getElementById("historyTbody");
  if (!tbody) return;
  const faDate = (d) =>
    new Date(d).toLocaleDateString("fa-IR", { month: "long", day: "numeric" });
  const rows =
    historyFilter === "all"
      ? history
      : history.filter((h) => h.date === historyFilter);
  tbody.innerHTML =
    rows.length === 0
      ? '<tr><td colspan="5" class="empty-state">موردی ثبت نشده</td></tr>'
      : rows
          .map(
            (h) => `<tr>
      <td>${faDate(h.date)}</td>
      <td class="req-route">${esc(h.origin)} ← ${esc(h.destination)}${h.unit ? `<div class="req-unit">${esc(h.unit)}</div>` : ""}</td>
      <td><span class="time-chip">${h.time}</span></td>
      <td>${h.carName}</td>
      <td><span class="badge badge-green">تحویل شده</span></td>
    </tr>`,
          )
          .join("");
  const sel = document.getElementById("historyFilter");
  if (sel) {
    const dates = [...new Set(history.map((h) => h.date))];
    sel.innerHTML =
      `<option value="all">همه روزها</option>` +
      dates
        .map(
          (d) =>
            `<option value="${d}" ${historyFilter === d ? "selected" : ""}>${faDate(d)}</option>`,
        )
        .join("");
  }
}
function applyHistoryFilter() {
  historyFilter = document.getElementById("historyFilter").value;
  renderHistory();
}

// ─── Actions ───
function deleteSample(sampleId) {
  const idx = samples.findIndex((s) => s.id === sampleId);
  if (idx === -1) return;
  samples.splice(idx, 1);
  saveState();
  render();
}

function deliverSample(sampleId) {
  const s = samples.find((x) => x.id === sampleId);
  if (!s) return;
  s.status = "delivered";
  const car = getCarsWithSamples().find((c) => c.id === s.carId);
  history.unshift({
    id: Date.now(),
    date: todayStr(),
    carId: s.carId,
    carName: car ? car.name : "—",
    unit: s.unit,
    origin: s.origin,
    destination: s.destination,
    time: s.time,
  });
  saveState();
  render();
}

function addSample() {
  const origin = document.getElementById("origin").value;
  const destination = document.getElementById("destination").value;
  const carId = parseInt(document.getElementById("carSelect").value);
  const unit = document.getElementById("unitInput").value.trim();
  const timeRaw = document.getElementById("timeInput").value;
  const dateRaw = document.getElementById("dateInput").value;
  const alertEl = document.getElementById("formAlert");
  const errorIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  if (!origin || !destination || !timeRaw || !unit || !dateRaw) {
    alertEl.innerHTML = `<div class="alert alert-error">${errorIcon} لطفاً همه فیلدها را پر کنید.</div>`;
    return;
  }
  if (origin === destination) {
    alertEl.innerHTML = `<div class="alert alert-error">${errorIcon} مبدأ و مقصد نمی‌توانند یکسان باشند.</div>`;
    return;
  }
  const time = normalizeTimeInput(timeRaw);
  const dateISO = normalizeDateInput(dateRaw);
  if (!time) { showToast("error", "ساعت معتبر نیست؛ مثال: 09:30 یا 930 یا ۹:۳۰"); return; }
  if (!dateISO) { showToast("error", "تاریخ معتبر نیست؛ مثال: 1405/06/28 یا 050628"); return; }
  document.getElementById("timeInput").value = toFa(time);
  document.getElementById("dateInput").value = toFa(isoToJalaliStr(dateISO));
  alertEl.innerHTML = "";
  openRouteOptionsModal({ origin, destination, time, date: dateISO, unit, preferredCarId: carId });
}

// ─── موتور پیشنهاد مسیر: چند گزینه می‌سازد، کاربر یکی را انتخاب می‌کند ───
// هر گزینه شامل: نوع (مستقل / ترکیبی‌با‌سفر‌دیگر)، خودرو، توضیح، و امتیاز برای رتبه‌بندی «بهترین پیشنهاد»
const MAX_CLUSTER_TIME_DIFF_MIN = 15; // طبق نیازمندی: حداکثر ۱۵ دقیقه اختلاف
const CLUSTER_RADIUS_KM_ORIGIN = 1.0; // هم‌پوشانی مبدأ
const CLUSTER_RADIUS_KM_DEST = 1.0; // هم‌پوشانی مقصد

function buildRouteOptions({
  origin,
  destination,
  time,
  date,
  preferredCarId,
}) {
  const reqDate = date || todayStr();
  const loadOn = (car) =>
    samples.filter((s) => s.carId === car.id && s.date === reqDate).length;
  const locMap = Object.fromEntries(centers.map((c) => [c.name, c]));
  const nO = locMap[origin],
    nD = locMap[destination];
  const cars = getCarsWithSamples();
  const options = [];

  // گزینه‌های ترکیب با سفرهای موجود روی خودروهای دیگر (یا همان خودرو) که هنوز ظرفیت دارند
  if (nO && nD) {
    cars.forEach((car) => {
      if (car.status !== "ok") return;
      if (loadOn(car) >= capacityOf(car)) return;
      return;
      if (!isWithinShift(car, time)) return;

      samples
        .filter((s) => s.carId === car.id && s.date === reqDate)
        .forEach((s) => {
          const sO = locMap[s.origin],
            sD = locMap[s.destination];
          if (!sO || !sD) return;
          const dOrigin = haversine(nO, sO);
          const dDest = haversine(nD, sD);
          const timeDiff = minutesDiff(time, s.time);
          const overlaps =
            dOrigin <= CLUSTER_RADIUS_KM_ORIGIN &&
            dDest <= CLUSTER_RADIUS_KM_DEST;

          if (overlaps && timeDiff <= MAX_CLUSTER_TIME_DIFF_MIN) {
            // امتیاز: هرچه فاصله زمانی و مکانی کمتر، امتیاز بالاتر (بهتر)
            const score = 100 - timeDiff * 2 - (dOrigin + dDest) * 20;
            options.push({
              type: "cluster",
              carId: car.id,
              score,
              timeDiff,
              distKm: (dOrigin + dDest).toFixed(2),
              estMin: Math.round(((dOrigin + dDest) / 30) * 60) + 5,
              withSample: s,
              label: `ترکیب با سفر موجود در ${car.name}`,
              desc: `این سفر با درخواست «${esc(s.origin)} ← ${esc(s.destination)}» (ساعت ${s.time}) در همان ${car.name} هم‌پوشانی مسیری دارد. اختلاف زمانی: ${timeDiff} دقیقه.`,
            });
          }
        });
    });
  }

  // گزینه‌های مستقل: هر خودروی دارای ظرفیت و شیفت مناسب (غیر از موارد بالا)
  const clusterCarIds = new Set(options.map((o) => o.carId));
  cars.forEach((car) => {
    if (car.status !== "ok") return;
    if (loadOn(car) >= capacityOf(car)) return;
    return;
    if (!isWithinShift(car, time)) return;
    if (clusterCarIds.has(car.id)) return; // قبلاً به‌عنوان گزینه ترکیبی اضافه شد

    const isPreferred = car.id === preferredCarId;
    const dDirect = nO && nD ? haversine(nO, nD) : 0;
    options.push({
      type: "solo",
      carId: car.id,
      score: (isPreferred ? 5 : 0) - loadOn(car), // کمی اولویت به خودروی انتخابی کاربر و کم‌بارتر
      distKm: dDirect.toFixed(2),
      estMin: Math.round((dDirect / 30) * 60) + 5,
      label: `سفر مستقل با ${car.name}`,
      desc: isPreferred
        ? "خودرویی که خودتان انتخاب کرده بودید؛ بدون ترکیب با سفر دیگری."
        : "این خودرو ظرفیت آزاد و شیفت کاری مناسب برای این بازه زمانی دارد.",
    });
  });

  // مرتب‌سازی بر اساس امتیاز (بهترین اول)
  options.sort((a, b) => b.score - a.score);
  return options.slice(0, 4); // حداکثر ۴ گزینه برای دمو، تا انتخاب برای کاربر سخت نشود
}

let pendingRequest = null; // درخواست در حال بررسی (هنوز ثبت نشده)
let pendingOptions = [];
let selectedOptionIdx = 0;

function openRouteOptionsModal(request) {
  destroyOptionMap();
  pendingRequest = request;
  pendingOptions = buildRouteOptions(request);
  selectedOptionIdx = 0;

  if (pendingOptions.length === 0) {
    document.getElementById("modalRoot").innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this) closeModal()">
        <div class="modal-box" style="max-width:440px">
          <div class="modal-head">
            <div class="modal-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              هیچ خودروی مناسبی پیدا نشد
            </div>
            <button class="modal-close" onclick="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            هیچ‌کدام از خودروها در این بازه زمانی، ظرفیت یا شیفت کاری مناسب ندارند. لطفاً زمان دیگری انتخاب کنید یا وضعیت خودروها را در تب «خودروها» بررسی کنید.
          </div>
          <div class="modal-foot">
            <button class="btn-secondary" onclick="closeModal()">بستن</button>
          </div>
        </div>
      </div>`;
    return;
  }

  renderRouteOptionsModal();
}

function renderRouteOptionsModal() {
  const cars = getCarsWithSamples();
  const carMap = Object.fromEntries(cars.map((c) => [c.id, c]));
  destroyOptionMap();

  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this) closeModal()">
      <div class="modal-box">
        <div class="modal-head">
          <div class="modal-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/></svg>
            انتخاب مسیر پیشنهادی
          </div>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div style="font-size:.85rem;color:var(--text-muted);margin-bottom:6px">
            درخواست: <b style="color:var(--text)">${esc(pendingRequest.origin)} ← ${esc(pendingRequest.destination)}</b> — ساعت ${pendingRequest.time} — تاریخ ${toFa(isoToJalaliStr(pendingRequest.date || todayStr()))} — ${esc(pendingRequest.unit)}
          </div>
          <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:14px">
            سیستم بر اساس هم‌پوشانی مسیر، اختلاف زمانی (حداکثر ${MAX_CLUSTER_TIME_DIFF_MIN} دقیقه) و ظرفیت خالی، گزینه‌های زیر را پیشنهاد می‌دهد. انتخاب نهایی با شماست.
          </div>
          <div class="route-options">
            ${pendingOptions
              .map((opt, i) => {
                const car = carMap[opt.carId];
                const isBest = i === 0;
                return `
              <div class="route-option ${i === selectedOptionIdx ? "selected" : ""}" onclick="selectRouteOption(${i})">
                <div class="route-option-head">
                  <div class="route-option-title">
                    ${opt.type === "cluster" ? "🔗" : "🚗"} ${opt.label}
                  </div>
                  <span class="route-option-badge ${isBest ? "best" : "alt"}">${isBest ? "پیشنهاد برتر" : "گزینه جایگزین"}</span>
                </div>
                <div class="route-option-desc">${opt.desc}</div>
                <div class="route-option-meta">
                  <span>🚙 ${car.name} — ${car.plate}<span>📦 ${faNum(Math.max(capacityOf(car) - samples.filter((x) => x.carId === car.id && x.date === (pendingRequest.date || todayStr())).length, 0))} ظرفیت باقی‌مانده آن روز</span>
                  ${opt.type === "cluster" ? `<span>⏱ اختلاف ${opt.timeDiff} دقیقه</span>` : ""}
                  ${opt.distKm ? `<span>📏 ${opt.distKm} کیلومتر</span>` : ""}
                  ${opt.estMin ? `<span>⏳ تقریباً ${opt.estMin} دقیقه</span>` : ""}
                </div>
              </div>`;
              })
              .join("")}
          </div>
          <div class="option-map-wrap" id="optionMapWrap" style="display:none">
            <div class="option-map-title">نمایش سفر ترکیبی روی نقشه</div>
            <div class="option-map-hint">فقط برای درک بهتر فاصله مبدأها از هم است؛ خطوط مستقیم‌اند و نه مسیر واقعی خیابان‌ها را نشان می‌دهند و نه موقعیت زنده خودرو را.</div>
            <div id="optionMap"></div>
            <ol class="stop-list" id="optionMapStops"></ol>
            <div class="option-map-note" id="optionMapNote"></div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn-secondary" onclick="closeModal()">انصراف</button>
          <button class="btn-primary" onclick="confirmRouteOption()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            تأیید و ثبت نمونه
          </button>
        </div>
      </div>
    </div>`;

  updateOptionMap();
}

function selectRouteOption(i) {
  selectedOptionIdx = i;
  // بدون بازسازی کل مودال، تا نقشه و اسکرول حفظ شود
  document
    .querySelectorAll(".route-option")
    .forEach((el, idx) => el.classList.toggle("selected", idx === i));
  updateOptionMap();
}

function confirmRouteOption() {
  const opt = pendingOptions[selectedOptionIdx];
  const newSample = {
    id: nextSampleId++,
    carId: opt.carId,
    unit: pendingRequest.unit,
    origin: pendingRequest.origin,
    destination: pendingRequest.destination,
    time: pendingRequest.time,
    date: pendingRequest.date || todayStr(),
    status: "pending",
  };
  samples.push(newSample);
  saveState();
  closeModal();

  const alertEl = document.getElementById("formAlert");
  alertEl.innerHTML = `<div class="alert alert-success">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
    نمونه با موفقیت ثبت شد ${opt.type === "cluster" ? "(ترکیب‌شده با سفر دیگر)" : ""}.
  </div>`;
  document.getElementById("origin").value = "";
  document.getElementById("destination").value = "";
  document.getElementById("unitInput").value = "";
  document.getElementById("timeInput").value = "";
  setTimeout(() => {
    alertEl.innerHTML = "";
  }, 5000);
  render();
}

function closeModal() {
  destroyOptionMap();
  document.getElementById("modalRoot").innerHTML = "";
  pendingRequest = null;
  pendingOptions = [];
}

// ─── مدیریت بحران خودرو ───
function handleCarEmergency(carId) {
  const cars = getCarsWithSamples();
  const brokenCar = cars.find((c) => c.id === carId);
  if (!brokenCar || brokenCar.samples.length === 0) {
    alert("این خودرو نمونه‌ای برای انتقال ندارد.");
    return;
  }

  if (
    !confirm(
      `آیا می‌خواهید نمونه‌های ${brokenCar.name} را به خودروهای دیگر منتقل کنید؟`,
    )
  )
    return;

  const samplesToMove = [...brokenCar.samples];
  const availableCars = cars.filter(
    (c) =>
      c.id !== carId && c.status === "ok" && c.samples.length < capacityOf(c),
  );

  if (availableCars.length === 0) {
    alert("⚠️ هیچ خودروی دیگری ظرفیت خالی ندارد!");
    return;
  }

  let moved = 0;
  const log = [];

  for (const sample of samplesToMove) {
    // خودرو با بیشترین ظرفیت خالی
    availableCars.sort((a, b) => a.samples.length - b.samples.length);
    const target = availableCars.find((c) => c.samples.length < capacityOf(c));
    if (!target) break;
    const realSample = samples.find((s) => s.id === sample.id);
    realSample.carId = target.id;
    target.samples.push(realSample); // برای محاسبه ظرفیت در همین حلقه
    log.push(`→ ${target.name}`);
    moved++;
  }

  saveState();
  alert(`✅ ${moved} نمونه منتقل شد:\n${log.join("\n")}`);
  render();
}

// ─── اعلان‌ها ───
function getAlerts() {
  const alerts = [];
  samples.forEach((s) => {
    if (
      s.status !== "delivered" &&
      getSampleStatus(s.date, s.time) === "overdue"
    )
      alerts.push({
        icon: "⏰",
        text: `تاخیر: ${esc(s.origin)} ← ${esc(s.destination)} (ساعت ${s.time})`,
      });
  });
  getCarsWithSamples().forEach((c) => {
    if (c.status !== "ok")
      alerts.push({ icon: "🔧", text: `${c.name} خارج از سرویس است` });
    else if (c.samples.length >= capacityOf(c) && capacityOf(c) > 0)
      alerts.push({ icon: "📦", text: `${c.name} به ظرفیت کامل رسیده` });
  });
  return alerts;
}
function updateBell() {
  const badge = document.getElementById("bellBadge");
  if (!badge) return;
  const n = getAlerts().length;
  badge.style.display = n ? "flex" : "none";
  badge.textContent = n.toLocaleString("fa-IR");
}
function openAlertsModal() {
  const alerts = getAlerts();
  document.getElementById("modalRoot").innerHTML =
    `<div class="modal-overlay" onclick="if(event.target===this) closeModal()">
    <div class="modal-box" style="max-width:440px">
      <div class="modal-head"><div class="modal-title">🔔 اعلان‌ها</div><button class="modal-close" onclick="closeModal()">✕</button></div>
      <div class="modal-body">${
        alerts.length === 0
          ? '<div class="empty-state">اعلانی وجود ندارد ✔</div>'
          : `<div class="alert-list">${alerts.map((a) => `<div class="alert-item">${a.icon} ${a.text}</div>`).join("")}</div>`
      }</div>
    </div></div>`;
}

// ─── Tabs ───
function switchTab(name) {
  const names = ["dashboard", "vehicles", "requests", "centers", "history"];
  document
    .querySelectorAll(".tab-btn")
    .forEach((b, i) => b.classList.toggle("active", names[i] === name));
  document
    .querySelectorAll(".tab-panel")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("tab-" + name).classList.add("active");
  if (name === "centers") initCentersMap();
  if (name === "vehicles") renderVehicles();
}

// ─── Clock ───
function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent =
    now.toLocaleTimeString("fa-IR");
  const d = document.getElementById("todayDate");
  if (d)
    d.textContent = now.toLocaleDateString("fa-IR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
}
setInterval(updateClock, 1000);
updateClock();
setInterval(updateBell, 15000);
updateBell();

// ════════════════════════════════════════════
// نقشه — فقط در دو جا استفاده می‌شود:
//   ۱) تب «مراکز»: ادمین با کلیک روی نقشه، یک مرکز (مبدأ/مقصد) ثبت و نام‌گذاری می‌کند
//   ۲) پنجره پیشنهاد مسیر: نمایش سفر اشتراکی پیشنهادی با خطوط مستقیم
// خودروها روی نقشه نمایش داده نمی‌شوند (سامانه GPS ندارد) و مسیر خیابانی هم رسم نمی‌شود.
// ════════════════════════════════════════════
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_MAP_CENTER = [35.7, 51.41];
const MAP_UNAVAILABLE_HTML = `<div class="map-unavailable">بارگذاری نقشه ممکن نشد. اتصال اینترنت را بررسی کنید.</div>`;
const ALERT_ICON_ERR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
const ALERT_ICON_OK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;

function createBaseMap(el, options = {}) {
  const m = L.map(el, options).setView(DEFAULT_MAP_CENTER, 12);
  L.tileLayer(TILE_URL, { attribution: "© OpenStreetMap" }).addTo(m);
  return m;
}

function showAlert(el, type, text) {
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type === "ok" ? "success" : "error"}">${type === "ok" ? ALERT_ICON_OK : ALERT_ICON_ERR} ${text}</div>`;
}

// ─── فهرست‌های مبدأ/مقصد و واحد در فرم ثبت درخواست ───
function renderCenterSelects() {
  ["origin", "destination"].forEach((id) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML =
      `<option value="">انتخاب کنید...</option>` +
      centers
        .map((c) => `<option value="${esc(c.name)}">${esc(c.name)}</option>`)
        .join("");
    if (prev && centers.some((c) => c.name === prev)) sel.value = prev;
  });
}

function renderUnitList() {
  const el = document.getElementById("unitList");
  if (!el) return;
  const units = new Set(
    [...samples, ...history].map((x) => x.unit).filter(Boolean),
  );
  el.innerHTML = [...units]
    .map((u) => `<option value="${esc(u)}"></option>`)
    .join("");
}

// ─── تب مراکز (ادمین) ───
let centersMap = null;
let centersLayer = null;
let draftMarker = null;
let draftPoint = null;

function initCentersMap() {
  const el = document.getElementById("centersMap");
  if (!el) return;
  if (typeof L === "undefined") {
    el.innerHTML = MAP_UNAVAILABLE_HTML;
    return;
  }
  if (!centersMap) {
    centersMap = createBaseMap(el);
    centersLayer = L.layerGroup().addTo(centersMap);
    centersMap.on("click", (e) => setDraftPoint(e.latlng.lat, e.latlng.lng));
  }
  // تب تا این لحظه مخفی بوده؛ اندازه نقشه باید دوباره محاسبه شود
  setTimeout(() => centersMap.invalidateSize(), 60);
  renderCentersMap();
}

function renderCentersMap() {
  if (!centersMap) return;
  centersLayer.clearLayers();
  centers.forEach((c) => {
    L.circleMarker([c.lat, c.lng], {
      radius: 8,
      fillColor: "#2563eb",
      color: "#fff",
      weight: 2,
      fillOpacity: 0.9,
      bubblingMouseEvents: false, // کلیک روی مرکز موجود، نقطه جدید نسازد
    })
      .addTo(centersLayer)
      .bindTooltip(esc(c.name), { direction: "top" })
      .on("click", function () {
        this.openTooltip();
      });
  });
}

function setDraftPoint(lat, lng) {
  draftPoint = { lat, lng };
  if (centersMap) {
    if (draftMarker) draftMarker.setLatLng([lat, lng]);
    else
      draftMarker = L.circleMarker([lat, lng], {
        radius: 10,
        fillColor: "#d97706",
        color: "#fff",
        weight: 3,
        fillOpacity: 0.95,
        interactive: false,
      }).addTo(centersMap);
  }
  const coords = document.getElementById("centerCoords");
  if (coords) {
    coords.textContent = `${lat.toFixed(5)}، ${lng.toFixed(5)}`;
    coords.classList.add("has-point");
  }
  const nameEl = document.getElementById("centerName");
  if (nameEl) nameEl.focus();
}

function clearDraft() {
  draftPoint = null;
  if (draftMarker && centersMap) centersMap.removeLayer(draftMarker);
  draftMarker = null;
  const coords = document.getElementById("centerCoords");
  if (coords) {
    coords.textContent = "هنوز نقطه‌ای انتخاب نشده است";
    coords.classList.remove("has-point");
  }
}

function saveCenter() {
  const nameEl = document.getElementById("centerName");
  const alertEl = document.getElementById("centerAlert");
  const name = nameEl.value.trim();
  if (!draftPoint) {
    showAlert(
      alertEl,
      "err",
      "ابتدا روی نقشه کلیک کنید و موقعیت مرکز را مشخص کنید.",
    );
    return;
  }
  if (!name) {
    showAlert(alertEl, "err", "لطفاً برای مرکز یک نام وارد کنید.");
    return;
  }
  if (centers.some((c) => c.name === name)) {
    showAlert(alertEl, "err", "مرکزی با این نام قبلاً ثبت شده است.");
    return;
  }
  centers.push({
    id: nextCenterId++,
    name,
    lat: Number(draftPoint.lat.toFixed(6)),
    lng: Number(draftPoint.lng.toFixed(6)),
  });
  saveState();
  clearDraft();
  nameEl.value = "";
  showAlert(
    alertEl,
    "ok",
    `مرکز «${esc(name)}» ثبت شد و برای همه کاربران در فهرست مبدأ/مقصد نمایش داده می‌شود.`,
  );
  setTimeout(() => {
    alertEl.innerHTML = "";
  }, 5000);
  render();
}

function renderCentersList() {
  const el = document.getElementById("centersList");
  if (!el) return;
  const countEl = document.getElementById("centersCount");
  if (countEl) countEl.textContent = `(${faNum(centers.length)})`;
  el.innerHTML =
    centers.length === 0
      ? `<li class="empty-state">هنوز مرکزی ثبت نشده است</li>`
      : centers
          .map(
            (c) => `<li class="center-item">
      <div class="center-info">
        <div class="center-name">${esc(c.name)}</div>
        <div class="center-coords">${c.lat.toFixed(5)}، ${c.lng.toFixed(5)}</div>
      </div>
      <span class="req-actions">
        <button class="icon-btn" title="نمایش روی نقشه" onclick="focusCenter(${c.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></button>
        <button class="icon-btn" title="تغییر نام" onclick="openCenterRenameModal(${c.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="icon-btn danger" title="حذف" onclick="deleteCenter(${c.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
      </span>
    </li>`,
          )
          .join("");
}

function focusCenter(id) {
  const c = centers.find((x) => x.id === id);
  if (!c || !centersMap) return;
  centersMap.setView([c.lat, c.lng], 15);
}

function openCenterRenameModal(id) {
  const c = centers.find((x) => x.id === id);
  if (!c) return;
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this) closeModal()">
      <div class="modal-box" style="max-width:440px">
        <div class="modal-head">
          <div class="modal-title">تغییر نام مرکز</div>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="cr_name">نام مرکز</label>
            <input type="text" id="cr_name" value="${esc(c.name)}" onkeydown="if(event.key==='Enter') saveCenterRename(${c.id})">
          </div>
          <div id="cr_alert"></div>
        </div>
        <div class="modal-foot">
          <button class="btn-secondary" onclick="closeModal()">انصراف</button>
          <button class="btn-primary" onclick="saveCenterRename(${c.id})">ذخیره</button>
        </div>
      </div>
    </div>`;
  document.getElementById("cr_name").focus();
}

function saveCenterRename(id) {
  const c = centers.find((x) => x.id === id);
  if (!c) return;
  const name = document.getElementById("cr_name").value.trim();
  const alertEl = document.getElementById("cr_alert");
  if (!name) {
    showAlert(alertEl, "err", "نام مرکز نمی‌تواند خالی باشد.");
    return;
  }
  if (centers.some((x) => x.id !== id && x.name === name)) {
    showAlert(alertEl, "err", "مرکزی با این نام قبلاً ثبت شده است.");
    return;
  }
  const oldName = c.name;
  c.name = name;
  // درخواست‌ها و تاریخچه مرکز را با نام نگه می‌دارند؛ نام جدید در آن‌ها هم اعمال شود
  [...samples, ...history].forEach((x) => {
    if (x.origin === oldName) x.origin = name;
    if (x.destination === oldName) x.destination = name;
  });
  saveState();
  closeModal();
  render();
}

function deleteCenter(id) {
  const c = centers.find((x) => x.id === id);
  if (!c) return;
  const inUse = samples.some(
    (s) =>
      s.status !== "delivered" &&
      (s.origin === c.name || s.destination === c.name),
  );
  if (inUse) {
    alert(
      "این مرکز در درخواست‌های جاری استفاده شده است. ابتدا آن درخواست‌ها را حذف یا تحویل دهید.",
    );
    return;
  }
  if (!confirm(`آیا از حذف مرکز «${c.name}» مطمئن هستید؟`)) return;
  centers = centers.filter((x) => x.id !== id);
  saveState();
  render();
}

// ─── نقشه سفر اشتراکی (داخل پنجره پیشنهاد مسیر) ───
let optionMap = null;
let optionMapLayer = null;

function destroyOptionMap() {
  if (optionMap) {
    optionMap.remove();
    optionMap = null;
    optionMapLayer = null;
  }
}

// ترتیب توقف‌ها در سفر ترکیبی: مبدأها به‌ترتیب ساعت، سپس مقصد(ها)
function buildSharedTripStops(opt) {
  const s = opt.withSample;
  const origins = [
    { name: s.origin, time: s.time, who: "سفر موجود" },
    {
      name: pendingRequest.origin,
      time: pendingRequest.time,
      who: "درخواست جدید",
    },
  ].sort((a, b) => a.time.localeCompare(b.time));
  const dests = [
    { name: s.destination, who: "سفر موجود" },
    { name: pendingRequest.destination, who: "درخواست جدید" },
  ];
  const raw = [
    ...origins.map((o) => ({ ...o, kind: "origin" })),
    ...dests.map((d) => ({ ...d, kind: "dest" })),
  ];
  const stops = [];
  raw.forEach((r) => {
    const c = getCenter(r.name);
    if (!c) return;
    const last = stops[stops.length - 1];
    // یک مرکز مشترک (مثلاً مبدأ یکسان) فقط یک نقطه حساب می‌شود
    if (last && last.kind === r.kind && last.name === r.name) {
      last.who += " و " + r.who;
      return;
    }
    stops.push({ ...r, lat: c.lat, lng: c.lng });
  });
  return stops;
}

function updateOptionMap() {
  const wrap = document.getElementById("optionMapWrap");
  if (!wrap) return;
  const opt = pendingOptions[selectedOptionIdx];
  // نقشه فقط برای پیشنهاد سفر اشتراکی (ترکیبی) نمایش داده می‌شود
  if (!opt || opt.type !== "cluster") {
    wrap.style.display = "none";
    return;
  }
  wrap.style.display = "block";

  const stops = buildSharedTripStops(opt);
  const listEl = document.getElementById("optionMapStops");
  listEl.innerHTML = stops
    .map(
      (st, i) => `<li>
      <span class="stop-pin ${st.kind}">${faNum(i + 1)}</span>
      <span>${st.kind === "origin" ? "مبدأ" : "مقصد"}: <b>${esc(st.name)}</b>
      <small>(${esc(st.who)}${st.kind === "origin" ? `، ساعت ${st.time}` : ""})</small></span>
    </li>`,
    )
    .join("");

  const originStops = stops.filter((st) => st.kind === "origin");
  const noteEl = document.getElementById("optionMapNote");
  noteEl.textContent =
    originStops.length === 2
      ? `فاصله مستقیم مبدأها از هم: ${haversine(originStops[0], originStops[1]).toFixed(2)} کیلومتر`
      : "مبدأ هر دو درخواست یکی است.";

  const mapEl = document.getElementById("optionMap");
  if (typeof L === "undefined") {
    mapEl.innerHTML = MAP_UNAVAILABLE_HTML;
    return;
  }
  if (!optionMap) {
    optionMap = createBaseMap(mapEl, { scrollWheelZoom: false });
    optionMapLayer = L.layerGroup().addTo(optionMap);
  }
  optionMapLayer.clearLayers();
  optionMap.invalidateSize();

  const points = stops.map((st) => [st.lat, st.lng]);
  // اتصال مبدأها به‌هم و مبدأ آخر به مقصد، همه با خط مستقیم
  if (points.length > 1) {
    L.polyline(points, { color: "#2563eb", weight: 3, opacity: 0.85 }).addTo(
      optionMapLayer,
    );
  }
  stops.forEach((st, i) => {
    L.marker([st.lat, st.lng], {
      icon: L.divIcon({
        className: "",
        html: `<div class="stop-pin ${st.kind}">${faNum(i + 1)}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      }),
    })
      .addTo(optionMapLayer)
      .bindTooltip(esc(st.name), { direction: "top", offset: [0, -10] });
  });

  if (points.length === 1) optionMap.setView(points[0], 14);
  else if (points.length > 1)
    optionMap.fitBounds(L.latLngBounds(points), {
      padding: [30, 30],
      maxZoom: 15,
    });
}

// ════════════════════════════════════════════
// مدیریت خودرو (تعریف / ویرایش / حذف)
// ════════════════════════════════════════════

function renderVehicles() {
  const grid = document.getElementById("vehiclesGrid");
  if (!grid) return; // اگر تب هنوز در DOM نیست

  const cars = getCarsWithSamples();
  grid.innerHTML = cars
    .map((car) => {
      const statusTagClass =
        car.status === "ok"
          ? "tag-status-ok"
          : car.status === "down"
            ? "tag-status-down"
            : "tag-status-busy";
      const shiftLabel =
        car.shiftStart && car.shiftEnd
          ? `${car.shiftStart} تا ${car.shiftEnd}`
          : "۲۴ ساعته";
      return `
    <div class="vehicle-card ${car.status !== "ok" ? "status-down" : ""}">
      <div class="vehicle-card-head">
        <div>
          <div class="vehicle-name">${car.name}</div>
          <div class="vehicle-plate">پلاک: ${car.plate}</div>
        </div>
        <div class="vehicle-actions">
          <button class="icon-btn" title="ویرایش" onclick="openVehicleForm(${car.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn danger" title="حذف" onclick="deleteVehicle(${car.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>
      <div class="vehicle-tags">
        <span class="tag">${BODY_TYPE_LABELS[car.bodyType] || car.bodyType}</span>
        <span class="tag">${SERVICE_TYPE_LABELS[car.serviceType] || car.serviceType}</span>
        ${car.hasFridge ? `<span class="tag tag-cold">❄️ یخچال‌دار</span>` : ""}
        <span class="tag ${statusTagClass}">${STATUS_LABELS[car.status]}</span>
      </div>
      <div class="vehicle-meta">
        ${car.serviceType !== "cargo" ? `<div>👤 ظرفیت مسافر: <b>${car.passengerCapacity}</b> نفر</div>` : ""}
        ${car.serviceType !== "passenger" ? `<div>📦 ظرفیت بار: <b>${car.cargoCapacity}</b> واحد${car.hasFridge ? ` (از این میان ${car.fridgeCapacity} واحد یخچالی)` : ""}</div>` : ""}
        <div>🕐 ساعت فعالیت: <b>${shiftLabel}</b></div>
        <div>🏢 مالکیت: <b>${OWNERSHIP_LABELS[car.ownership]}</b>${car.ownership === "contractor" && car.contractorName ? ` — ${car.contractorName}` : ""}</div>
        <div>📊 وضعیت فعلی: <b>${car.samples.length}/${capacityOf(car)}</b> ظرفیت اشغال‌شده</div>
      </div>
    </div>`;
    })
    .join("");
}

function openVehicleForm(vehicleId) {
  const isEdit = vehicleId != null;
  const v = isEdit
    ? vehicles.find((x) => x.id === vehicleId)
    : {
        name: "",
        plate: "",
        bodyType: "sedan",
        serviceType: "cargo",
        passengerCapacity: 0,
        cargoCapacity: 5,
        hasFridge: false,
        fridgeCapacity: 0,
        shiftStart: "07:00",
        shiftEnd: "16:00",
        is24h: false,
        ownership: "org",
        contractorName: "",
        status: "ok",
      };
  const is24h = !v.shiftStart && !v.shiftEnd;

  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this) closeModal()">
      <div class="modal-box">
        <div class="modal-head">
          <div class="modal-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            ${isEdit ? "ویرایش خودرو" : "افزودن خودرو جدید"}
          </div>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>نام/شناسه خودرو</label>
              <input type="text" id="vf_name" value="${v.name}" placeholder="مثلاً خودرو ۴">
            </div>
            <div class="form-group">
              <label>پلاک</label>
              <input type="text" id="vf_plate" value="${v.plate}" placeholder="مثلاً ۱۲۳-د">
            </div>

            <div class="form-group">
              <label>نوع بدنه</label>
              <select id="vf_bodyType">
                ${Object.entries(BODY_TYPE_LABELS)
                  .map(
                    ([k, l]) =>
                      `<option value="${k}" ${v.bodyType === k ? "selected" : ""}>${l}</option>`,
                  )
                  .join("")}
              </select>
            </div>
            <div class="form-group">
              <label>نوع سرویس‌دهی</label>
              <select id="vf_serviceType" onchange="toggleCapacityFields()">
                ${Object.entries(SERVICE_TYPE_LABELS)
                  .map(
                    ([k, l]) =>
                      `<option value="${k}" ${v.serviceType === k ? "selected" : ""}>${l}</option>`,
                  )
                  .join("")}
              </select>
            </div>

            <div class="form-group" id="vf_passengerWrap">
              <label>ظرفیت مسافر (نفر)</label>
              <input type="number" id="vf_passengerCapacity" min="0" max="20" value="${v.passengerCapacity}">
            </div>
            <div class="form-group" id="vf_cargoWrap">
              <label>ظرفیت بار (تعداد واحد/نمونه)</label>
              <input type="number" id="vf_cargoCapacity" min="0" max="100" value="${v.cargoCapacity}">
            </div>

            <div class="form-group full">
              <div class="checkbox-row">
                <input type="checkbox" id="vf_hasFridge" ${v.hasFridge ? "checked" : ""} onchange="toggleFridgeField()">
                <label for="vf_hasFridge">دارای محفظه یخچالی</label>
              </div>
            </div>
            <div class="form-group" id="vf_fridgeWrap" style="display:${v.hasFridge ? "flex" : "none"}">
              <label>ظرفیت یخچال (واحد)</label>
              <input type="number" id="vf_fridgeCapacity" min="0" max="50" value="${v.fridgeCapacity}">
            </div>

            <div class="form-group full">
              <div class="checkbox-row">
                <input type="checkbox" id="vf_is24h" ${is24h ? "checked" : ""} onchange="toggleShiftFields()">
                <label for="vf_is24h">فعالیت ۲۴ ساعته</label>
              </div>
            </div>
            <div class="form-group" id="vf_shiftStartWrap" style="display:${is24h ? "none" : "flex"}">
              <label>شروع شیفت کاری</label>
              <input type="time" id="vf_shiftStart" value="${v.shiftStart || "07:00"}">
            </div>
            <div class="form-group" id="vf_shiftEndWrap" style="display:${is24h ? "none" : "flex"}">
              <label>پایان شیفت کاری</label>
              <input type="time" id="vf_shiftEnd" value="${v.shiftEnd || "16:00"}">
            </div>

            <div class="form-group">
              <label>وضعیت عملیاتی</label>
              <select id="vf_status">
                ${Object.entries(STATUS_LABELS)
                  .map(
                    ([k, l]) =>
                      `<option value="${k}" ${v.status === k ? "selected" : ""}>${l}</option>`,
                  )
                  .join("")}
              </select>
            </div>
            <div class="form-group">
              <label>مالکیت</label>
              <select id="vf_ownership" onchange="toggleContractorField()">
                ${Object.entries(OWNERSHIP_LABELS)
                  .map(
                    ([k, l]) =>
                      `<option value="${k}" ${v.ownership === k ? "selected" : ""}>${l}</option>`,
                  )
                  .join("")}
              </select>
            </div>
            <div class="form-group full" id="vf_contractorWrap" style="display:${v.ownership === "contractor" ? "flex" : "none"}">
              <label>نام شرکت طرف قرارداد</label>
              <input type="text" id="vf_contractorName" value="${v.contractorName || ""}" placeholder="مثلاً شرکت حمل‌ونقل ایران‌پیک">
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn-secondary" onclick="closeModal()">انصراف</button>
          <button class="btn-primary" onclick="saveVehicleForm(${isEdit ? vehicleId : "null"})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            ${isEdit ? "ذخیره تغییرات" : "افزودن خودرو"}
          </button>
        </div>
      </div>
    </div>`;

  toggleCapacityFields();
}

function toggleCapacityFields() {
  const st = document.getElementById("vf_serviceType").value;
  document.getElementById("vf_passengerWrap").style.display =
    st === "cargo" ? "none" : "flex";
  document.getElementById("vf_cargoWrap").style.display =
    st === "passenger" ? "none" : "flex";
}

function toggleFridgeField() {
  const checked = document.getElementById("vf_hasFridge").checked;
  document.getElementById("vf_fridgeWrap").style.display = checked
    ? "flex"
    : "none";
}

function toggleShiftFields() {
  const is24h = document.getElementById("vf_is24h").checked;
  document.getElementById("vf_shiftStartWrap").style.display = is24h
    ? "none"
    : "flex";
  document.getElementById("vf_shiftEndWrap").style.display = is24h
    ? "none"
    : "flex";
}

function toggleContractorField() {
  const ownership = document.getElementById("vf_ownership").value;
  document.getElementById("vf_contractorWrap").style.display =
    ownership === "contractor" ? "flex" : "none";
}

function saveVehicleForm(vehicleId) {
  const name = document.getElementById("vf_name").value.trim();
  const plate = document.getElementById("vf_plate").value.trim();
  if (!name || !plate) {
    alert("لطفاً نام و پلاک خودرو را وارد کنید.");
    return;
  }

  const is24h = document.getElementById("vf_is24h").checked;
  const hasFridge = document.getElementById("vf_hasFridge").checked;

  const data = {
    name,
    plate,
    bodyType: document.getElementById("vf_bodyType").value,
    serviceType: document.getElementById("vf_serviceType").value,
    passengerCapacity:
      parseInt(document.getElementById("vf_passengerCapacity").value) || 0,
    cargoCapacity:
      parseInt(document.getElementById("vf_cargoCapacity").value) || 0,
    hasFridge,
    fridgeCapacity: hasFridge
      ? parseInt(document.getElementById("vf_fridgeCapacity").value) || 0
      : 0,
    shiftStart: is24h ? null : document.getElementById("vf_shiftStart").value,
    shiftEnd: is24h ? null : document.getElementById("vf_shiftEnd").value,
    status: document.getElementById("vf_status").value,
    ownership: document.getElementById("vf_ownership").value,
    contractorName:
      document.getElementById("vf_ownership").value === "contractor"
        ? document.getElementById("vf_contractorName").value.trim()
        : "",
  };

  if (vehicleId != null) {
    const idx = vehicles.findIndex((v) => v.id === vehicleId);
    vehicles[idx] = { ...vehicles[idx], ...data };
  } else {
    vehicles.push({ id: nextVehicleId++, ...data });
  }

  saveState();
  closeModal();
  render();
}

function deleteVehicle(vehicleId) {
  const car = vehicles.find((v) => v.id === vehicleId);
  const sampleCount = samples.filter((s) => s.carId === vehicleId).length;
  if (sampleCount > 0) {
    if (
      !confirm(
        `این خودرو ${sampleCount} نمونه فعال دارد. با حذف خودرو، نمونه‌های مرتبط هم حذف می‌شوند. ادامه می‌دهید؟`,
      )
    )
      return;
  } else if (!confirm(`آیا از حذف «${car.name}» مطمئن هستید؟`)) return;

  vehicles = vehicles.filter((v) => v.id !== vehicleId);
  samples = samples.filter((s) => s.carId !== vehicleId);
  saveState();
  render();
}

// ─── ابزار تاریخ جلالی (الگوریتم استاندارد jalaali-js) ───
function div(a, b) { return ~~(a / b); }
function mod(a, b) { return a - ~~(a / b) * b; }
function jalCal(jy) {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  const bl = breaks.length, gy = jy + 621;
  let leapJ = -14, jp = breaks[0], jm, jump, leap, leapG, march, n, i;
  for (i = 1; i < bl; i += 1) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}
function g2d(gy, gm, gd) {
  let d = div((gy + div(gm - 8, 6) - 1001001) * 1461, 4)
    + div(153 * mod(gm + 9, 12) + 2, 5)
    + gd - 34840408;
  d = d - div(div(gy + 1001001 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}
function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 390847808;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 1001001 + div(8 - gm, 6);
  return { gy, gm, gd };
}
function j2d(jy, jm, jd) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}
function d2j(jdn) {
  const gy = d2g(jdn).gy, jy0 = gy - 621, r = jalCal(jy0), jdn1f = g2d(gy, 3, r.march);
  let jy = jy0, k = jdn - jdn1f, jm, jd;
  if (k >= 0) {
    if (k <= 185) { jm = 1 + div(k, 31); jd = mod(k, 31) + 1; return { jy, jm, jd }; }
    k -= 186;
  } else { jy -= 1; k += 179; }
  jm = 6 + div(k, 30); jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}
const jalMonthLen = (jy, jm) => (jm <= 6 ? 31 : jm <= 11 ? 30 : jalCal(jy).leap === 0 ? 30 : 29);
const isoToJalali = (iso) => { const [gy, gm, gd] = iso.split("-").map(Number); return d2j(g2d(gy, gm, gd)); };
const jalToIso = (jy, jm, jd) => { const g = d2g(j2d(jy, jm, jd)); return `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`; };
const isoToJalaliStr = (iso) => { const j = isoToJalali(iso); return `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`; };
const JAL_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const toFa = (s) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const toEn = (s) => String(s).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));

// ─── توست (جایگزین alert مرورگر) ───
function showToast(type, text) {
  let root = document.getElementById("toastRoot");
  if (!root) { root = document.createElement("div"); root.id = "toastRoot"; document.body.appendChild(root); }
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = text;
  root.appendChild(el);
  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 4000);
}

// ─── تجزیه ورودی دستی ساعت و تاریخ ───
function normalizeTimeInput(raw) {
  const s = toEn(raw).replace(/\s+/g, "");
  let h = null, m = null;
  if (s.includes(":")) {
    const p = s.split(":");
    if (p.length !== 2 || !/^\d{1,2}$/.test(p[0]) || !/^\d{1,2}$/.test(p[1])) return null;
    h = +p[0]; m = +p[1];
  } else if (/^\d{4}$/.test(s)) { h = +s.slice(0, 2); m = +s.slice(2); }
  else if (/^\d{3}$/.test(s)) {
    if (+s.slice(0, 2) <= 23) { h = +s.slice(0, 2); m = +s[2]; }   // 125 → 12:05
    else { h = +s[0]; m = +s.slice(1); }                            // 930 → 09:30
  }
  else if (/^\d{1,2}$/.test(s)) { h = +s; m = 0; }
  else return null;
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function normalizeDateInput(raw) {
  const s = toEn(raw).replace(/\s+/g, "");
  let y, m, d;
  if (/^[\d]{1,4}[/\-.][\d]{1,2}[/\-.][\d]{1,2}$/.test(s)) {
    [y, m, d] = s.split(/[/\-.]/).map(Number);
  } else if (/^\d{6}$/.test(s)) { y = +s.slice(0, 2) + 1400; m = +s.slice(2, 4); d = +s.slice(4); }
  else if (/^\d{8}$/.test(s)) { y = +s.slice(0, 4); m = +s.slice(4, 6); d = +s.slice(6); }
  else return null;
  if (y < 100) y += 1400;
  if (y < 1300 || y > 1500 || m < 1 || m > 12) return null;
  if (d < 1 || d > jalMonthLen(y, m)) return null;
  return jalToIso(y, m, d);
}
function segmentAt(el) {
  const pos = el.selectionStart == null ? el.value.length : el.selectionStart;
  const before = toEn(el.value).slice(0, pos);
  return (before.match(/[/:\-.]/g) || []).length;
}

// ─── انتخابگر تاریخ (تقویم جلالی) ───
let dpState = null;
let tpState = null;
function closePickers() {
  document.querySelectorAll(".picker-pop").forEach((p) => p.remove());
  dpState = null;
  tpState = null;
  document.removeEventListener("pointerdown", outsideClose, true);
  document.removeEventListener("keydown", escClose, true);
}
function outsideClose(e) {
  if (e.target.closest(".picker-pop") || e.target.closest(".picker-btn")) return;
  closePickers();
}
function escClose(e) { if (e.key === "Escape") closePickers(); }
function positionPopover(el, anchor) {
  const r = anchor.getBoundingClientRect();
  el.style.visibility = "hidden";
  requestAnimationFrame(() => {
    const w = el.offsetWidth, hgt = el.offsetHeight;
    let top = r.bottom + 6;
    if (top + hgt > innerHeight - 8) top = Math.max(8, r.top - hgt - 6);
    let right = innerWidth - r.right;
    if (right + w > innerWidth - 8) right = 8;
    el.style.top = top + "px";
    el.style.right = Math.max(8, right) + "px";
    el.style.visibility = "";
  });
}
function openDatePicker(anchor, iso, onPick) {
  closePickers();
  const j = isoToJalali(iso || todayStr());
  dpState = { y: j.jy, m: j.jm, view: "days", iso, onPick };
  const el = document.createElement("div");
  el.className = "picker-pop";
  document.body.appendChild(el);
  dpState.el = el;
  bindDatePicker();
  renderDatePicker();
  positionPopover(el, anchor);
  document.addEventListener("pointerdown", outsideClose, true);
  document.addEventListener("keydown", escClose, true);
}
function renderDatePicker() {
  const st = dpState;
  const todayJ = isoToJalali(todayStr());
  const selJ = st.iso ? isoToJalali(st.iso) : null;
  let inner = "";
  if (st.view === "days") {
    const g = d2g(j2d(st.y, st.m, 1));
    const offset = (new Date(g.gy, g.gm - 1, g.gd).getDay() + 1) % 7; // شنبه = ستون اول
    const len = jalMonthLen(st.y, st.m);
    let cells = "";
    for (let i = 0; i < offset; i++) cells += `<span class="dp-blank"></span>`;
    for (let d = 1; d <= len; d++) {
      const isSel = selJ && selJ.jy === st.y && selJ.jm === st.m && selJ.jd === d;
      const isToday = todayJ.jy === st.y && todayJ.jm === st.m && todayJ.jd === d;
      cells += `<button type="button" class="dp-day${isSel ? " sel" : ""}${isToday ? " today" : ""}" data-act="day" data-d="${d}">${toFa(d)}</button>`;
    }
    inner = `
      <div class="dp-head">
        <button type="button" class="dp-nav" data-act="prev" title="ماه قبل">›</button>
        <div class="dp-title">
          <button type="button" class="dp-title-btn" data-act="view-months">${JAL_MONTHS[st.m - 1]}</button>
          <button type="button" class="dp-title-btn" data-act="view-years">${toFa(st.y)}</button>
        </div>
        <button type="button" class="dp-nav" data-act="next" title="ماه بعد">‹</button>
      </div>
      <div class="dp-week">${["شن", "یک", "دو", "سه", "چهار", "پنج", "جم"].map((w) => `<span>${w}</span>`).join("")}</div>
      <div class="dp-grid">${cells}</div>`;
  } else if (st.view === "months") {
    inner = `
      <div class="dp-head">
        <button type="button" class="dp-nav" data-act="prev" title="سال قبل">›</button>
        <div class="dp-title"><button type="button" class="dp-title-btn" data-act="view-days">${toFa(st.y)}</button></div>
        <button type="button" class="dp-nav" data-act="next" title="سال بعد">‹</button>
      </div>
      <div class="dp-months">${JAL_MONTHS.map((mn, i) => `<button type="button" class="${st.m === i + 1 ? "sel" : ""}" data-act="month" data-m="${i + 1}">${mn}</button>`).join("")}</div>`;
  } else {
    const base = Math.floor((st.y - 1) / 12) * 12 + 1;
    let ys = "";
    for (let y = base; y < base + 12; y++) ys += `<button type="button" class="${y === st.y ? "sel" : ""}" data-act="year" data-y="${y}">${toFa(y)}</button>`;
    inner = `
      <div class="dp-head">
        <button type="button" class="dp-nav" data-act="prev" title="۱۲ سال قبل">›</button>
        <div class="dp-title"><button type="button" class="dp-title-btn" data-act="view-days">${toFa(base)} تا ${toFa(base + 11)}</button></div>
        <button type="button" class="dp-nav" data-act="next" title="۱۲ سال بعد">‹</button>
      </div>
      <div class="dp-years">${ys}</div>`;
  }
  st.el.innerHTML = inner + `<div class="dp-foot"><button type="button" class="dp-today" data-act="today">امروز</button></div>`;
}
function bindDatePicker() {
  dpState.el.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const st = dpState, act = btn.dataset.act;
    const d = act === "next" ? 1 : -1;
    if (act === "prev" || act === "next") {
      if (st.view === "days") { st.m += d; if (st.m < 1) { st.m = 12; st.y--; } if (st.m > 12) { st.m = 1; st.y++; } }
      else if (st.view === "months") st.y += d;
      else st.y += d * 12;
      renderDatePicker();
    } else if (act === "view-months") { st.view = "months"; renderDatePicker(); }
    else if (act === "view-years") { st.view = "years"; renderDatePicker(); }
    else if (act === "view-days") { st.view = "days"; renderDatePicker(); }
    else if (act === "month") { st.m = +btn.dataset.m; st.view = "days"; renderDatePicker(); }
    else if (act === "year") { st.y = +btn.dataset.y; st.view = "days"; renderDatePicker(); }
    else if (act === "day") { st.onPick(jalToIso(st.y, st.m, +btn.dataset.d)); }
    else if (act === "today") { const j = isoToJalali(todayStr()); st.y = j.jy; st.m = j.jm; st.onPick(todayStr()); }
  });
}

// ─── انتخابگر ساعت (صفحه دایره‌ای ۲۴ ساعته + دقیقه کشیدنی) ───
function openTimePicker(anchor, hm, onPick) {
  closePickers();
  const [h, m] = hm ? hm.split(":").map(Number) : [8, 0];
  tpState = { h, m, mode: "h", onPick, drag: false };
  const el = document.createElement("div");
  el.className = "picker-pop picker-pop-time";
  document.body.appendChild(el);
  tpState.el = el;
  bindTimePicker();
  renderTimePicker();
  positionPopover(el, anchor);
  document.addEventListener("pointerdown", outsideClose, true);
  document.addEventListener("keydown", escClose, true);
}
function renderTimePicker() {
  const { h, m, mode } = tpState;
  const labels = [];
  const count = mode === "h" ? 24 : 12;
  for (let i = 0; i < count; i++) {
    const v = mode === "h" ? i : i * 5;
    const a = (v * (mode === "h" ? 15 : 6) * Math.PI) / 180;
    const x = 50 + 40 * Math.sin(a), y = 50 - 40 * Math.cos(a);
    labels.push(`<span class="tp-label" data-v="${v}" style="left:${x}%;top:${y}%">${toFa(String(v).padStart(2, "0"))}</span>`);
  }
  tpState.el.innerHTML = `
    <div class="tp-digital">
      <button type="button" class="tp-seg" data-act="mode-h">${toFa(String(h).padStart(2, "0"))}</button>
      <span class="tp-colon">:</span>
      <button type="button" class="tp-seg" data-act="mode-m">${toFa(String(m).padStart(2, "0"))}</button>
    </div>
    <div class="tp-dial">
      ${labels.join("")}
      <div class="tp-hand"><span class="tp-hand-dot"></span></div>
      <span class="tp-center"></span>
    </div>
    <div class="tp-hint">${mode === "h" ? "ساعت را انتخاب کنید (۲۴ ساعته)" : "دقیقه: بکشید؛ بین مضرب‌های ۵ هم قابل انتخاب است"}</div>`;
  paintTimePicker();
}
function paintTimePicker() {
  const el = tpState.el, { h, m, mode } = tpState;
  const hand = el.querySelector(".tp-hand");
  if (hand) hand.style.transform = `rotate(${mode === "h" ? (h + m / 60) * 15 : m * 6}deg)`;
  const segs = el.querySelectorAll(".tp-seg");
  if (segs[0]) { segs[0].textContent = toFa(String(h).padStart(2, "0")); segs[0].classList.toggle("active", mode === "h"); }
  if (segs[1]) { segs[1].textContent = toFa(String(m).padStart(2, "0")); segs[1].classList.toggle("active", mode === "m"); }
  el.querySelectorAll(".tp-label").forEach((lb) => {
    const v = +lb.dataset.v;
    lb.classList.toggle("active", mode === "h" ? v === h : v === m);
  });
}
function bindTimePicker() {
  const el = tpState.el;
  el.addEventListener("click", (e) => {
    const seg = e.target.closest("[data-act]");
    if (!seg) return;
    tpState.mode = seg.dataset.act === "mode-h" ? "h" : "m";
    renderTimePicker();
  });
  const apply = (e) => {
    const dial = e.target.closest(".tp-dial");
    if (!dial) return;
    const r = dial.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const ang = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
    if (tpState.mode === "h") tpState.h = Math.round(ang / 15) % 24;
    else tpState.m = Math.round(ang / 6) % 60; // هر ۶ درجه = ۱ دقیقه → کشیدن بین اعداد هم کار می‌کند
    paintTimePicker();
    tpState.onPick(`${String(tpState.h).padStart(2, "0")}:${String(tpState.m).padStart(2, "0")}`);
  };
  el.addEventListener("pointerdown", (e) => {
    const dial = e.target.closest(".tp-dial");
    if (!dial) return;
    dial.setPointerCapture(e.pointerId);
    tpState.drag = true;
    apply(e);
  });
  el.addEventListener("pointermove", (e) => { if (tpState.drag) apply(e); });
  el.addEventListener("pointerup", () => { tpState.drag = false; });
  el.addEventListener("pointercancel", () => { tpState.drag = false; });
}

// ─── سیم‌کشی انتخابگرها به فرم ───
function initPickers() {
  const dateInput = document.getElementById("dateInput");
  const timeInput = document.getElementById("timeInput");
  if (!dateInput || !timeInput) return;
  dateInput.value = toFa(isoToJalaliStr(todayStr()));
  document.getElementById("dateBtn").addEventListener("click", () => {
    const iso = normalizeDateInput(dateInput.value) || todayStr();
    openDatePicker(dateInput, iso, (newIso) => {
      dateInput.value = toFa(isoToJalaliStr(newIso));
      dateInput.classList.remove("invalid");
      closePickers();
    });
  });
  document.getElementById("timeBtn").addEventListener("click", () => {
    openTimePicker(timeInput, normalizeTimeInput(timeInput.value), (hm) => {
      timeInput.value = toFa(hm);
      timeInput.classList.remove("invalid");
    });
  });
  timeInput.addEventListener("blur", () => {
    const raw = timeInput.value.trim();
    if (!raw) return;
    const n = normalizeTimeInput(raw);
    if (!n) { timeInput.classList.add("invalid"); showToast("error", "ساعت معتبر نیست؛ مثال: 09:30 یا 930 یا ۹:۳۰"); }
    else {
      timeInput.classList.remove("invalid");
      const disp = toFa(n);
      if (timeInput.value.trim() !== disp) { timeInput.value = disp; showToast("success", "ساعت به قالب صحیح تبدیل شد: " + disp); }
    }
  });
  dateInput.addEventListener("blur", () => {
    const raw = dateInput.value.trim();
    if (!raw) return;
    const n = normalizeDateInput(raw);
    if (!n) { dateInput.classList.add("invalid"); showToast("error", "تاریخ معتبر نیست؛ مثال: 1405/06/28 یا 050628"); }
    else {
      dateInput.classList.remove("invalid");
      const disp = toFa(isoToJalaliStr(n));
      if (dateInput.value.trim() !== disp) { dateInput.value = disp; showToast("success", "تاریخ به قالب صحیح تبدیل شد: " + disp); }
    }
  });
  timeInput.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const d = e.key === "ArrowUp" ? 1 : -1;
    const now = new Date();
    let [h, m] = (normalizeTimeInput(timeInput.value) || `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`).split(":").map(Number);
    if (segmentAt(timeInput) === 0) h = Math.max(0, Math.min(23, h + d));
    else m = Math.max(0, Math.min(59, m + d));
    timeInput.value = toFa(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  });
  dateInput.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const d = e.key === "ArrowUp" ? 1 : -1;
    let { jy, jm, jd } = isoToJalali(normalizeDateInput(dateInput.value) || todayStr());
    const seg = segmentAt(dateInput);
    if (seg === 0) jy = Math.max(1390, Math.min(1420, jy + d));
    else if (seg === 1) jm = Math.max(1, Math.min(12, jm + d));
    else jd = Math.max(1, Math.min(jalMonthLen(jy, jm), jd + d));
    jd = Math.min(jd, jalMonthLen(jy, jm));
    dateInput.value = toFa(`${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`);
  });
}
// ─── Init ───
render();
initPickers();
