const s='ALTER TABLE vehicles ADD COLUMN vehicle_type_id INT UNSIGNED NOT NULL AFTER body_type,';
const m=s.match(/ALTER TABLE\s+`?(\w+)`?\s/i);
console.log(JSON.stringify(m));