import { chromium } from "playwright";
import assert from "node:assert/strict";
const API = "http://localhost:3001/api", WEB = "http://localhost:3005";
const SHOP = `${API}/shops/legacy-barber`, HOME = `${WEB}/legacy-barber`;
const d = new Date(Date.now() + 86400000 * 2); if (d.getDay() === 0) d.setDate(d.getDate() + 1);
const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const slots = async () => (await fetch(`${SHOP}/availability?date=${date}&duration=30&barberId=esteban`)).json();
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
// 1. Cliente reserva "Solo corte" a la primera hora libre
const free = await slots(); const hora = free[0];
await page.goto(HOME, { waitUntil: "networkidle" });
await page.locator(".choice", { hasText: "Solo corte" }).click();
await page.getByRole("button", { name: /Continuar/ }).first().click();
await page.locator(".barber-card").click();
const [y, m, day] = date.split("-").map(Number);
if (m !== new Date().getMonth() + 1) await page.getByLabel("Mes siguiente").click();
await page.locator(".days button", { hasText: new RegExp(`^${day}$`) }).click();
await page.locator(".slot-grid button", { hasText: hora }).click();
await page.getByRole("button", { name: /Continuar/ }).click();
await page.getByLabel("Tu nombre").fill("Cliente Prueba");
await page.getByLabel("Teléfono").fill("3009998877");
await page.getByRole("button", { name: /Confirmar cita/ }).click();
await page.locator(".success").waitFor();
assert.ok(!(await slots()).includes(hora), "la hora reservada debe quedar ocupada");
// 2. Barbero entra al panel, ve la cita y la cancela -> la hora se libera
await page.goto(`${HOME}/admin`, { waitUntil: "networkidle" });
await page.getByLabel("Contraseña").fill("legacy-dev");
await page.getByRole("button", { name: /Entrar/ }).click();
await page.locator(".services-admin:not(.team-admin):not(.look-admin)").waitFor();
await page.getByLabel("Ver agenda").fill(date);
const card = page.locator(".appointment-card.confirmed", { hasText: "Cliente Prueba" }).last(); // la recién creada tiene la hora más tarde
await card.waitFor();
await Promise.all([page.waitForResponse((r) => r.url().includes("/admin/bookings/") && r.request().method() === "PATCH" && r.ok()), card.getByRole("button", { name: "Cancelar" }).click()]);
assert.ok((await slots()).includes(hora), "al cancelar el barbero, la hora debe liberarse");
// 3. Bloquear 15:00 y desbloquear
await page.locator("aside.block-card select").nth(1).selectOption("15:00"); // barbero, hora, duración
await page.getByRole("button", { name: "Bloquear horario" }).click();
const blockCard = page.locator(".appointment-card.blocked", { hasText: "3:00" });
await blockCard.waitFor();
assert.ok(!(await slots()).includes("15:00"), "15:00 debe quedar bloqueada");
await page.screenshot({ path: "admin-agenda.png", fullPage: true });
await blockCard.getByRole("button", { name: "Desbloquear" }).click();
await blockCard.waitFor({ state: "detached" });
assert.ok((await slots()).includes("15:00"), "15:00 debe liberarse al desbloquear");
// 4. Servicios: crear, editar precio, quitar
const form = page.locator(".service-form:not(.barber-form)");
await form.getByLabel("Nombre").fill("Diseño QA");
await form.getByLabel("Duración (min)").fill("30");
await form.getByLabel("Precio (COP)").fill("15000");
await form.getByLabel("Descripción").fill("Líneas y figuras.");
await form.getByRole("button", { name: "Agregar servicio" }).click();
const svc = page.locator(".services-admin:not(.team-admin):not(.look-admin) .appointment-card", { hasText: "Diseño QA" });
await svc.waitFor();
await svc.getByRole("button", { name: "Editar" }).click();
await form.getByLabel("Precio (COP)").fill("18000");
await form.getByRole("button", { name: "Guardar cambios" }).click();
await svc.getByText("18.000").waitFor();
await page.locator(".services-admin:not(.team-admin):not(.look-admin)").screenshot({ path: "admin-servicios.png" });
page.once("dialog", (dlg) => dlg.accept());
await svc.getByRole("button", { name: "Quitar" }).click();
await svc.waitFor({ state: "detached" });
const publicos = await (await fetch(`${SHOP}/services`)).json();
assert.ok(!publicos.some((s) => s.name === "Diseño QA"), "el servicio quitado no debe salir en la carta");
await browser.close();
assert.deepEqual(errors, []);
console.log(`E2E OK (fecha ${date}, hora ${hora})`);
