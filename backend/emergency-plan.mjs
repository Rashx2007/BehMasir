import { hash, withinShift } from "./core.mjs";

export const EMERGENCY_REASONS = Object.freeze({
  enroute: "درحال اجرا؛ نیازمند تحویل حضوری بار/مسئولیت و تصمیم جداگانه است.",
  past: "تاریخ مأموریت گذشته است؛ ابتدا وضعیت واقعی آن بررسی شود.",
  no_target:
    "مقصد هم‌رده با مالکیت مجاز، ظرفیت، شیفت، تجهیزات و رانندهٔ آزاد پیدا نشد.",
});

// Request schema does not yet describe load, cold-chain requirements or duration.
// Preserve the source's declared capabilities conservatively; never infer a
// medical handover, cross-contractor authorization or a route optimization.
export function compatibleEmergencyTarget(source, target) {
  return (
    target.id !== source.id &&
    !target.deleted_at &&
    target.status === "ok" &&
    Number(target.type_active) === 1 &&
    !target.type_deleted_at &&
    Number(target.vehicle_type_id) === Number(source.vehicle_type_id) &&
    target.ownership === source.ownership &&
    (source.ownership !== "contractor" ||
      target.contractor_name.trim() === source.contractor_name.trim()) &&
    (target.service_type === source.service_type ||
      target.service_type === "both") &&
    Number(target.cargo_capacity) > 0 &&
    Number(target.cargo_capacity) >= Number(source.cargo_capacity) &&
    Number(target.passenger_capacity) >= Number(source.passenger_capacity) &&
    (!Number(source.has_fridge) ||
      (Number(target.has_fridge) === 1 &&
        Number(target.fridge_capacity) >= Number(source.fridge_capacity)))
  );
}

export function buildEmergencyPlan(snapshot, day) {
  const { source } = snapshot;
  const vehicles = [...snapshot.vehicles].sort((a, b) => a.id - b.id);
  const open = [...snapshot.open].sort(
    (a, b) =>
      a.service_date.localeCompare(b.service_date) ||
      a.service_time.localeCompare(b.service_time) ||
      a.id - b.id,
  );
  const drivers = [...snapshot.drivers].sort(
    (a, b) => a.vehicle_id - b.vehicle_id || a.id - b.id,
  );
  const bookings = [...snapshot.bookings].sort(
    (a, b) => a.id - b.id || (a.driver_id || 0) - (b.driver_id || 0),
  );
  const fingerprint = hash(
    JSON.stringify({
      policy: 1,
      day,
      source,
      vehicles,
      open,
      drivers,
      bookings,
    }),
  );
  const counts = new Map();
  const requests = new Map();
  const driverDays = new Map();
  const vehicleDays = new Map();
  const key = (id, date) => `${id}|${date}`;
  for (const r of bookings) {
    if (!requests.has(r.id)) {
      requests.set(r.id, { ...r, driverIds: new Set() });
      const k = key(r.vehicle_id, r.service_date);
      counts.set(k, (counts.get(k) || 0) + 1);
      if (["scheduled", "enroute"].includes(r.status)) {
        if (!vehicleDays.has(k)) vehicleDays.set(k, new Set());
        vehicleDays.get(k).add(r.id);
      }
    }
    if (r.driver_id) {
      requests.get(r.id).driverIds.add(r.driver_id);
      if (["scheduled", "enroute"].includes(r.status)) {
        const k = key(r.driver_id, r.service_date);
        if (!driverDays.has(k)) driverDays.set(k, new Map());
        driverDays.get(k).set(r.id, r.vehicle_id);
      }
    }
  }
  const driversByVehicle = new Map();
  for (const driver of drivers) {
    if (!driversByVehicle.has(driver.vehicle_id))
      driversByVehicle.set(driver.vehicle_id, []);
    driversByVehicle.get(driver.vehicle_id).push(driver);
  }
  const candidates = vehicles.filter((v) =>
    compatibleEmergencyTarget(source, v),
  );
  const moves = [],
    blocked = [];
  for (const request of open) {
    const detail = {
      requestId: request.id,
      version: request.version,
      date: request.service_date,
      time: request.service_time.slice(0, 5),
      origin: request.origin_name,
      destination: request.destination_name,
    };
    const block = (code) =>
      blocked.push({ ...detail, code, reason: EMERGENCY_REASONS[code] });
    if (request.status === "enroute") {
      block("enroute");
      continue;
    }
    if (request.service_date < day) {
      block("past");
      continue;
    }
    const options = candidates
      .map((v) => ({
        vehicle: v,
        used: counts.get(key(v.id, request.service_date)) || 0,
        drivers: (driversByVehicle.get(v.id) || []).filter((driver) => {
          const busy = driverDays.get(key(driver.id, request.service_date));
          return !busy || ![...busy].some(([id, car]) => id !== request.id);
        }),
      }))
      .filter(
        (o) =>
          o.used < Number(o.vehicle.cargo_capacity) &&
          !vehicleDays.get(key(o.vehicle.id, request.service_date))?.size &&
          o.drivers.length &&
          withinShift(o.vehicle, detail.time),
      )
      .sort(
        (a, b) =>
          a.used / a.vehicle.cargo_capacity -
            b.used / b.vehicle.cargo_capacity || a.vehicle.id - b.vehicle.id,
      );
    if (!options.length) {
      block("no_target");
      continue;
    }
    const chosen = options[0],
      target = chosen.vehicle;
    const previousDrivers = [
      ...(requests.get(request.id)?.driverIds || []),
    ].sort((a, b) => a - b);
    for (const id of previousDrivers)
      driverDays.get(key(id, request.service_date))?.delete(request.id);
    for (const driver of chosen.drivers) {
      const k = key(driver.id, request.service_date);
      if (!driverDays.has(k)) driverDays.set(k, new Map());
      driverDays.get(k).set(request.id, target.id);
    }
    counts.set(
      key(source.id, request.service_date),
      Math.max(0, (counts.get(key(source.id, request.service_date)) || 0) - 1),
    );
    counts.set(key(target.id, request.service_date), chosen.used + 1);
    vehicleDays.get(key(source.id, request.service_date))?.delete(request.id);
    const vehicleDayKey = key(target.id, request.service_date);
    if (!vehicleDays.has(vehicleDayKey))
      vehicleDays.set(vehicleDayKey, new Set());
    vehicleDays.get(vehicleDayKey).add(request.id);
    moves.push({
      ...detail,
      targetId: target.id,
      targetName: target.name,
      targetPlate: target.plate,
      drivers: chosen.drivers.map((d) => ({ id: d.id, name: d.name })),
      previousDriverIds: previousDrivers,
    });
  }
  return {
    policy: 1,
    fingerprint,
    source: {
      id: source.id,
      name: source.name,
      plate: source.plate,
      version: source.version,
      status: source.status,
    },
    moves,
    blocked,
    total: open.length,
    resultingStatus: "down",
  };
}
