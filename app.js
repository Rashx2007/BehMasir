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
    name: "خودرو ۱ (سواری)",
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
    name: "خودرو ۲ (سواری)",
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
  {
    id: 4,
    name: "خودرو ۴ (سواری)",
    plate: "۴۴۴-ش",
    bodyType: "sedan",
    serviceType: "passenger",
    passengerCapacity: 3,
    cargoCapacity: 5,
    hasFridge: false,
    fridgeCapacity: 0,
    shiftStart: "08:00",
    shiftEnd: "16:00",
    ownership: "org",
    contractorName: "",
    status: "ok",
  },
  {
    id: 5,
    name: "خودرو ۵ (وانت یخچالی)",
    plate: "۵۵۵-س",
    bodyType: "pickup_single",
    serviceType: "both",
    passengerCapacity: 1,
    cargoCapacity: 5,
    hasFridge: true,
    fridgeCapacity: 5,
    shiftStart: "08:00",
    shiftEnd: "16:00",
    ownership: "org",
    contractorName: "",
    status: "ok",
  },
  {
    id: 6,
    name: "خودرو ۶ (وانت دوکابین)",
    plate: "۶۶۶-ی",
    bodyType: "pickup_double",
    serviceType: "both",
    passengerCapacity: 3,
    cargoCapacity: 5,
    hasFridge: false,
    fridgeCapacity: 0,
    shiftStart: "08:00",
    shiftEnd: "16:00",
    ownership: "org",
    contractorName: "",
    status: "ok",
  },
  {
    id: 7,
    name: "خودرو ۷ (وانت یخچالی)",
    plate: "۷۷۷-ب",
    bodyType: "pickup_single",
    serviceType: "both",
    passengerCapacity: 1,
    cargoCapacity: 5,
    hasFridge: true,
    fridgeCapacity: 5,
    shiftStart: "08:00",
    shiftEnd: "16:00",
    ownership: "org",
    contractorName: "",
    status: "ok",
  },
  {
    id: 8,
    name: "خودرو ۸ (وانت دوکابین)",
    plate: "۸۸۸-ل",
    bodyType: "pickup_double",
    serviceType: "cargo",
    passengerCapacity: 0,
    cargoCapacity: 5,
    hasFridge: false,
    fridgeCapacity: 0,
    shiftStart: "08:00",
    shiftEnd: "16:00",
    ownership: "org",
    contractorName: "",
    status: "ok",
  },
];

const defaultUnits = [
  "امور اداری",
  "بهداشت و درمان",
  "واحد فنی",
  "مرکز مدیریت بیماری‌های واگیر",
  "آزمایشگاه مرکزی",
  "مرکز بهداشت شهرستان",
  "امور پشتیبانی",
  "فناوری اطلاعات",
  "تدارکات",
  "اورژانس",
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
  return t.toLocaleDateString("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
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
// نسخهٔ قبلی پیش از مهاجرت پشتیبان می‌شود؛ رکوردهای موجود بازنویسی نمی‌شوند.
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  let saved = null;
  if (raw) {
    try {
      saved = JSON.parse(raw);
    } catch {
      localStorage.setItem(`${STORAGE_KEY}_corrupt_backup`, raw);
    }
    if (
      saved &&
      saved.schemaVersion !== 3 &&
      !localStorage.getItem(`${STORAGE_KEY}_backup_before_v3`)
    ) {
      localStorage.setItem(`${STORAGE_KEY}_backup_before_v3`, raw);
    }
  }
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) saved = {};
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const result = {
    ...saved,
    schemaVersion: 3,
    vehicles: Array.isArray(saved.vehicles)
      ? saved.vehicles
      : clone(defaultVehicles),
    samples: Array.isArray(saved.samples)
      ? saved.samples
      : clone(defaultSamples),
    history: Array.isArray(saved.history)
      ? saved.history
      : clone(defaultHistory),
    centers: Array.isArray(saved.centers)
      ? saved.centers
      : clone(defaultCenters),
    users: Array.isArray(saved.users) ? saved.users : [],
  };
  const normalizePlate = (value) =>
    String(value || "")
      .replace(/[۰-۹]/g, (ch) => "۰۱۲۳۴۵۶۷۸۹".indexOf(ch))
      .replace(/\s/g, "");
  let next = Math.max(0, ...result.vehicles.map((v) => Number(v.id) || 0)) + 1;
  if (saved.schemaVersion !== 3)
    defaultVehicles.forEach((vehicle) => {
      if (
        result.vehicles.some(
          (v) => normalizePlate(v.plate) === normalizePlate(vehicle.plate),
        )
      )
        return;
      const id = result.vehicles.some((v) => v.id === vehicle.id)
        ? next++
        : vehicle.id;
      result.vehicles.push({ ...vehicle, id });
      next = Math.max(next, id + 1);
    });
  result.units = [
    ...new Set(
      [
        ...(saved.schemaVersion === 3 && Array.isArray(saved.units)
          ? []
          : defaultUnits),
        ...(Array.isArray(saved.units) ? saved.units : []),
        ...result.samples.map((x) => x.unit),
        ...result.history.map((x) => x.unit),
      ]
        .filter((x) => typeof x === "string" && x.trim())
        .map((x) => x.trim()),
    ),
  ];
  result.usedUnits = [
    ...new Set(
      [
        ...(Array.isArray(saved.usedUnits) ? saved.usedUnits : []),
        ...result.samples.map((record) => record.unit),
        ...result.history.map((record) => record.unit),
      ]
        .filter((unit) => typeof unit === "string" && unit.trim())
        .map((unit) => unit.trim()),
    ),
  ];
  result.nextVehicleId = Math.max(Number(saved.nextVehicleId) || 1, next);
  result.nextSampleId = Math.max(
    Number(saved.nextSampleId) || 104,
    ...result.samples.map((x) => (Number(x.id) || 0) + 1),
  );
  result.nextCenterId = Math.max(
    Number(saved.nextCenterId) || 1,
    ...result.centers.map((x) => (Number(x.id) || 0) + 1),
  );
  result.nextUserId = Math.max(
    Number(saved.nextUserId) || 1,
    ...result.users.map((x) => (Number(x.id) || 0) + 1),
  );
  result.history.forEach((record) => {
    if (!record.carId)
      record.carId =
        result.vehicles.find((v) => v.name === record.carName)?.id || null;
  });
  return result;
}

function saveState() {
  usedRequesterUnits = [
    ...new Set(
      [
        ...usedRequesterUnits,
        ...samples.map((record) => record.unit),
        ...history.map((record) => record.unit),
      ]
        .filter((unit) => typeof unit === "string" && unit.trim())
        .map((unit) => unit.trim()),
    ),
  ];
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...state,
      schemaVersion: 3,
      vehicles,
      samples,
      nextSampleId,
      nextVehicleId,
      history,
      centers,
      nextCenterId,
      units: requesterUnits,
      usedUnits: usedRequesterUnits,
      users: appUsers,
      nextUserId,
    }),
  );
}

const state = loadState();
let vehicles = state.vehicles;
let samples = state.samples;
let nextSampleId = state.nextSampleId;
let nextVehicleId = state.nextVehicleId;
let centers = state.centers;
let nextCenterId = state.nextCenterId;
let requesterUnits = state.units;
let usedRequesterUnits = state.usedUnits;
let appUsers = state.users;
let nextUserId = state.nextUserId;
let pendingConfirmAction = null;
let currentUser = null;
let sessionExpiresAt = 0;
samples.forEach((sample) => {
  if (!sample.date) sample.date = dateOffset(0);
});
const todayStr = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
let history = state.history || [];
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
  if (!car.shiftStart && !car.shiftEnd) return true;
  const toMinutes = (value) => {
    const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
    if (!match || +match[1] > 23 || +match[2] > 59) return null;
    return +match[1] * 60 + +match[2];
  };
  const current = toMinutes(time),
    start = toMinutes(car.shiftStart),
    end = toMinutes(car.shiftEnd);
  if (current === null || start === null || end === null) return false;
  return start <= end
    ? current >= start && current <= end
    : current >= start || current <= end;
}

// اختلاف دو ساعت "HH:MM" به دقیقه (مقدار مطلق)
function minutesDiff(t1, t2) {
  const [h1, m1] = t1.split(":").map(Number);
  const [h2, m2] = t2.split(":").map(Number);
  return Math.abs(h1 * 60 + m1 - (h2 * 60 + m2));
}

// فاصله Haversine (km)
function hasCenterCoordinates(center) {
  return (
    !!center &&
    typeof center.lat === "number" &&
    Number.isFinite(center.lat) &&
    Math.abs(center.lat) <= 90 &&
    typeof center.lng === "number" &&
    Number.isFinite(center.lng) &&
    Math.abs(center.lng) <= 180
  );
}
function haversine(a, b) {
  if (!hasCenterCoordinates(a) || !hasCenterCoordinates(b)) return null;
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
  applyRoleVisibility();
  if (!currentUser) {
    clearProtectedContent();
    return;
  }
  if (canAccess("fleet.read")) {
    renderStats();
    renderCars();
    renderVehicles();
    renderVehicleSidebar();
    renderDashboard();
    renderCentersList();
    renderCentersMap();
  } else clearFleetContent();
  if (canAccess("requests.create")) {
    renderCenterSelects();
    renderUnitList();
    renderCarSelect();
  } else
    ["origin", "destination", "carSelect", "unitList"].forEach((id) =>
      document.getElementById(id)?.replaceChildren(),
    );
  if (allowedTabs().includes("requests")) renderRequests();
  else document.getElementById("requestsTbody").replaceChildren();
  if (allowedTabs().includes("history")) renderHistory();
  else document.getElementById("historyTbody").replaceChildren();
  renderUsersPanel();
  renderUnitsPanel();
  renderMissions();
  updateBell();
  refreshGuides();
  const unitInput = document.getElementById("unitInput");
  unitInput.disabled = currentUser.role === "requester";
  if (currentUser.role === "requester")
    unitInput.value = currentUser.unit || "";
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
          ${esc(car.name)} — ${esc(car.plate)}
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
                       : s.progress === "enroute"
                         ? "active"
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
                   <span class="sample-time">${esc(s.time)}</span>
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
        <div class="vside-name"><span class="vside-dot" style="background:${color}"></span>${esc(car.name)}</div>
        <div class="vside-plate">پلاک ${esc(car.plate)}</div>
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
      const label = formatRouteDate(d.date);
      const h = d.value ? Math.max(Math.round((d.value / max) * 100), 8) : 3;
      return `<div class="recent-day">
        <div class="recent-bar-wrap"><div class="recent-bar" style="height:${h}%"></div></div>
        <div class="recent-count">${faNum(d.value)}</div>
        <div class="recent-label">${esc(label)}</div>
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
    .filter((s) => canSeeSample(s) && s.date >= todayStr())
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
                : s.progress === "enroute"
                  ? "active"
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
          <td><span class="time-chip">${esc(s.time)}</span></td>
          <td><span class="badge ${stInfo[1]}">${stInfo[0]}</span></td>
          <td><span class="req-car"><span class="legend-dot" style="background:${color}"></span>${car ? car.name : "—"}</span></td>
                    <td><span class="req-actions">
            ${canDeliverSample(s) && s.status !== "delivered" ? `<button class="icon-btn success" title="ثبت تحویل" onclick="deliverSample(${s.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></button>` : ""}
            ${canDeleteSample(s) ? `<button class="icon-btn danger" title="حذف" onclick="deleteSample(${s.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>` : ""}
          </span></td>
        </tr>`;
          })
          .join("");
}
function renderHistory() {
  const tbody = document.getElementById("historyTbody");
  if (!tbody) return;
  const faDate = (d) => formatRouteDate(d);
  const visibleHistory = history.filter(canSeeSample);
  const rows =
    historyFilter === "all"
      ? visibleHistory
      : visibleHistory.filter((h) => h.date === historyFilter);
  tbody.innerHTML =
    rows.length === 0
      ? '<tr><td colspan="5" class="empty-state">موردی ثبت نشده</td></tr>'
      : rows
          .map(
            (h) => `<tr>
      <td>${faDate(h.date)}</td>
      <td class="req-route">${esc(h.origin)} ← ${esc(h.destination)}${h.unit ? `<div class="req-unit">${esc(h.unit)}</div>` : ""}</td>
      <td><span class="time-chip">${h.time}</span></td>
      <td>${esc(h.carName)}</td>
      <td><span class="badge badge-green">تحویل شده</span></td>
    </tr>`,
          )
          .join("");
  const sel = document.getElementById("historyFilter");
  if (sel) {
    const dates = [...new Set(visibleHistory.map((h) => h.date))];
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
  if (idx === -1 || !canDeleteSample(samples[idx])) {
    showToast("error", "اجازهٔ حذف این درخواست را ندارید.");
    return;
  }
  samples.splice(idx, 1);
  saveState();
  render();
}

function deliverSample(sampleId) {
  const s = samples.find((x) => x.id === sampleId);
  if (!s || !canDeliverSample(s) || s.status === "delivered") {
    showToast("error", "این مأموریت قابل ثبت تحویل نیست.");
    return;
  }
  s.status = "delivered";
  s.progress = "delivered";
  s.deliveredAt = new Date().toISOString();
  const car = getCarsWithSamples().find((c) => c.id === s.carId);
  history.unshift({
    id: Date.now(),
    date: todayStr(),
    carId: s.carId,
    requesterUserId: s.requesterUserId || null,
    sampleId: s.id,
    deliveredAt: s.deliveredAt,
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
  if (!requireAccess("requests.create")) return;
  const origin = document.getElementById("origin").value;
  const destination = document.getElementById("destination").value;
  const carId = parseInt(document.getElementById("carSelect").value);
  const unit =
    currentUser.role === "requester"
      ? currentUser.unit
      : document.getElementById("unitInput").value.trim();
  // مقادیر ISO/HMS که picker مستقیماً در dataset ذخیره کرده است
  // مقدار فعلی فیلد ملاک است تا dataset قدیمی پس از پاک‌کردن فرم ثبت نشود.
  const pickedTime = window._timePicker?.getValue();
  const timeRaw = pickedTime
    ? `${String(pickedTime.h).padStart(2, "0")}:${String(pickedTime.m).padStart(2, "0")}:00`
    : "";
  const dateRaw = window._datePicker?.getValue() || "";
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
  // انتخابگرها مقدار معتبر و نرمال‌شده را برمی‌گردانند.
  const time = timeRaw.slice(0, 5);
  const dateISO = dateRaw;

  alertEl.innerHTML = "";
  openRouteOptionsModal({
    origin,
    destination,
    time,
    date: dateISO,
    unit,
    preferredCarId: carId,
  });
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
  if (hasCenterCoordinates(nO) && hasCenterCoordinates(nD)) {
    cars.forEach((car) => {
      if (car.status !== "ok") return;
      if (loadOn(car) >= capacityOf(car)) return;
      if (!isWithinShift(car, time)) return;

      samples
        .filter(
          (s) =>
            s.carId === car.id &&
            s.date === reqDate &&
            s.status !== "delivered",
        )
        .forEach((s) => {
          const sO = locMap[s.origin],
            sD = locMap[s.destination];
          if (!hasCenterCoordinates(sO) || !hasCenterCoordinates(sD)) return;
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
              desc: `این سفر با درخواست «${s.origin} ← ${s.destination}» (ساعت ${s.time}) در همان ${car.name} هم‌پوشانی مسیری دارد. اختلاف زمانی: ${timeDiff} دقیقه.`,
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
    if (!isWithinShift(car, time)) return;
    if (clusterCarIds.has(car.id)) return; // قبلاً به‌عنوان گزینه ترکیبی اضافه شد

    const isPreferred = car.id === preferredCarId;
    const dDirect = haversine(nO, nD);
    options.push({
      type: "solo",
      carId: car.id,
      score: -loadOn(car) / capacityOf(car), // نسبت اشغال روز درخواست؛ بدون امتیاز انتخاب دستی
      distKm: dDirect === null ? null : dDirect.toFixed(2),
      estMin: dDirect === null ? null : Math.round((dDirect / 30) * 60) + 5,
      label: `سفر مستقل با ${car.name}`,
      desc: `${isPreferred ? "این خودرو در فرم انتخاب شده است؛ انتخاب دستی امتیاز اضافه ندارد. " : ""}نسبت ظرفیت اشغال‌شدهٔ روز درخواست: ${faNum(Math.round((loadOn(car) / capacityOf(car)) * 100))}٪.${dDirect === null ? " مختصات یک یا هر دو مرکز ثبت نشده است؛ فاصله و زمان سفر قابل برآورد نیست." : ""}`,
    });
  });

  // مرتب‌سازی بر اساس امتیاز (بهترین اول)
  options.sort((a, b) => {
    // سفر ترکیبی معتبر، سپس نسبت اشغال کمتر؛ انتخاب فرم حتی در تساوی دخالت ندارد.
    const typeOrder =
      Number(b.type === "cluster") - Number(a.type === "cluster");
    if (typeOrder) return typeOrder;
    if (a.score !== b.score) return b.score - a.score;
    const aCar = cars.find((car) => car.id === a.carId);
    const bCar = cars.find((car) => car.id === b.carId);
    const remainingOrder =
      capacityOf(bCar) - loadOn(bCar) - (capacityOf(aCar) - loadOn(aCar));
    return (
      remainingOrder ||
      a.carId - b.carId ||
      (a.withSample?.id || 0) - (b.withSample?.id || 0)
    );
  });
  return options.slice(0, 4); // حداکثر ۴ گزینه برای دمو، تا انتخاب برای کاربر سخت نشود
}

let vehicleShiftPickers = null;

let pendingRequest = null; // درخواست در حال بررسی (هنوز ثبت نشده)
let pendingOptions = [];
let selectedOptionIdx = 0;

function openRouteOptionsModal(request) {
  if (!requireAccess("requests.create")) return;
  destroyOptionMap();
  const requestedDate = new Date(`${request.date}T00:00:00Z`);
  if (
    !request.unit ||
    String(request.unit).trim().length > 100 ||
    !Number.isFinite(requestedDate.getTime()) ||
    requestedDate.toISOString().slice(0, 10) !== request.date
  ) {
    showToast("error", "واحد یا تاریخ درخواست معتبر نیست.");
    return;
  }
  if (
    !centers.some((c) => c.name === request.origin) ||
    !centers.some((c) => c.name === request.destination) ||
    request.origin === request.destination ||
    !/^\d{2}:\d{2}$/.test(request.time) ||
    +request.time.slice(0, 2) > 23 ||
    +request.time.slice(3) > 59 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(request.date) ||
    request.date < todayStr()
  ) {
    showToast("error", "مبدأ، مقصد، تاریخ یا ساعت درخواست معتبر نیست.");
    return;
  }
  pendingRequest = {
    ...request,
    unit: currentUser.role === "requester" ? currentUser.unit : request.unit,
    requesterUserId: currentUser.id,
  };
  pendingOptions = buildRouteOptions(request);
  selectedOptionIdx = 0;

  if (pendingOptions.length === 0) {
    document.getElementById("modalRoot").innerHTML = `
      <div class="modal-overlay">
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

// تاریخِ درخواست با همان تقویم جلالی انتخابگر نمایش داده می‌شود.
function formatRouteDate(iso) {
  const { jy, jm, jd } = jalaliCalendar.toParts(iso);
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`.replace(
    /\d/g,
    (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)],
  );
}

function renderRouteOptionsModal() {
  const cars = getCarsWithSamples();
  const carMap = Object.fromEntries(cars.map((c) => [c.id, c]));
  destroyOptionMap();

  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-overlay">
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
            درخواست: <b style="color:var(--text)">${esc(pendingRequest.origin)} ← ${esc(pendingRequest.destination)}</b> — ساعت ${esc(pendingRequest.time)} — تاریخ ${esc(formatRouteDate(pendingRequest.date || todayStr()))} — ${esc(pendingRequest.unit)}
          </div>
          <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:14px">
            رتبه‌بندی بر اساس قابلیت ترکیب مسیر، اختلاف زمانی (حداکثر ${MAX_CLUSTER_TIME_DIFF_MIN} دقیقه) و نسبت ظرفیت اشغال‌شدهٔ همان روز است؛ انتخاب خودرو در فرم امتیاز اضافه ندارد. در تساوی، ظرفیت باقی‌مانده بیشتر و سپس شناسهٔ خودرو ملاک است. انتخاب نهایی با شماست.
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
                    ${opt.type === "cluster" ? "🔗" : "🚗"} ${esc(opt.label)}
                  </div>
                  <span class="route-option-badge ${isBest ? "best" : "alt"}">${isBest ? "پیشنهاد برتر" : "گزینه جایگزین"}</span>
                </div>
                <div class="route-option-desc">${esc(opt.desc)}</div>
                <div class="route-option-meta">
                  <span>🚙 ${esc(car.name)} — ${esc(car.plate)}<span>📦 ${faNum(Math.max(capacityOf(car) - samples.filter((x) => x.carId === car.id && x.date === (pendingRequest.date || todayStr())).length, 0))} ظرفیت باقی‌مانده آن روز</span>
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
  if (!requireAccess("requests.create")) return;
  selectedOptionIdx = i;
  // بدون بازسازی کل مودال، تا نقشه و اسکرول حفظ شود
  document
    .querySelectorAll(".route-option")
    .forEach((el, idx) => el.classList.toggle("selected", idx === i));
  updateOptionMap();
}

function confirmRouteOption() {
  if (!requireAccess("requests.create")) return;
  const opt = pendingOptions[selectedOptionIdx];
  if (
    !pendingRequest ||
    !opt ||
    !buildRouteOptions(pendingRequest).some(
      (item) => item.carId === opt.carId && item.type === opt.type,
    )
  ) {
    showToast(
      "error",
      "وضعیت خودرو تغییر کرده است؛ پیشنهادها را دوباره بررسی کنید.",
    );
    return;
  }
  if (
    currentUser.role === "requester" &&
    pendingRequest.requesterUserId !== currentUser.id
  )
    return;
  if (!rememberUnit(pendingRequest.unit)) {
    showToast("error", "نام واحد معتبر نیست.");
    return;
  }
  const newSample = {
    id: nextSampleId++,
    carId: opt.carId,
    unit: pendingRequest.unit,
    origin: pendingRequest.origin,
    destination: pendingRequest.destination,
    time: pendingRequest.time,
    date: pendingRequest.date || todayStr(),
    status: "pending",
    progress: "scheduled",
    requesterUserId: currentUser.id,
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
  window.Pickers?.closeAll();
  pendingConfirmAction = null;
  if (vehicleShiftPickers) {
    Object.values(vehicleShiftPickers).forEach((picker) => picker.destroy());
    vehicleShiftPickers = null;
  }
  destroyOptionMap();
  document.getElementById("modalRoot").innerHTML = "";
  pendingRequest = null;
  pendingOptions = [];
}

// ─── مدیریت بحران خودرو ───
function handleCarEmergency(carId) {
  if (!requireAccess("fleet.write")) return;
  const vehicle = vehicles.find((v) => v.id === carId);
  const pending = samples.filter(
    (s) => s.carId === carId && s.status !== "delivered",
  );
  if (!vehicle || !pending.length) {
    showToast("error", "مأموریت بازی برای انتقال وجود ندارد.");
    return;
  }
  openLocalConfirm(
    "انتقال مأموریت‌ها",
    `مأموریت‌های باز خودرو «${vehicle.name}» با کنترل ظرفیت و شیفت به خودروهای دیگر منتقل شوند؟`,
    () => {
      if (!requireAccess("fleet.write")) return;
      let moved = 0;
      pending.forEach((sample) => {
        const target = vehicles
          .filter(
            (v) =>
              v.id !== carId &&
              v.status === "ok" &&
              isWithinShift(v, sample.time) &&
              samples.filter((s) => s.carId === v.id && s.date === sample.date)
                .length < capacityOf(v),
          )
          .sort(
            (a, b) =>
              samples.filter((s) => s.carId === a.id && s.date === sample.date)
                .length /
                capacityOf(a) -
              samples.filter((s) => s.carId === b.id && s.date === sample.date)
                .length /
                capacityOf(b),
          )[0];
        if (target) {
          sample.carId = target.id;
          moved++;
        }
      });
      saveState();
      closeModal();
      render();
      showToast(
        moved === pending.length ? "success" : "warning",
        `${faNum(moved)} از ${faNum(pending.length)} مأموریت منتقل شد.`,
      );
    },
  );
}

// ─── اعلان‌ها ───
function getAlerts() {
  if (!canAccess("fleet.read")) return [];
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
  if (!canAccess("fleet.read")) {
    const badge = document.getElementById("bellBadge");
    if (badge) badge.style.display = "none";
    return;
  }
  const badge = document.getElementById("bellBadge");
  if (!badge) return;
  const n = getAlerts().length;
  badge.style.display = n ? "flex" : "none";
  badge.textContent = n.toLocaleString("fa-IR");
}
function openAlertsModal() {
  if (!requireAccess("fleet.read")) return;
  const alerts = getAlerts();
  document.getElementById("modalRoot").innerHTML = `<div class="modal-overlay">
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
  if (!currentUser || !allowedTabs().includes(name)) {
    showToast("error", "به این بخش دسترسی ندارید.");
    return;
  }
  closeModal();
  currentTab = name;
  document
    .querySelectorAll(".tab-btn[data-tab]")
    .forEach((button) =>
      button.classList.toggle("active", button.dataset.tab === name),
    );
  document
    .querySelectorAll(".tab-panel")
    .forEach((panel) =>
      panel.classList.toggle("active", panel.id === `tab-${name}`),
    );
  if (name === "centers") initCentersMap();
  if (name === "vehicles") renderVehicles();
  refreshGuides();
  maybeShowGuide(name);
}

// ─── Clock ───
function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent = now.toLocaleTimeString(
    "fa-IR",
    { timeZone: "Asia/Tehran", hour12: false },
  );
  const d = document.getElementById("todayDate");
  if (d)
    d.textContent = now.toLocaleDateString("fa-IR-u-ca-persian", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
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
  const m = L.map(el, { zoomControl: false, ...options }).setView(
    DEFAULT_MAP_CENTER,
    12,
  );
  L.control
    .zoom({ zoomInTitle: "بزرگ‌نمایی نقشه", zoomOutTitle: "کوچک‌نمایی نقشه" })
    .addTo(m);
  L.tileLayer(TILE_URL, { attribution: "© OpenStreetMap" }).addTo(m);
  return m;
}

function showAlert(el, type, text) {
  if (!el) return;
  const message = document.createElement("div");
  message.className = `alert alert-${type === "ok" ? "success" : "error"}`;
  message.setAttribute("role", type === "ok" ? "status" : "alert");
  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = type === "ok" ? ALERT_ICON_OK : ALERT_ICON_ERR;
  const copy = document.createElement("span");
  copy.textContent = text;
  message.append(icon, copy);
  el.replaceChildren(message);
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
  el.innerHTML = requesterUnits
    .map((unit) => `<option value="${esc(unit)}"></option>`)
    .join("");
}

// ─── تب مراکز (ادمین) ───
let centersMap = null;
let centersLayer = null;
let draftMarker = null;
let draftPoint = null;

function initCentersMap() {
  if (!requireAccess("fleet.read")) return;
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
  centers.filter(hasCenterCoordinates).forEach((c) => {
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
  if (!requireAccess("centers.write")) return;
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
    coords.textContent = "موقعیت انتخاب نشده است؛ ثبت نام مرکز همچنان ممکن است";
    coords.classList.remove("has-point");
  }
}

function saveCenter() {
  if (!requireAccess("centers.write")) return;
  const nameEl = document.getElementById("centerName");
  const alertEl = document.getElementById("centerAlert");
  const name = nameEl.value.trim();
  if (!name || name.length > 100) {
    showAlert(alertEl, "err", "نام مرکز را وارد کنید؛ حداکثر ۱۰۰ نویسه.");
    return;
  }
  if (centers.some((c) => c.name === name)) {
    showAlert(alertEl, "err", "مرکزی با این نام قبلاً ثبت شده است.");
    return;
  }
  const position = hasCenterCoordinates(draftPoint)
    ? {
        lat: Number(draftPoint.lat.toFixed(6)),
        lng: Number(draftPoint.lng.toFixed(6)),
      }
    : { lat: null, lng: null };
  centers.push({ id: nextCenterId++, name, ...position });
  saveState();
  clearDraft();
  nameEl.value = "";
  showAlert(
    alertEl,
    "ok",
    `مرکز «${name}» ثبت شد${position.lat === null ? "؛ موقعیت آن روی نقشه هنوز ثبت نشده است" : ""}.`,
  );
  showToast("success", "مرکز جدید به فهرست مبدأ و مقصد اضافه شد.");
  setTimeout(() => alertEl.replaceChildren(), 6000);
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
        <div class="center-coords">${hasCenterCoordinates(c) ? `${c.lat.toFixed(5)}، ${c.lng.toFixed(5)}` : "موقعیت روی نقشه ثبت نشده است"}</div>
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
  if (!hasCenterCoordinates(c)) {
    showToast("info", "برای این مرکز موقعیت روی نقشه ثبت نشده است.");
    return;
  }
  if (!centersMap) {
    showToast(
      "warning",
      "نقشه در دسترس نیست؛ نام مرکز همچنان قابل استفاده است.",
    );
    return;
  }
  centersMap.setView([c.lat, c.lng], 15);
}

function openCenterRenameModal(id) {
  if (!requireAccess("centers.write")) return;
  const c = centers.find((x) => x.id === id);
  if (!c) return;
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-overlay">
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
  if (!requireAccess("centers.write")) return;
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
  if (!requireAccess("centers.write")) return;
  const center = centers.find((c) => c.id === id);
  if (!center) return;
  if (
    samples.some(
      (s) =>
        s.status !== "delivered" &&
        (s.origin === center.name || s.destination === center.name),
    )
  ) {
    showToast("error", "این مرکز در مأموریت‌های باز استفاده می‌شود.");
    return;
  }
  openLocalConfirm("حذف مرکز", `مرکز «${center.name}» حذف شود؟`, () => {
    if (!requireAccess("centers.write")) return;
    centers = centers.filter((c) => c.id !== id);
    saveState();
    closeModal();
    render();
  });
}

// ─── نقشه سفر اشتراکی (داخل پنجره پیشنهاد مسیر) ───
let optionMap = null;
let optionMapLayer = null;

function destroyOptionMap() {
  if (optionMap) {
    optionMap.stop();
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
    if (!hasCenterCoordinates(c)) return;
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
    optionMap = createBaseMap(mapEl, {
      scrollWheelZoom: false,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    });
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

  if (points.length === 1) optionMap.setView(points[0], 14, { animate: false });
  else if (points.length > 1)
    optionMap.fitBounds(L.latLngBounds(points), {
      animate: false,
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
          <div class="vehicle-name">${esc(car.name)}</div>
          <div class="vehicle-plate">پلاک: ${esc(car.plate)}</div>
        </div>
        <div class="vehicle-actions">
          <button class="icon-btn" title="${vehicleHasOpenMission(car.id) ? "ویرایش پس از اتمام یا حذف درخواست باز امکان‌پذیر است" : "ویرایش مشخصات خودرو"}" aria-disabled="${vehicleHasOpenMission(car.id)}" onclick="openVehicleForm(${car.id})">
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
        <div>🏢 مالکیت: <b>${OWNERSHIP_LABELS[car.ownership]}</b>${car.ownership === "contractor" && car.contractorName ? ` — ${esc(car.contractorName)}` : ""}</div>
        <div>📊 وضعیت فعلی: <b>${car.samples.length}/${capacityOf(car)}</b> ظرفیت اشغال‌شده</div>
      </div>
    </div>`;
    })
    .join("");
}

function vehicleHasOpenMission(vehicleId) {
  return samples.some(
    (sample) => sample.carId === vehicleId && sample.status !== "delivered",
  );
}
function openVehicleForm(vehicleId) {
  if (!requireAccess("fleet.write")) return;
  closeModal();
  const isEdit = vehicleId != null;
  if (isEdit && vehicleHasOpenMission(vehicleId)) {
    showToast(
      "warning",
      "این خودرو درخواست باز دارد؛ پس از اتمام یا حذف آن درخواست می‌توانید خودرو را ویرایش کنید.",
    );
    return;
  }
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
  if (!v) {
    showToast("error", "خودرو پیدا نشد.");
    return;
  }
  const is24h = !v.shiftStart && !v.shiftEnd;

  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-overlay">
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
              <input type="text" id="vf_name" value="${esc(v.name)}" placeholder="مثلاً خودرو ۴">
            </div>
            <div class="form-group">
              <label>پلاک</label>
              <input type="text" id="vf_plate" value="${esc(v.plate)}" placeholder="مثلاً ۱۲۳-د">
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
              <input type="text" id="vf_shiftStart" inputmode="numeric" autocomplete="off" dir="ltr" data-picker="time" value="${esc(v.shiftStart || "07:00")}">
            </div>
            <div class="form-group" id="vf_shiftEndWrap" style="display:${is24h ? "none" : "flex"}">
              <label>پایان شیفت کاری</label>
              <input type="text" id="vf_shiftEnd" inputmode="numeric" autocomplete="off" dir="ltr" data-picker="time" value="${esc(v.shiftEnd || "16:00")}">
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
              <input type="text" id="vf_contractorName" value="${esc(v.contractorName || "")}" placeholder="مثلاً شرکت حمل‌ونقل ایران‌پیک">
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

  vehicleShiftPickers = {
    start: Pickers.createTimePicker({
      input: document.getElementById("vf_shiftStart"),
      locale: persianLocale,
    }),
    end: Pickers.createTimePicker({
      input: document.getElementById("vf_shiftEnd"),
      locale: persianLocale,
    }),
  };
  const startParts = (v.shiftStart || "07:00").split(":").map(Number);
  const endParts = (v.shiftEnd || "16:00").split(":").map(Number);
  vehicleShiftPickers.start.setValue(startParts[0], startParts[1]);
  vehicleShiftPickers.end.setValue(endParts[0], endParts[1]);
  toggleCapacityFields();
  toggleShiftFields();
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
  if (vehicleShiftPickers)
    Object.values(vehicleShiftPickers).forEach((picker) =>
      picker.setDisabled(is24h),
    );
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
  if (!requireAccess("fleet.write")) return;
  if (
    vehicleId != null &&
    (!vehicles.some((v) => v.id === vehicleId) ||
      vehicleHasOpenMission(vehicleId))
  ) {
    showToast(
      "warning",
      "وضعیت خودرو تغییر کرده است؛ خودروی حذف‌شده یا دارای درخواست باز قابل ویرایش نیست.",
    );
    return;
  }
  const name = document.getElementById("vf_name").value.trim();
  const plate = document.getElementById("vf_plate").value.trim();
  if (!name || !plate) {
    showToast("error", "لطفاً نام و پلاک خودرو را وارد کنید.");
    return;
  }

  const is24h = document.getElementById("vf_is24h").checked;
  const hasFridge = document.getElementById("vf_hasFridge").checked;
  const startValue = is24h ? null : vehicleShiftPickers?.start.getValue();
  const endValue = is24h ? null : vehicleShiftPickers?.end.getValue();
  if (!is24h && (!startValue || !endValue)) {
    showToast("error", "شروع و پایان شیفت را با ساعت معتبر وارد کنید.");
    return;
  }
  const formatShift = (value) =>
    `${String(value.h).padStart(2, "0")}:${String(value.m).padStart(2, "0")}`;
  const shiftStart = is24h ? null : formatShift(startValue);
  const shiftEnd = is24h ? null : formatShift(endValue);
  if (!is24h && shiftStart === shiftEnd) {
    showToast(
      "error",
      "شروع و پایان شیفت یکسان است؛ برای فعالیت تمام‌روز گزینهٔ ۲۴ ساعته را فعال کنید.",
    );
    return;
  }

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
    shiftStart,
    shiftEnd,
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
  if (!requireAccess("fleet.write")) return;
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) return;
  if (
    samples.some(
      (item) => item.carId === vehicleId && item.status !== "delivered",
    ) ||
    appUsers.some(
      (u) =>
        u.active && u.role === "driver" && u.vehicleIds?.includes(vehicleId),
    )
  ) {
    showToast(
      "error",
      "خودرو مأموریت باز یا رانندهٔ فعال دارد؛ ابتدا آن‌ها را جابه‌جا کنید.",
    );
    return;
  }
  openLocalConfirm(
    "حذف خودرو",
    `آیا خودرو «${vehicle.name}» حذف شود؟ سوابق حفظ می‌شوند.`,
    () => {
      if (!requireAccess("fleet.write")) return;
      vehicles = vehicles.filter((v) => v.id !== vehicleId);
      saveState();
      closeModal();
      render();
    },
  );
}

// ─── ابزار تاریخ جلالی (الگوریتم استاندارد jalaali-js) ───

// ─── توست (جایگزین alert مرورگر) ───
function showToast(type, text) {
  const kind = ["success", "error", "warning", "info"].includes(type)
    ? type
    : "info";
  const labels = {
    success: "انجام شد",
    error: "نیاز به بررسی",
    warning: "توجه",
    info: "اطلاع‌رسانی",
  };
  const signs = { success: "✓", error: "!", warning: "!", info: "i" };
  let root = document.getElementById("toastRoot");
  if (!root) {
    root = document.createElement("div");
    root.id = "toastRoot";
    document.body.append(root);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast-${kind}`;
  toast.setAttribute("role", kind === "error" ? "alert" : "status");
  toast.innerHTML = `<span class="toast-symbol" aria-hidden="true">${signs[kind]}</span><div class="toast-copy"><strong>${labels[kind]}</strong><p></p></div><button type="button" class="toast-close" aria-label="بستن پیام" data-tooltip="بستن پیام">×</button>`;
  toast.querySelector("p").textContent = String(text);
  root.append(toast);
  while (root.children.length > 4) root.firstElementChild.remove();
  let timer,
    remaining = kind === "error" ? 7000 : 6000,
    started;
  const dismiss = () => {
    clearTimeout(timer);
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  };
  const resume = () => {
    if (toast.matches(":hover") || toast.contains(document.activeElement))
      return;
    clearTimeout(timer);
    started = Date.now();
    timer = setTimeout(dismiss, remaining);
  };
  const pause = () => {
    clearTimeout(timer);
    if (started) remaining = Math.max(0, remaining - (Date.now() - started));
    started = null;
  };
  toast.querySelector("button").addEventListener("click", dismiss);
  toast.addEventListener("pointerenter", pause);
  toast.addEventListener("pointerleave", resume);
  toast.addEventListener("focusin", pause);
  toast.addEventListener("focusout", resume);
  requestAnimationFrame(() => toast.classList.add("show"));
  resume();
}

// ─── اتصال تقویم جلالی به Picker جدید ───
// این توابع همان الگوریتم jalaali-js هستند که قبلاً داشتیم؛
// فقط در یک آبجکت calendar جمع شده‌اند تا به picker تزریق شوند.
const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];
const JALALI_WEEK = ["ش", "ی", "د", "س", "چ", "پ", "ج"]; // شروع هفته: شنبه

function div(a, b) {
  return ~~(a / b);
}
function mod(a, b) {
  return a - ~~(a / b) * b;
}
function jalCal(jy) {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
    2192, 2262, 2324, 2394, 2456, 3178,
  ];
  const bl = breaks.length,
    gy = jy + 621;
  let leapJ = -14,
    jp = breaks[0],
    jm,
    jump,
    leap,
    leapG,
    march,
    n,
    i;
  for (i = 1; i < bl; i += 1) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}
function g2d(gy, gm, gd) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}
function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}
function j2d(jy, jm, jd) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}
function d2j(jdn) {
  const gy = d2g(jdn).gy,
    jy0 = gy - 621,
    r = jalCal(jy0),
    jdn1f = g2d(gy, 3, r.march);
  let jy = jy0,
    k = jdn - jdn1f,
    jm,
    jd;
  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return { jy, jm, jd };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

const jalaliCalendar = {
  months: JALALI_MONTHS,
  weekDays: JALALI_WEEK,
  weekStart: 0, // شنبه = اولین ستون
  todayISO() {
    return todayStr();
  },
  toParts(iso) {
    const [gy, gm, gd] = iso.split("-").map(Number);
    return d2j(g2d(gy, gm, gd)); // → { jy, jm, jd }
  },
  fromParts(jy, jm, jd) {
    const g = d2g(j2d(jy, jm, jd));
    return `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;
  },
  monthLen(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return jalCal(jy).leap === 0 ? 30 : 29;
  },
};

const persianLocale = {
  digits: "۰۱۲۳۴۵۶۷۸۹",
  dir: "rtl",
};

// ─── ورود و نقش‌ها: نسخهٔ نمایشی محلی؛ این لایه جای امنیت سمت سرور را نمی‌گیرد. ───
const ROLE_LABELS = {
  admin: "مدیر سیستم",
  dispatcher: "مسئول ناوگان",
  requester: "درخواست‌کننده",
  driver: "راننده",
};
const ROLE_RULES = {
  admin: {
    tabs: [
      "dashboard",
      "vehicles",
      "requests",
      "centers",
      "history",
      "units",
      "users",
    ],
    permissions: ["*"],
  },
  dispatcher: {
    tabs: ["dashboard", "vehicles", "requests", "centers", "history", "units"],
    permissions: [
      "fleet.read",
      "fleet.write",
      "centers.write",
      "units.write",
      "requests.create",
      "requests.manage",
    ],
  },
  requester: {
    tabs: ["requests", "history"],
    permissions: ["requests.create", "requests.own"],
  },
  driver: { tabs: ["missions"], permissions: ["missions.write"] },
};
const SESSION_KEY = "fleet_demo_session_v1";
const THEME_KEY = "fleet_demo_theme_v1";
const PASSWORD_ITERATIONS = 120000;
let currentTab = "dashboard";
let missionFilter = "current";
const shownGuides = new Set();

function canAccess(permission) {
  if (!currentUser || !currentUser.active || sessionExpiresAt <= Date.now())
    return false;
  const rule = ROLE_RULES[currentUser.role];
  return (
    !!rule &&
    (rule.permissions.includes("*") || rule.permissions.includes(permission))
  );
}
function requireAccess(permission) {
  if (canAccess(permission)) return true;
  showToast(
    "error",
    "برای این عملیات دسترسی ندارید یا نشست شما پایان یافته است.",
  );
  return false;
}
function allowedTabs() {
  return currentUser && sessionExpiresAt > Date.now()
    ? ROLE_RULES[currentUser.role]?.tabs || []
    : [];
}
function isFleetManager() {
  return canAccess("requests.manage");
}
function canSeeSample(record) {
  if (!currentUser) return false;
  if (isFleetManager()) return true;
  if (currentUser.role === "requester")
    return record.requesterUserId === currentUser.id;
  if (currentUser.role === "driver")
    return currentUser.vehicleIds?.includes(record.carId) || false;
  return false;
}
function canDeleteSample(record) {
  return (
    !!record &&
    (isFleetManager() ||
      (canAccess("requests.own") &&
        record.requesterUserId === currentUser.id &&
        record.status !== "delivered" &&
        record.progress !== "enroute"))
  );
}
function canDeliverSample(record) {
  if (!record || record.status === "delivered") return false;
  return (
    isFleetManager() ||
    (canAccess("missions.write") &&
      canSeeSample(record) &&
      record.date <= todayStr() &&
      record.progress === "enroute")
  );
}
function clearFleetContent() {
  [
    "statsBar",
    "carsGrid",
    "vehicleSidebar",
    "dashBoxes",
    "vehiclesGrid",
    "centersList",
  ].forEach((id) => document.getElementById(id)?.replaceChildren());
}
function clearProtectedContent() {
  clearFleetContent();
  [
    "requestsTbody",
    "historyTbody",
    "usersPanel",
    "unitsPanel",
    "missionsPanel",
    "origin",
    "destination",
    "carSelect",
    "unitList",
  ].forEach((id) => document.getElementById(id)?.replaceChildren());
}
function userDisplayName(user) {
  if (user.username === "admin" && user.name === "مدیر نمایشی")
    return "مدیر سیستم";
  if (user.username === "requester" && user.name === "درخواست‌کنندهٔ نمایشی")
    return "درخواست‌کننده";
  return user.name;
}
function applyRoleVisibility() {
  const tabs = allowedTabs();
  document.body.dataset.auth = currentUser ? "open" : "locked";
  document.getElementById("loginView").hidden = !!currentUser;
  document.querySelectorAll(".tab-btn[data-tab]").forEach((button) => {
    button.hidden = !tabs.includes(button.dataset.tab);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.hidden = !tabs.includes(panel.id.replace("tab-", ""));
  });
  document.querySelector(".bell-btn").hidden = !canAccess("fleet.read");
  const userLabel = document.getElementById("currentUserLabel");
  const name = currentUser
    ? String(userDisplayName(currentUser) || "").trim()
    : "";
  const role = currentUser ? ROLE_LABELS[currentUser.role] : "";
  userLabel.textContent = currentUser
    ? name === role
      ? name
      : `${name} · ${role}`
    : "ورود به سامانه";
  userLabel.dataset.tooltip = userLabel.textContent;
}

const bytesToHex = (buffer) =>
  [...new Uint8Array(buffer)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
function hexToBytes(text) {
  return new Uint8Array(text.match(/../g).map((x) => parseInt(x, 16)));
}
async function passwordDigest(password, salt) {
  if (!crypto.subtle)
    throw new Error(
      "ورود به HTTPS یا localhost نیاز دارد؛ ذخیرهٔ رمز ناامن انجام نمی‌شود.",
    );
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: hexToBytes(salt),
      iterations: PASSWORD_ITERATIONS,
    },
    key,
    256,
  );
  return bytesToHex(bits);
}
async function newPasswordRecord(password) {
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  return {
    salt,
    passwordHash: await passwordDigest(password, salt),
    passwordIterations: PASSWORD_ITERATIONS,
  };
}
async function verifyPassword(user, password) {
  if (!user.salt || !user.passwordHash) return false;
  const digest = await passwordDigest(password, user.salt);
  if (digest.length !== user.passwordHash.length) return false;
  let diff = 0;
  for (let i = 0; i < digest.length; i++)
    diff |= digest.charCodeAt(i) ^ user.passwordHash.charCodeAt(i);
  return diff === 0;
}
function userPreferences(user) {
  return (
    user.preferences ||
    (user.preferences = { theme: null, dismissedGuides: [] })
  );
}
function writeSession() {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      userId: currentUser.id,
      expiresAt: sessionExpiresAt,
      version: currentUser.authVersion || 1,
    }),
  );
}
async function seedLocalUsers() {
  if (appUsers.length) return;
  const seed = [
    {
      username: "admin",
      name: "مدیر سیستم",
      role: "admin",
      password: "DemoAdmin@1405",
    },
    {
      username: "fleet",
      name: "مسئول ناوگان",
      role: "dispatcher",
      password: "DemoFleet@1405",
    },
    {
      username: "requester",
      name: "درخواست‌کننده",
      role: "requester",
      unit: "امور اداری",
      password: "DemoRequest@1405",
    },
  ];
  defaultVehicles.forEach((vehicle, index) => {
    const normalize = (v) =>
      String(v)
        .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
        .replace(/\s/g, "");
    const actual = vehicles.find(
      (v) => normalize(v.plate) === normalize(vehicle.plate),
    );
    seed.push({
      username: `driver${index + 1}`,
      name: `رانندهٔ ${vehicle.name}`,
      role: "driver",
      vehicleIds: actual ? [actual.id] : [],
      password: "DemoDriver@1405",
    });
  });
  const created = [];
  for (const item of seed) {
    const { password, ...data } = item;
    created.push({
      ...data,
      id: nextUserId++,
      active: true,
      authVersion: 1,
      preferences: { theme: null, dismissedGuides: [] },
      ...(await newPasswordRecord(password)),
    });
  }
  appUsers = created;
  saveState();
}
async function bootLocalAccess() {
  applyTheme(localStorage.getItem(THEME_KEY) || "system");
  try {
    await seedLocalUsers();
    saveState();
    let savedSession = null;
    try {
      savedSession = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
    const user = appUsers.find(
      (u) => u.id === savedSession?.userId && u.active,
    );
    if (
      user &&
      savedSession.expiresAt > Date.now() &&
      savedSession.version === (user.authVersion || 1)
    ) {
      currentUser = user;
      sessionExpiresAt = savedSession.expiresAt;
      enterLocalApp();
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      render();
    }
    document.getElementById("loginSubmit").disabled = false;
    document.getElementById("loginStatus").textContent =
      "برای ادامه، وارد حساب خود شوید.";
  } catch (error) {
    document.getElementById("loginStatus").textContent =
      error.message || "آماده‌سازی ورود انجام نشد.";
    showToast(
      "error",
      "ورود آماده نشد؛ فضای ذخیره‌سازی و اتصال امن را بررسی کنید.",
    );
  }
}
async function loginLocal(event) {
  event.preventDefault();
  const submit = document.getElementById("loginSubmit");
  submit.disabled = true;
  const username = document
    .getElementById("loginUsername")
    .value.trim()
    .toLowerCase();
  const password = document.getElementById("loginPassword").value;
  try {
    const user = appUsers.find((u) => u.active && u.username === username);
    if (!user || !(await verifyPassword(user, password))) {
      document.getElementById("loginError").textContent =
        "نام کاربری یا رمز عبور درست نیست.";
      return;
    }
    document.getElementById("loginError").textContent = "";
    document.getElementById("loginPassword").value = "";
    currentUser = user;
    sessionExpiresAt = Date.now() + 8 * 60 * 60 * 1000;
    writeSession();
    shownGuides.clear();
    enterLocalApp();
    showToast("success", `خوش آمدید؛ نقش شما «${ROLE_LABELS[user.role]}» است.`);
  } catch {
    document.getElementById("loginError").textContent =
      "ورود انجام نشد؛ ذخیره‌سازی و HTTPS را بررسی کنید.";
  } finally {
    submit.disabled = false;
  }
}
function enterLocalApp() {
  historyFilter = "all";
  missionFilter = "current";
  document.getElementById("formAlert").replaceChildren();
  applyTheme(
    userPreferences(currentUser).theme ||
      localStorage.getItem(THEME_KEY) ||
      "system",
  );
  currentTab = allowedTabs()[0];
  render();
  switchTab(currentTab);
}
function logoutLocal(message = "از حساب خارج شدید.") {
  closeModal();
  closeGuide();
  currentUser = null;
  sessionExpiresAt = 0;
  sessionStorage.removeItem(SESSION_KEY);
  document.getElementById("loginPassword").value = "";
  document.getElementById("unitInput").value = "";
  window._datePicker?.setValue(todayStr());
  window._timePicker?.setValue(8, 0);
  document.getElementById("formAlert").replaceChildren();
  render();
  document.getElementById("loginUsername").focus();
  if (message) showToast("success", message);
}
setInterval(() => {
  if (currentUser && sessionExpiresAt <= Date.now())
    logoutLocal("نشست پایان یافت؛ دوباره وارد شوید.");
}, 30000);
window.addEventListener("storage", (event) => {
  if (event.key === THEME_KEY && event.newValue && !currentUser) {
    applyTheme(event.newValue);
    return;
  }
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  try {
    const fresh = JSON.parse(event.newValue);
    if (fresh.schemaVersion !== 3) return;
    const id = currentUser?.id,
      version = currentUser?.authVersion || 1;
    vehicles = fresh.vehicles;
    samples = fresh.samples;
    history = fresh.history;
    centers = fresh.centers;
    requesterUnits = fresh.units;
    usedRequesterUnits = [
      ...new Set([
        ...usedRequesterUnits,
        ...(Array.isArray(fresh.usedUnits) ? fresh.usedUnits : []),
      ]),
    ];
    appUsers = fresh.users;
    nextSampleId = fresh.nextSampleId;
    nextVehicleId = fresh.nextVehicleId;
    nextCenterId = fresh.nextCenterId;
    nextUserId = fresh.nextUserId;
    if (id) {
      const user = appUsers.find((u) => u.id === id && u.active);
      if (!user || version !== (user.authVersion || 1)) {
        logoutLocal("دسترسی حساب تغییر کرد؛ دوباره وارد شوید.");
        return;
      }
      currentUser = user;
      applyTheme(
        userPreferences(currentUser).theme ||
          localStorage.getItem(THEME_KEY) ||
          "system",
      );
      render();
    }
  } catch {
    showToast("error", "به‌روزرسانی دادهٔ تب دیگر معتبر نیست.");
  }
});

// ─── واحدهای مستقل؛ حذف درخواست، نام واحد را از فهرست پاک نمی‌کند. ───
function rememberUnit(name) {
  const value = String(name || "").trim();
  if (!value || value.length > 100) return false;
  if (!requesterUnits.includes(value)) requesterUnits.push(value);
  return true;
}
function addUnit() {
  if (!requireAccess("units.write")) return;
  if (!rememberUnit(document.getElementById("newUnitName").value)) {
    showToast("error", "نام واحد را با حداکثر ۱۰۰ نویسه وارد کنید.");
    return;
  }
  saveState();
  renderUnitList();
  renderUnitsPanel();
  showToast("success", "واحد با موفقیت ذخیره شد.");
}
function unitIsInUse(unit) {
  return (
    usedRequesterUnits.includes(unit) ||
    [...samples, ...history].some((record) => record.unit === unit) ||
    appUsers.some((user) => user.unit === unit)
  );
}
function removeUnit(index) {
  if (!requireAccess("units.write")) return;
  const unit = requesterUnits[index];
  if (!unit) return;
  if (unitIsInUse(unit)) {
    showToast(
      "error",
      "واحد در درخواست، سابقه یا حساب کاربری استفاده شده است.",
    );
    return;
  }
  openLocalConfirm("حذف واحد", `واحد «${unit}» از فهرست حذف شود؟`, () => {
    if (!requireAccess("units.write")) return;
    if (unitIsInUse(unit)) {
      showToast(
        "warning",
        "این واحد اکنون سابقهٔ استفاده دارد و قابل حذف نیست.",
      );
      return;
    }
    requesterUnits = requesterUnits.filter((v) => v !== unit);
    saveState();
    closeModal();
    render();
  });
}
function renderUnitsPanel() {
  const el = document.getElementById("unitsPanel");
  if (!canAccess("units.write")) {
    el.replaceChildren();
    return;
  }
  el.innerHTML = `<div class="section-heading"><div><span class="eyebrow">فهرست مشترک</span><h2>واحدهای درخواست‌کننده</h2><p>واحد جدید مستقل از درخواست‌ها ذخیره می‌شود.</p></div></div>
  <div class="management-card"><form class="inline-form" onsubmit="event.preventDefault();addUnit()"><label for="newUnitName">نام واحد جدید</label><input id="newUnitName" type="text" maxlength="100" required><button class="btn-primary" type="submit">افزودن واحد</button></form>
  <div class="unit-grid">${requesterUnits.map((u, i) => `<div class="unit-row"><span>${esc(u)}</span><button class="quiet-button" onclick="removeUnit(${i})">حذف</button></div>`).join("")}</div></div>`;
}

// ─── مدیریت حساب‌ها فقط برای مدیر سیستم ───
function renderUsersPanel() {
  const el = document.getElementById("usersPanel");
  if (!canAccess("users.write")) {
    el.replaceChildren();
    return;
  }
  el.innerHTML = `<div class="section-heading"><div><span class="eyebrow">مدیریت دسترسی کاربران</span><h2>کاربران سامانه</h2><p>نقش و تخصیص خودرو، بخش‌های قابل استفاده را مشخص می‌کند.</p></div><button class="btn-primary" onclick="openUserForm(null)">افزودن کاربر</button></div>
  <div class="management-card user-grid">${appUsers.map((u) => `<article class="account-card"><div class="account-title"><h3>${esc(userDisplayName(u))}</h3><span class="badge ${u.active ? "badge-green" : "badge-red"}">${u.active ? "فعال" : "غیرفعال"}</span></div><p dir="ltr" class="username">${esc(u.username)}</p><p>${ROLE_LABELS[u.role] || "نقش نامعتبر"}</p>${u.role === "requester" ? `<p>واحد: ${esc(u.unit || "—")}</p>` : ""}${u.role === "driver" ? `<p>خودرو: ${esc((u.vehicleIds || []).map((id) => vehicles.find((v) => v.id === id)?.name || "حذف‌شده").join("، ") || "بدون تخصیص")}</p>` : ""}<button class="quiet-button" onclick="openUserForm(${u.id})">ویرایش و تغییر رمز</button></article>`).join("")}</div>`;
}
function openUserForm(id) {
  if (!requireAccess("users.write")) return;
  closeModal();
  const u = appUsers.find((x) => x.id === id) || {
    name: "",
    username: "",
    role: "requester",
    unit: requesterUnits[0] || "",
    vehicleIds: [],
    active: true,
  };
  document.getElementById("modalRoot").innerHTML =
    `<div class="modal-overlay"><div class="modal-box"><div class="modal-head"><h2 class="modal-title">${id ? "ویرایش کاربر" : "کاربر جدید"}</h2><button class="modal-close" aria-label="بستن" onclick="closeModal()">×</button></div>
  <form onsubmit="event.preventDefault();saveUserForm(${id || "null"})"><div class="modal-body form-grid">
  <div class="form-group"><label for="uf_name">نام کامل</label><input id="uf_name" type="text" maxlength="80" value="${esc(userDisplayName(u))}" required></div>
  <div class="form-group"><label for="uf_username">نام کاربری لاتین</label><input id="uf_username" type="text" dir="ltr" autocomplete="off" maxlength="32" value="${esc(u.username)}" required></div>
  <div class="form-group"><label for="uf_role">نقش</label><select id="uf_role" onchange="toggleUserFields()">${Object.entries(
    ROLE_LABELS,
  )
    .map(
      ([value, label]) =>
        `<option value="${value}" ${u.role === value ? "selected" : ""}>${label}</option>`,
    )
    .join("")}</select></div>
  <div class="form-group"><label for="uf_password">${id ? "رمز جدید؛ خالی یعنی بدون تغییر" : "رمز عبور؛ حداقل ۸ نویسه"}</label><input id="uf_password" type="password" autocomplete="new-password" minlength="8" ${id ? "" : "required"}></div>
  <div class="form-group full" id="uf_unitWrap"><label for="uf_unit">واحد درخواست‌کننده</label><select id="uf_unit">${requesterUnits.map((unit) => `<option value="${esc(unit)}" ${u.unit === unit ? "selected" : ""}>${esc(unit)}</option>`).join("")}</select></div>
  <fieldset class="form-group full" id="uf_vehicleWrap"><legend>خودروهای تخصیص‌یافته به راننده</legend><div class="assignment-grid">${vehicles.map((v) => `<label><input type="checkbox" name="uf_vehicle" value="${v.id}" ${u.vehicleIds?.includes(v.id) ? "checked" : ""}>${esc(v.name)}</label>`).join("")}</div></fieldset>
  <label class="checkbox-row full"><input id="uf_active" type="checkbox" ${u.active ? "checked" : ""}>حساب فعال باشد</label>
  </div><div class="modal-foot"><button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button><button class="btn-primary" id="saveUserButton" type="submit">ذخیرهٔ کاربر</button></div></form></div></div>`;
  toggleUserFields();
}
function toggleUserFields() {
  const role = document.getElementById("uf_role").value;
  document.getElementById("uf_unitWrap").hidden = role !== "requester";
  document.getElementById("uf_vehicleWrap").hidden = role !== "driver";
}
async function saveUserForm(id) {
  if (!requireAccess("users.write")) return;
  const name = document.getElementById("uf_name").value.trim(),
    username = document
      .getElementById("uf_username")
      .value.trim()
      .toLowerCase();
  const role = document.getElementById("uf_role").value,
    active = document.getElementById("uf_active").checked,
    password = document.getElementById("uf_password").value;
  const unit =
    role === "requester" ? document.getElementById("uf_unit").value : null;
  const vehicleIds =
    role === "driver"
      ? [...document.querySelectorAll('[name="uf_vehicle"]:checked')].map(
          (node) => Number(node.value),
        )
      : [];
  if (
    !name ||
    !/^[a-z0-9_.-]{3,32}$/.test(username) ||
    !ROLE_RULES[role] ||
    appUsers.some((u) => u.username === username && u.id !== id)
  ) {
    showToast("error", "نام، نقش یا نام کاربری معتبر و یکتا نیست.");
    return;
  }
  if ((!id || password) && password.length < 8) {
    showToast("error", "رمز عبور باید حداقل ۸ نویسه باشد.");
    return;
  }
  if (role === "requester" && !requesterUnits.includes(unit)) {
    showToast("error", "واحد درخواست‌کننده معتبر نیست.");
    return;
  }
  if (role === "driver" && !vehicleIds.length) {
    showToast("error", "برای راننده دست‌کم یک خودرو انتخاب کنید.");
    return;
  }
  if (id === currentUser.id && (!active || role !== "admin")) {
    showToast("error", "دسترسی مدیریتی حساب فعلی را نمی‌توانید حذف کنید.");
    return;
  }
  const previous = appUsers.find((u) => u.id === id);
  if (
    previous?.role === "admin" &&
    (!active || role !== "admin") &&
    !appUsers.some((u) => u.id !== id && u.role === "admin" && u.active)
  ) {
    showToast("error", "آخرین مدیر فعال باید حفظ شود.");
    return;
  }
  const saveButton = document.getElementById("saveUserButton");
  saveButton.disabled = true;
  try {
    const passwordRecord = password ? await newPasswordRecord(password) : {};
    if (!requireAccess("users.write")) return;
    const next = {
      ...previous,
      id: id || nextUserId++,
      name,
      username,
      role,
      active,
      unit,
      vehicleIds,
      preferences: previous?.preferences || {
        theme: null,
        dismissedGuides: [],
      },
      authVersion: (previous?.authVersion || 0) + 1,
      ...passwordRecord,
    };
    if (id) appUsers = appUsers.map((u) => (u.id === id ? next : u));
    else appUsers.push(next);
    if (id === currentUser.id) {
      currentUser = next;
      writeSession();
    }
    saveState();
    closeModal();
    render();
    showToast("success", "حساب کاربری ذخیره شد.");
  } catch {
    showToast(
      "error",
      "ذخیرهٔ کاربر انجام نشد؛ اتصال امن و فضای ذخیره‌سازی را بررسی کنید.",
    );
  } finally {
    if (saveButton.isConnected) saveButton.disabled = false;
  }
}

// ─── راهنماهای قابل خاموش‌کردن برای هر حساب و هر بخش ───
const SECTION_GUIDES = {
  dashboard: [
    "داشبورد ناوگان",
    "در این قسمت وضعیت خودروها، تعداد درخواست‌های امروز و موارد نیازمند پیگیری را یک‌جا ببینید. برای بررسی جزئیات یا انجام عملیات، به بخش خودروها یا درخواست‌ها بروید.",
  ],
  vehicles: [
    "مدیریت خودروها",
    "در این قسمت می‌توانید مشخصات خودروها را ویرایش کنید یا خودروی جدید تعریف کنید.\nخودروهایی که در حال حاضر برای آنها مأموریتی در نظر گرفته شده‌ است، تا اتمام یا حذف آن مأموریت قابل ویرایش نیستند.",
  ],
  requests: [
    "ثبت و پیگیری درخواست",
    "در این بخش می‌توانید درخواست جدید ثبت کنید.\nهر شخص، فقط درخواست‌های خودش را می‌بیند.",
  ],
  centers: [
    "مراکز مبدأ و مقصد",
    "برای ایجاد یک مرکز جدید می‌توانید بر روی نقشه یک نقطه را انتخاب کنید و نام آن را ثبت کنید.\nدر صورت عدم بارگذاری نقشه آنلاین، همچنان می‌توانید تنها با واردکردن یک نام، مرکز جدیدی را ثبت کنید.",
  ],
  history: [
    "سوابق سفرها",
    "مدیر و مسئول ناوگان می‌توانند همهٔ سوابق را ببینند در حالی که سایرین فقط سوابق درخواست‌های خودشان را می‌بینند.",
  ],
  units: [
    "واحدهای درخواست‌کننده",
    "در این قسمت می‌توانید واحد جدید را به فهرست اضافه کنید.\nحذف هر درخواست، واحد آن را پاک نمی‌کند،\nواحدی که برای آن قبلاً مأموریتی ثبت شده، قابل حذف نیست.",
  ],
  users: [
    "مدیریت حساب‌ها",
    "برای هر کاربر نقش تعیین کنید. راننده فقط خودروهای تخصیص‌یافته را می‌بیند.",
  ],
  missions: [
    "پنل راننده",
    "درخواست‌های جاری، آینده و انجام‌شده را می‌توانید به صورت جداگانه مشاهده کنید. ابتدا «شروع مأموریت» و سپس «ثبت تحویل» را بزنید.",
  ],
};

function guideDismissed(tab) {
  return (userPreferences(currentUser).dismissedGuides || []).includes(tab);
}
function refreshGuides() {
  document.querySelectorAll(".guide-banner").forEach((node) => node.remove());
  if (!currentUser) return;
  allowedTabs().forEach((tab) => {
    if (guideDismissed(tab)) return;
    const info = SECTION_GUIDES[tab];
    if (!info) return;
    const banner = document.createElement("aside");
    banner.className = "guide-banner";
    banner.innerHTML = `<div><strong>${esc(info[0])}</strong><p>${esc(info[1])}</p></div><div class="guide-actions"><button onclick="showSectionGuide('${tab}')">راهنمای بخش</button><button onclick="dismissGuide('${tab}')">عدم نمایش</button></div>`;
    document.getElementById(`tab-${tab}`).prepend(banner);
  });
}
function dismissGuide(tab) {
  if (!currentUser || !allowedTabs().includes(tab)) return;
  const pref = userPreferences(currentUser);
  pref.dismissedGuides = [...new Set([...(pref.dismissedGuides || []), tab])];
  saveState();
  refreshGuides();
  closeGuide();
  showToast(
    "success",
    "راهنمای این بخش پنهان شد؛ از تنظیمات قابل بازنمایش است.",
  );
}
function maybeShowGuide(tab) {
  if (!guideDismissed(tab) && !shownGuides.has(tab)) {
    shownGuides.add(tab);
    showSectionGuide(tab);
  }
}
function showSectionGuide(tab = currentTab) {
  if (!currentUser || !allowedTabs().includes(tab)) return;
  const info = SECTION_GUIDES[tab];
  if (!info) return;
  window.Pickers?.closeAll();
  document.getElementById("guideRoot").dataset.guideTab = tab;
  document.getElementById("guideRoot").innerHTML =
    `<div class="guide-overlay"><section class="guide-dialog" role="dialog" aria-modal="true" aria-labelledby="guideTitle"><button type="button" class="modal-close guide-close" aria-label="بستن راهنما" onclick="requestCloseGuide()">×</button><span class="eyebrow">راهنمای ${esc(ROLE_LABELS[currentUser.role])}</span><h2 id="guideTitle">${esc(info[0])}</h2><p>${esc(info[1])}</p><label class="checkbox-row"><input id="guideDontShow" type="checkbox">این راهنما دوباره نمایش داده نشود</label><div class="guide-foot"><button class="btn-primary" onclick="finishGuide('${tab}')">متوجه شدم</button></div></section></div>`;
  document.querySelector(".guide-foot button").focus();
}
function finishGuide(tab) {
  if (document.getElementById("guideDontShow")?.checked) dismissGuide(tab);
  else closeGuide();
}
function requestCloseGuide() {
  finishGuide(
    document.getElementById("guideRoot").dataset.guideTab || currentTab,
  );
}
function closeGuide() {
  document.getElementById("guideRoot").replaceChildren();
}
function resetGuides() {
  if (!currentUser) return;
  userPreferences(currentUser).dismissedGuides = [];
  userPreferences(currentUser).hideModalCloseHelp = false;
  shownGuides.clear();
  saveState();
  refreshGuides();
  closeModal();
  showSectionGuide(currentTab);
}
// ─── تنظیمات ظاهری و رمز شخصی ───
function applyTheme(value) {
  const requested = ["system", "light", "dark", "colorful"].includes(value)
    ? value
    : "system";
  const resolved =
    requested === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : requested;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme =
    resolved === "dark" ? "dark" : "light";
  const select = document.getElementById("loginTheme");
  if (select) select.value = requested;
  const profile = document.getElementById("profileTheme");
  if (profile) profile.value = requested;
  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.themeChoice === requested),
    );
  });
}
function setTheme(value) {
  if (!["system", "light", "dark", "colorful"].includes(value)) return;
  applyTheme(value);
  if (currentUser) userPreferences(currentUser).theme = value;
  try {
    localStorage.setItem(THEME_KEY, value);
    if (currentUser) saveState();
  } catch {
    showToast(
      "warning",
      "ظاهر تغییر کرد، اما ذخیرهٔ انتخاب ممکن نشد؛ فضای ذخیره‌سازی را بررسی کنید.",
    );
  }
}
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  const value = currentUser
    ? userPreferences(currentUser).theme ||
      localStorage.getItem(THEME_KEY) ||
      "system"
    : localStorage.getItem(THEME_KEY) || "system";
  if (value === "system") applyTheme(value);
});

function openPreferences() {
  if (!currentUser) return;
  closeModal();
  const theme =
    userPreferences(currentUser).theme ||
    localStorage.getItem(THEME_KEY) ||
    "system";
  document.getElementById("modalRoot").innerHTML =
    `<div class="modal-overlay"><section class="modal-box preferences-dialog"><div class="modal-head"><h2 class="modal-title">تنظیمات</h2><button type="button" class="modal-close" aria-label="بستن تنظیمات" onclick="closeModal()">×</button></div>
  <div class="modal-body"><div class="settings-tabs" role="tablist" aria-label="موضوع تنظیمات">${[
    ["appearance", "ظاهر"],
    ["password", "تغییر رمز"],
    ["guides", "راهنماها"],
  ]
    .map(
      ([id, label], i) =>
        `<button type="button" id="settingsTab-${id}" role="tab" aria-controls="settingsPanel-${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" onclick="selectSettingsTab('${id}')">${label}</button>`,
    )
    .join("")}</div>
  <section id="settingsPanel-appearance" class="settings-stack settings-panel" role="tabpanel" aria-labelledby="settingsTab-appearance"><h3>ظاهر سامانه</h3><p class="settings-note">ظاهر انتخاب‌شده بلافاصله اعمال می‌شود و برای حساب شما باقی می‌ماند.</p>
  <div class="theme-choices" role="group" aria-label="انتخاب ظاهر">${[
    ["light", "روشن"],
    ["dark", "تیره"],
    ["colorful", "رنگی"],
    ["system", "پیش‌فرض دستگاه"],
  ]
    .map(
      ([value, label]) =>
        `<button type="button" class="theme-choice" data-theme-choice="${value}" aria-pressed="${theme === value}" onclick="setTheme('${value}')"><span class="theme-preview theme-preview-${value}" aria-hidden="true"></span><strong>${label}</strong><span class="theme-selected" aria-hidden="true">✓</span></button>`,
    )
    .join("")}</div></section>
  <section id="settingsPanel-password" class="settings-stack settings-panel" role="tabpanel" aria-labelledby="settingsTab-password" hidden><h3>تغییر رمز حساب</h3><form class="settings-stack" onsubmit="event.preventDefault();changeOwnPassword()"><label for="ownOldPassword">رمز فعلی</label><input type="password" id="ownOldPassword" autocomplete="current-password" required><label for="ownNewPassword">رمز جدید؛ حداقل ۸ نویسه</label><input type="password" id="ownNewPassword" autocomplete="new-password" minlength="8" required><button class="btn-primary" id="ownPasswordButton">ذخیرهٔ رمز</button></form></section>
  <section id="settingsPanel-guides" class="settings-stack settings-panel" role="tabpanel" aria-labelledby="settingsTab-guides" hidden><h3>نمایش راهنماها</h3><p class="settings-note">راهنمای هر بخش و راهنمای بستن پنجره را می‌توانید دوباره فعال کنید.</p><button type="button" class="btn-secondary" onclick="resetGuides()">بازنمایش همهٔ راهنماها</button><button type="button" class="btn-secondary" onclick="closeModal();showSectionGuide()">راهنمای بخش فعلی</button><button type="button" class="btn-secondary" onclick="restoreModalCloseHelp()">بازنمایش راهنمای بستن پنجره</button></section>
  </div></section></div>`;
}
function selectSettingsTab(id, focus = false) {
  if (!["appearance", "password", "guides"].includes(id)) return;
  document.querySelectorAll(".settings-tabs [role=tab]").forEach((button) => {
    const active = button.id === `settingsTab-${id}`;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
    if (active && focus) button.focus();
  });
  document.querySelectorAll(".settings-panel").forEach((panel) => {
    panel.hidden = panel.id !== `settingsPanel-${id}`;
  });
}

async function changeOwnPassword() {
  if (!currentUser) return;
  const user = currentUser,
    oldPassword = document.getElementById("ownOldPassword").value,
    newPassword = document.getElementById("ownNewPassword").value;
  if (newPassword.length < 8) {
    showToast("error", "رمز جدید کوتاه است.");
    return;
  }
  const button = document.getElementById("ownPasswordButton");
  button.disabled = true;
  try {
    if (!(await verifyPassword(user, oldPassword))) {
      showToast("error", "رمز فعلی درست نیست.");
      return;
    }
    const record = await newPasswordRecord(newPassword);
    if (currentUser?.id !== user.id) return;
    Object.assign(user, record);
    user.authVersion = (user.authVersion || 1) + 1;
    writeSession();
    saveState();
    closeModal();
    showToast("success", "رمز حساب تغییر کرد.");
  } catch {
    showToast("error", "تغییر رمز انجام نشد.");
  } finally {
    if (button.isConnected) button.disabled = false;
  }
}

// ─── مأموریت‌های راننده، مناسب موبایل و شامل رزروهای روزهای آینده ───
function setMissionFilter(value) {
  if (!["current", "future", "completed"].includes(value)) return;
  missionFilter = value;
  renderMissions();
}
function startMission(id) {
  if (!requireAccess("missions.write")) return;
  const sample = samples.find((s) => s.id === id);
  if (
    !sample ||
    !canSeeSample(sample) ||
    sample.status === "delivered" ||
    sample.date > todayStr()
  ) {
    showToast("error", "این مأموریت اکنون قابل شروع نیست.");
    return;
  }
  sample.progress = "enroute";
  sample.status = "active";
  sample.startedAt = new Date().toISOString();
  saveState();
  render();
  showToast("success", "شروع مأموریت ثبت شد.");
}
function renderMissions() {
  const el = document.getElementById("missionsPanel");
  if (!canAccess("missions.write")) {
    el.replaceChildren();
    return;
  }
  const all = samples.filter(canSeeSample),
    open = all.filter((s) => s.status !== "delivered" && s.date <= todayStr()),
    future = all.filter((s) => s.status !== "delivered" && s.date > todayStr()),
    done = all.filter((s) => s.status === "delivered");
  const selected =
    missionFilter === "future"
      ? future
      : missionFilter === "completed"
        ? done
        : open;
  const rows = [...selected].sort((a, b) =>
    (a.date + a.time).localeCompare(b.date + b.time),
  );
  const assignedCars = vehicles.filter((vehicle) =>
    currentUser.vehicleIds?.includes(vehicle.id),
  );
  el.innerHTML = `<div class="driver-heading"><span class="eyebrow">پنل شخصی راننده</span><h1>درخواست‌های شما</h1><p>${esc(userDisplayName(currentUser))} · ${esc(formatRouteDate(todayStr()))}</p><div class="driver-plates">${assignedCars.map((vehicle) => `<span>${esc(vehicle.name)} · پلاک: <b dir="ltr" class="plate-value">${esc(vehicle.plate)}</b></span>`).join("")}</div></div>
  <div class="mission-switch" role="group" aria-label="فیلتر درخواست‌ها">${[
    ["current", "درخواست‌های جاری", open.length],
    ["future", "درخواست‌های آینده", future.length],
    ["completed", "درخواست‌های انجام‌شده", done.length],
  ]
    .map(
      ([v, l, n]) =>
        `<button class="${missionFilter === v ? "selected" : ""}" aria-pressed="${missionFilter === v}" onclick="setMissionFilter('${v}')">${l}<span>${faNum(n)}</span></button>`,
    )
    .join("")}</div>
  <div class="mission-list">${
    rows.length
      ? rows
          .map((s) => {
            const car = vehicles.find((v) => v.id === s.carId),
              reserved = s.date > todayStr(),
              delivered = s.status === "delivered",
              enroute = s.progress === "enroute";
            const delayed =
              !reserved &&
              !delivered &&
              !enroute &&
              getSampleStatus(s.date, s.time) === "overdue";
            const label = delivered
              ? "تحویل‌شده"
              : reserved
                ? "رزرو"
                : enroute
                  ? "در مسیر"
                  : delayed
                    ? "با تأخیر؛ نیاز به پیگیری"
                    : "در انتظار حرکت";
            return `<article class="mission-card"><div class="mission-top"><span class="badge ${delivered ? "badge-green" : enroute ? "badge-blue" : delayed ? "badge-red" : "badge-amber"}">${label}</span><span class="mission-number">درخواست ${faNum(s.id)}</span></div>
    <div class="mission-route"><div><span>مبدأ</span><strong>${esc(s.origin)}</strong></div><div><span>مقصد</span><strong>${esc(s.destination)}</strong></div></div>
    <div class="mission-details"><span>تاریخ <b>${esc(formatRouteDate(s.date))}</b></span><span>ساعت <b dir="ltr">${esc(s.time.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]))}</b></span><span>خودرو <b>${esc(car?.name || "حذف‌شده")}</b></span><span>واحد <b>${esc(s.unit || "—")}</b></span></div>
    ${!delivered && !reserved ? `<div class="mission-actions">${enroute ? `<button class="btn-primary" onclick="confirmMissionDelivery(${s.id})">ثبت تحویل</button>` : `<button class="btn-primary" onclick="startMission(${s.id})">شروع مأموریت</button>`}<button class="btn-secondary" onclick="showMissionDetails(${s.id})">جزئیات</button></div>` : `<button class="quiet-button" onclick="showMissionDetails(${s.id})">جزئیات درخواست</button>`}</article>`;
          })
          .join("")
      : `<div class="driver-empty"><h2>درخواستی در این بخش ندارید</h2><p>درخواست‌های روزهای بعد را در «درخواست‌های آینده» ببینید.</p></div>`
  }</div>`;
}
function showMissionDetails(id) {
  const sample = samples.find((s) => s.id === id);
  if (!requireAccess("missions.write") || !sample || !canSeeSample(sample))
    return;
  closeModal();
  document.getElementById("modalRoot").innerHTML =
    `<div class="modal-overlay"><section class="modal-box"><div class="modal-head"><h2 class="modal-title">جزئیات درخواست ${faNum(id)}</h2><button class="modal-close" aria-label="بستن" onclick="closeModal()">×</button></div><div class="modal-body settings-stack"><p>مبدأ: <b>${esc(sample.origin)}</b></p><p>مقصد: <b>${esc(sample.destination)}</b></p><p>تاریخ: ${esc(formatRouteDate(sample.date))} · ساعت: ${esc(sample.time)}</p><p>واحد: <b>${esc(sample.unit)}</b></p><p>پلاک خودرو: <b dir="ltr" class="plate-value">${esc(vehicles.find((vehicle) => vehicle.id === sample.carId)?.plate || "—")}</b></p></div></section></div>`;
}
function confirmMissionDelivery(id) {
  const sample = samples.find((s) => s.id === id);
  if (!sample || !canDeliverSample(sample)) {
    showToast("error", "این مأموریت قابل تحویل نیست.");
    return;
  }
  openLocalConfirm(
    "تأیید تحویل",
    `تحویل مأموریت «${sample.origin} ← ${sample.destination}» ثبت شود؟`,
    () => {
      deliverSample(id);
      closeModal();
      showToast("success", "تحویل ثبت شد.");
    },
  );
}
function openLocalConfirm(title, message, action) {
  if (!currentUser) return;
  closeModal();
  pendingConfirmAction = action;
  document.getElementById("modalRoot").innerHTML =
    `<div class="modal-overlay"><section class="modal-box" style="max-width:480px"><div class="modal-head"><h2 class="modal-title">${esc(title)}</h2><button class="modal-close" aria-label="بستن" onclick="closeModal()">×</button></div><div class="modal-body"><p>${esc(message)}</p></div><div class="modal-foot"><button class="btn-secondary" onclick="closeModal()">انصراف</button><button class="btn-primary" onclick="confirmLocalAction()">تأیید</button></div></section></div>`;
}
function confirmLocalAction() {
  const action = pendingConfirmAction;
  pendingConfirmAction = null;
  if (currentUser && action) action();
}

setInterval(() => {
  if (canAccess("missions.write")) renderMissions();
}, 60000);

// ─── mount کردن picker ها روی input های موجود ───
const dateInput = document.getElementById("dateInput");
const timeInput = document.getElementById("timeInput");

if (dateInput) {
  const dp = Pickers.createDatePicker({
    input: dateInput,
    calendar: jalaliCalendar,
    locale: persianLocale,
    onPick(iso) {
      // مقدار ISO ذخیره می‌شود؛ تابع addSample موقع ثبت آن را می‌خواند
      dateInput.dataset.iso = iso;
    },
  });
  // مقدار اولیه
  dp.setValue(todayStr());
  window._datePicker = dp; // برای دسترسی در addSample
}

if (timeInput) {
  const tp = Pickers.createTimePicker({
    input: timeInput,
    locale: persianLocale,
    onPick(hms) {
      timeInput.dataset.hms = hms;
    },
  });
  tp.setValue(8, 0);
  window._timePicker = tp;
}

// ─── رفتار مشترک مودال‌ها، رمزها و راهنمای اشاره ───
// کنترل‌های مشترک، بدون واردکردن مقدار رمز یا متن کاربر به HTML.
function eyeIcon(revealed) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>${revealed ? "" : '<path d="M3 3l18 18"/>'}</svg>`;
}
function enhancePasswordInputs() {
  document.querySelectorAll('input[type="password"]').forEach((input) => {
    if (input.dataset.passwordManaged) return;
    input.dataset.passwordManaged = "true";
    const wrap = document.createElement("div");
    wrap.className = "password-control";
    input.before(wrap);
    wrap.append(input);
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "password-toggle";
    toggle.setAttribute("aria-controls", input.id);
    toggle.setAttribute("aria-pressed", "false");
    const update = () => {
      const revealed = input.type === "text";
      const label = revealed ? "پنهان‌کردن رمز" : "نمایش رمز";
      toggle.setAttribute("aria-label", label);
      toggle.dataset.tooltip = label;
      toggle.setAttribute("aria-pressed", String(revealed));
      toggle.innerHTML = eyeIcon(revealed);
    };
    toggle.addEventListener("click", () => {
      input.type = input.type === "password" ? "text" : "password";
      update();
      hideAppTooltip();
    });
    wrap.append(toggle);
    update();
  });
}
function setModalCloseHelpHidden(hidden) {
  if (!currentUser) return;
  userPreferences(currentUser).hideModalCloseHelp = hidden;
  saveState();
}
function restoreModalCloseHelp() {
  setModalCloseHelpHidden(false);
  document
    .querySelectorAll(".modal-close-help")
    .forEach((node) => node.remove());
  enhanceDialogs();
  showToast("success", "راهنمای بستن پنجره دوباره فعال شد.");
}
function makeModalCloseHelp() {
  const help = document.createElement("aside");
  help.className = "modal-close-help full";
  help.innerHTML = `<strong>راهنمای بستن پنجره</strong><p>برای بستن، ضربدر را بزنید، از کلید گریز (Esc) استفاده کنید یا روی فضای بیرون پنجره کلیک کنید.</p><label class="checkbox-row"><input type="checkbox" data-dismiss-close-help>این راهنمای بستن دوباره نمایش داده نشود</label><small>بازنمایش از تنظیمات ← راهنماها امکان‌پذیر است.</small>`;
  help
    .querySelector("input")
    .addEventListener("change", (event) =>
      setModalCloseHelpHidden(event.target.checked),
    );
  return help;
}
let dialogScrollLocked = false,
  previousBodyOverflow = "";
function enhanceDialogs() {
  const dialogs = [
    ...document.querySelectorAll(
      "#modalRoot .modal-box, #guideRoot .guide-dialog",
    ),
  ];
  if (dialogs.length && !dialogScrollLocked) {
    window.Pickers?.closeAll();
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogScrollLocked = true;
  } else if (!dialogs.length && dialogScrollLocked) {
    document.body.style.overflow = previousBodyOverflow;
    dialogScrollLocked = false;
  }
  dialogs.forEach((dialog) => {
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    if (
      !dialog.getAttribute("aria-label") &&
      !dialog.getAttribute("aria-labelledby")
    )
      dialog.setAttribute(
        "aria-label",
        dialog.querySelector(".modal-title")?.textContent.trim() ||
          "پنجرهٔ سامانه",
      );
    const close = dialog.querySelector(".modal-close");
    if (close) {
      close.type = "button";
      if (!close.getAttribute("aria-label"))
        close.setAttribute("aria-label", "بستن پنجره");
      close.dataset.tooltip = close.getAttribute("aria-label");
    }
    if (
      currentUser &&
      !userPreferences(currentUser).hideModalCloseHelp &&
      !dialog.querySelector(".modal-close-help")
    ) {
      const help = makeModalCloseHelp();
      const body = dialog.querySelector(".modal-body");
      if (body) body.prepend(help);
      else dialog.querySelector("p")?.after(help);
    }
    if (!dialog.dataset.dialogReady) {
      dialog.dataset.dialogReady = "true";
      if (!dialog.contains(document.activeElement))
        (close || dialog).focus({ preventScroll: true });
    }
  });
}
// بستن فقط وقتی فشار و رهاکردن اشاره‌گر هر دو روی همان پس‌زمینه باشد.
let backdropPointer = null;
document.addEventListener(
  "pointerdown",
  (event) => {
    backdropPointer = null;
    if (event.button !== 0 || event.pickerDismissed) return;
    const overlay = event.target.closest?.(".modal-overlay, .guide-overlay");
    if (overlay && event.target === overlay)
      backdropPointer = {
        overlay,
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };
  },
  true,
);
document.addEventListener(
  "pointermove",
  (event) => {
    if (
      backdropPointer &&
      event.pointerId === backdropPointer.id &&
      Math.hypot(
        event.clientX - backdropPointer.x,
        event.clientY - backdropPointer.y,
      ) > 8
    )
      backdropPointer.moved = true;
  },
  true,
);
document.addEventListener(
  "pointerup",
  (event) => {
    const press = backdropPointer;
    backdropPointer = null;
    if (
      !press ||
      press.moved ||
      event.pointerId !== press.id ||
      event.target !== press.overlay ||
      !press.overlay.isConnected
    )
      return;
    hideAppTooltip();
    if (press.overlay.classList.contains("guide-overlay")) requestCloseGuide();
    else closeModal();
  },
  true,
);
document.addEventListener(
  "pointercancel",
  () => {
    backdropPointer = null;
  },
  true,
);
function topDialog() {
  return (
    document.querySelector("#guideRoot .guide-dialog") ||
    document.querySelector("#modalRoot .modal-box")
  );
}
document.addEventListener(
  "keydown",
  (event) => {
    const dialog = topDialog();
    if (event.key === "Escape") {
      hideAppTooltip();
      if (!dialog) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (dialog.classList.contains("guide-dialog")) requestCloseGuide();
      else closeModal();
      return;
    }
    const tab = event.target.closest?.(".settings-tabs [role=tab]");
    if (tab && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const tabs = [...tab.parentElement.querySelectorAll("[role=tab]")],
        i = tabs.indexOf(tab);
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : (i + (event.key === "ArrowLeft" ? 1 : -1) + tabs.length) %
              tabs.length;
      selectSettingsTab(tabs[next].id.replace("settingsTab-", ""), true);
    }
    if (event.key === "Tab" && dialog) {
      const items = [
        ...dialog.querySelectorAll(
          'button, input, select, textarea, a[href], [tabindex="0"]',
        ),
      ].filter(
        (node) =>
          !node.disabled && node.tabIndex >= 0 && node.getClientRects().length,
      );
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const first = items[0],
        last = items.at(-1);
      if (
        !dialog.contains(document.activeElement) ||
        (!event.shiftKey && document.activeElement === last) ||
        (event.shiftKey && document.activeElement === first)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
  },
  true,
);
// پیام اعتبارسنجی فارسی، به‌جای متن بومیِ وابسته به زبان مرورگر.
document.addEventListener(
  "invalid",
  (event) => {
    event.preventDefault();
    const input = event.target;
    const name =
      input.labels?.[0]?.textContent.trim() ||
      input.getAttribute("aria-label") ||
      "این مقدار";
    const text = input.validity.valueMissing
      ? `${name} را وارد کنید.`
      : `${name} را با قالب و بازهٔ معتبر وارد کنید.`;
    showToast("warning", text);
    if (input.getClientRects().length) input.focus();
  },
  true,
);
const tooltip = document.createElement("div");
tooltip.id = "appTooltip";
tooltip.className = "app-tooltip";
tooltip.setAttribute("role", "tooltip");
tooltip.hidden = true;
document.body.append(tooltip);
let tooltipAnchor = null,
  tooltipHadDescription = false,
  tooltipDismissTimer = null;
function hideAppTooltip() {
  clearTimeout(tooltipDismissTimer);
  if (tooltipAnchor && !tooltipHadDescription) {
    const ids = (tooltipAnchor.getAttribute("aria-describedby") || "")
      .split(/\s+/)
      .filter((id) => id && id !== tooltip.id);
    if (ids.length)
      tooltipAnchor.setAttribute("aria-describedby", ids.join(" "));
    else tooltipAnchor.removeAttribute("aria-describedby");
  }
  tooltip.hidden = true;
  tooltipAnchor = null;
}
function showAppTooltip(anchor) {
  if (!anchor?.dataset.tooltip || !anchor.getClientRects().length) return;
  hideAppTooltip();
  tooltipAnchor = anchor;
  const ids = (anchor.getAttribute("aria-describedby") || "")
    .split(/\s+/)
    .filter(Boolean);
  tooltipHadDescription = ids.includes(tooltip.id);
  if (!tooltipHadDescription)
    anchor.setAttribute("aria-describedby", [...ids, tooltip.id].join(" "));
  tooltip.textContent = anchor.dataset.tooltip;
  tooltip.dataset.kind = anchor.matches(".danger, .btn-delete")
    ? "danger"
    : anchor.getAttribute("aria-disabled") === "true"
      ? "warning"
      : "info";
  tooltip.hidden = false;
  const rect = anchor.getBoundingClientRect(),
    width = tooltip.offsetWidth,
    height = tooltip.offsetHeight;
  tooltip.style.left = `${Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, innerWidth - width - 8))}px`;
  tooltip.style.top = `${Math.max(8, rect.top - height - 10 >= 8 ? rect.top - height - 10 : Math.min(rect.bottom + 10, innerHeight - height - 8))}px`;
}
const TOOLTIP_TRANSLATIONS = {
  "Zoom in": "بزرگ‌نمایی نقشه",
  "Zoom out": "کوچک‌نمایی نقشه",
  Marker: "نشانگر موقعیت",
  Layers: "لایه‌های نقشه",
  Close: "بستن",
  Previous: "قبلی",
  Next: "بعدی",
};
function enhanceTooltips() {
  document.querySelectorAll("[title]").forEach((node) => {
    const title = node.getAttribute("title");
    if (title) node.dataset.tooltip = TOOLTIP_TRANSLATIONS[title] || title;
    node.removeAttribute("title");
  });
  document
    .querySelectorAll(
      ".pk-input-trigger, .pk-nav, .password-toggle, .toast-close",
    )
    .forEach((node) => {
      if (!node.dataset.tooltip && node.getAttribute("aria-label"))
        node.dataset.tooltip = node.getAttribute("aria-label");
    });
}
document.addEventListener("pointerover", (event) => {
  if (tooltip.contains(event.target)) clearTimeout(tooltipDismissTimer);
  const node = event.target.closest?.("[data-tooltip]");
  if (node && !node.contains(event.relatedTarget)) showAppTooltip(node);
});
document.addEventListener("pointerout", (event) => {
  if (
    tooltipAnchor &&
    !tooltipAnchor.contains(event.relatedTarget) &&
    !tooltip.contains(event.relatedTarget)
  ) {
    clearTimeout(tooltipDismissTimer);
    tooltipDismissTimer = setTimeout(hideAppTooltip, 150);
  }
});
document.addEventListener("focusin", (event) => {
  const node = event.target.closest?.("[data-tooltip]");
  if (node) showAppTooltip(node);
  else hideAppTooltip();
});
document.addEventListener("focusout", () => hideAppTooltip());
window.addEventListener("resize", hideAppTooltip);
document.addEventListener("scroll", hideAppTooltip, true);
const uiObserver = new MutationObserver(() => {
  enhancePasswordInputs();
  enhanceDialogs();
  enhanceTooltips();
  if (tooltipAnchor && !tooltipAnchor.isConnected) hideAppTooltip();
});
uiObserver.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["title"],
});
enhancePasswordInputs();
enhanceTooltips();

bootLocalAccess();
