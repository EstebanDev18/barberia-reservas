export const SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"];

export function addMinutes(time, minutes) {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function overlaps(startA, durationA, startB, durationB) {
  const toMinutes = (time) => { const [h, m] = time.split(":").map(Number); return h * 60 + m; };
  const a = toMinutes(startA), b = toMinutes(startB);
  return a < b + durationB && b < a + durationA;
}

export function formatDate(date) {
  return new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}
