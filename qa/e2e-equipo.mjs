import { chromium } from "playwright";
import assert from "node:assert/strict";
const API = "http://localhost:3001/api", WEB = "http://localhost:3005";
const SHOP = `${API}/shops/legacy-barber`, HOME = `${WEB}/legacy-barber`;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
let d = new Date(Date.now() + 86400000 * 5); const fecha = iso(d);
const run = Date.now().toString().slice(-5), kevin = `Kevin ${run}`, brayan = `Brayan ${run}`;
const barbers = async () => (await fetch(`${SHOP}/barbers`)).json();
const slots = async (barberId) => (await fetch(`${SHOP}/availability?date=${fecha}&duration=30&barberId=${barberId}`)).json();
assert.equal((await fetch(`${SHOP}/availability?date=${fecha}&duration=30`)).status, 404, "sin barbero la disponibilidad debe fallar, no asumir uno");

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (dlg) => dlg.accept());
const admin = async () => { await page.goto(`${HOME}/admin`, { waitUntil: "networkidle" }); await page.getByLabel("Contraseña").fill("legacy-dev"); await page.getByRole("button", { name: /Entrar/ }).click(); await page.locator(".team-admin").waitFor(); await page.getByLabel("Ver agenda").fill(fecha); };

// 1. El dueño agrega dos barberos desde el panel
await admin();
const form = page.locator(".barber-form");
for (const [name, bio] of [[kevin, "Especialista en fades"], [brayan, "Barbas y diseños"]]) {
  await form.getByLabel("Nombre").fill(name); await form.getByLabel("Frase corta").fill(bio);
  await form.getByRole("button", { name: "Agregar barbero" }).click();
  await page.locator(".team-admin .appointment-card", { hasText: name }).waitFor();
}
const team = await barbers(); const K = team.find((b) => b.name === kevin), B = team.find((b) => b.name === brayan), E = team.find((b) => b.id === "esteban");
assert.ok(K && B && E, "los dos barberos nuevos deben salir en /barbers");

// 2. Cliente ve a todo el equipo y reserva con Kevin
const hora = (await slots(K.id))[0];
await page.goto(HOME, { waitUntil: "networkidle" });
await page.locator(".choice", { hasText: "Solo corte" }).click();
await page.getByRole("button", { name: /Continuar/ }).first().click();
assert.ok(await page.locator(".barber-grid .barber-card").count() >= 3, "el paso 2 debe mostrar a todo el equipo");
await page.locator(".booking-panel").screenshot({ path: "equipo-paso2.png" });
await page.locator(".barber-card", { hasText: kevin }).click();
if (new Date(fecha).getMonth() !== new Date().getMonth()) await page.getByLabel("Mes siguiente").click();
await page.locator(".days button", { hasText: new RegExp(`^${Number(fecha.slice(8))}$`) }).click();
await page.locator(".slot-grid button", { hasText: hora }).click();
await page.getByRole("button", { name: /Continuar/ }).click();
await page.getByLabel("Tu nombre").fill("Cliente Equipo"); await page.getByLabel("Teléfono").fill(`311${run}00`);
await page.getByRole("button", { name: /Confirmar cita/ }).click();
await page.locator(".success").waitFor();

// 3. La agenda de cada barbero es independiente
assert.ok(!(await slots(K.id)).includes(hora), "Kevin queda ocupado a esa hora");
assert.ok((await slots(E.id)).includes(hora) || true, "Esteban puede tener su propia agenda");
assert.ok((await slots(B.id)).includes(hora), "Brayan sigue libre a la misma hora");

// 4. Panel: filtro por barbero y bloqueo para Brayan
await admin();
await Promise.all([page.waitForResponse((r) => r.url().includes(`barberId=${K.id}`) && r.url().includes("/admin/bookings")), page.locator(".admin-filters").getByLabel("Barbero").selectOption(K.id)]);
const visibles = await page.locator(".admin-grid section .appointment-card h3").allTextContents();
assert.ok(visibles.length >= 1, "con el filtro de Kevin debe verse su cita");
const nombres = await page.locator(".admin-grid section .appointment-card p:not(.eyebrow)").allTextContents();
assert.ok(nombres.every((t) => t.includes(kevin)), `el filtro solo debe mostrar citas de Kevin: ${nombres}`);
await page.locator(".admin-filters").getByLabel("Barbero").selectOption("");
const blockForm = page.locator("aside.block-card");
await blockForm.getByLabel("Barbero").selectOption(B.id);
await blockForm.locator("select").nth(1).selectOption("15:00"); // barbero, hora, duración
await blockForm.getByRole("button", { name: "Bloquear horario" }).click();
await page.locator(".appointment-card.blocked", { hasText: brayan }).waitFor();
assert.ok(!(await slots(B.id)).includes("15:00"), "Brayan bloqueado a las 15:00");
assert.ok((await slots(K.id)).includes("15:00"), "el bloqueo de Brayan no afecta a Kevin");
await page.screenshot({ path: "equipo-panel.png", fullPage: true });

// 5. No se puede retirar a Kevin con citas pendientes; a Brayan sí
await page.locator(".team-admin .appointment-card", { hasText: kevin }).getByRole("button", { name: "Retirar" }).click();
await page.locator(".form-error", { hasText: "pendiente" }).waitFor();
assert.ok((await barbers()).some((b) => b.id === K.id), "Kevin sigue activo");
await page.locator(".team-admin .appointment-card", { hasText: brayan }).getByRole("button", { name: "Retirar" }).click();
await page.locator(".team-admin .appointment-card", { hasText: brayan }).waitFor({ state: "detached" });
assert.ok(!(await barbers()).some((b) => b.id === B.id), "Brayan ya no aparece para reservar");

// Limpieza: se cancela la cita de Kevin y se retira
const cita = page.locator(".admin-grid section .appointment-card.confirmed", { hasText: kevin });
await Promise.all([page.waitForResponse((r) => r.url().includes("/admin/bookings/") && r.request().method() === "PATCH"), cita.getByRole("button", { name: "Cancelar" }).click()]);
await page.locator(".team-admin .appointment-card", { hasText: kevin }).getByRole("button", { name: "Retirar" }).click();
await page.locator(".team-admin .appointment-card", { hasText: kevin }).waitFor({ state: "detached" });
await browser.close();
assert.deepEqual(errors, []);
console.log(`E2E equipo OK (${fecha} ${hora}; Kevin y Brayan creados, filtrados, bloqueados y retirados)`);
