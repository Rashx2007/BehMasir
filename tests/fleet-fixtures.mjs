export function fixture() {
  const source = {
    id: 1,
    name: "source",
    plate: "S",
    version: 4,
    status: "ok",
    deleted_at: null,
    vehicle_type_id: 1,
    service_type: "both",
    cargo_capacity: 5,
    passenger_capacity: 3,
    has_fridge: 1,
    fridge_capacity: 3,
    ownership: "org",
    contractor_name: "",
    shift_start: null,
    shift_end: null,
    type_active: 1,
    type_deleted_at: null,
  };
  const target = { ...source, id: 2, name: "target", plate: "T", version: 1 };
  const request = {
    id: 10,
    vehicle_id: 1,
    service_date: "2099-01-01",
    service_time: "09:00:00",
    status: "scheduled",
    version: 1,
    origin_name: "A",
    destination_name: "B",
  };
  return {
    source,
    vehicles: [source, target],
    open: [request],
    drivers: [{ vehicle_id: 2, id: 20, name: "driver", auth_version: 1 }],
    bookings: [{ ...request, driver_id: 11 }],
  };
}
