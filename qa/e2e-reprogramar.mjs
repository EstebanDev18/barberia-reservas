import { chromium } from "playwright";
import assert from "node:assert/strict";
const API = "http://localhost:3001/api", WEB = "http://localhost:3005";
const SHOP = `${API}/shops/legacy-barber`, HOME = `${WEB}/legacy-barber`;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const day = (n) => { const d = new Date(Date.now() + 86400000 * n); return iso(d); };
const slots = async (date) => (await fetch(`${SHOP}/availability?date=${date}&duration=30&barberId=esteban`)).json();
const post = (path, body, method = "POST") => fetch(`${SHOP}${path}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// 1. Horas pasadas: hoy no debe ofrecer horas ya vencidas y la API no debe aceptarlas
const hoy = iso(new Date()), ahora = new Date().getHours() * 60 + new Date().getMinutes();
const hoySlots = await slots(hoy);
assert.ok(hoySlots.every((t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) > ahora), `hoy ofrece horas pasadas: ${hoySlots}`);
if (ahora > 9 * 60) assert.equal((await post("/bookings", { serviceId: "solo-corte", barberId: "esteban", date: hoy, time: "09:00", customerName: "Pasado", phone: "3000000001" })).status, 400, "no debe aceptar una hora pasada");

// 2. Cliente crea cita y la reprograma desde el historial
const phone = `310${Date.now().toString().slice(-7)}`;
const fecha = day(3), destino = day(4);
const [hora] = await slots(fecha);
const created = await (await post("/bookings", { serviceId: "solo-corte", barberId: "esteban", date: fecha, time: hora, customerName: "Reprograma QA", phone })).json();
assert.ok(created.id, JSON.stringify(created));
const nuevaHora = (await slots(destino)).at(-1);

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${HOME}/historial`, { waitUntil: "networkidle" });
await page.getByLabel("Teléfono").fill(phone);
await page.getByRole("button", { name: /Buscar/ }).click();
const card = page.locator(".appointment-card", { hasText: "Solo corte" });
await card.getByRole("button", { name: "Reprogramar" }).click();
await card.getByLabel("Nueva fecha").fill(destino);
await card.locator(".slot-grid button", { hasText: nuevaHora }).click();
await page.screenshot({ path: "historial-reprogramar.png", fullPage: true });
await card.getByRole("button", { name: /Mover mi cita/ }).click();
await card.getByText(nuevaHora).waitFor();
await card.locator(".reschedule").waitFor({ state: "detached" });
assert.ok((await slots(fecha)).includes(hora), "la hora original debe quedar libre");
assert.ok(!(await slots(destino)).includes(nuevaHora), "la nueva hora debe quedar ocupada");

// 3. No se puede mover a una hora ocupada ni con otro teléfono
const otra = await (await post("/bookings", { serviceId: "solo-corte", barberId: "esteban", date: fecha, time: hora, customerName: "Otro", phone: "3201112222" })).json();
assert.equal((await post(`/bookings/${created.id}/reschedule`, { phone, date: fecha, time: hora }, "PATCH")).status, 409, "hora ocupada debe dar 409");
assert.equal((await post(`/bookings/${created.id}/reschedule`, { phone: "3999999999", date: fecha, time: "17:00" }, "PATCH")).status, 404, "otro teléfono debe dar 404");
await post(`/bookings/${otra.id}/cancel`, { phone: "3201112222" }, "PATCH");
await browser.close();
assert.deepEqual(errors, []);
console.log(`E2E reprogramar OK (${fecha} ${hora} -> ${destino} ${nuevaHora}; hoy ofrece ${hoySlots.length} horas)`);
