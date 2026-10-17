import { chromium } from "playwright";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
const API = "http://localhost:3001/api", WEB = "http://localhost:3005";
const run = Date.now().toString().slice(-6);
const json = async (r) => ({ status: r.status, body: await r.json().catch(() => null) });
const call = (path, { method = "GET", body, token } = {}) => fetch(`${API}${path}`, { method, headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) }).then(json);
const register = async (name, plan = "basico") => { const r = await call("/platform/barbershops", { method: "POST", body: { name, ownerName: "Dueño QA", email: `t${run}@ejemplo.com`, phone: "3001234567", city: "Cali", password: "clave-qa-123", plan, period: "MONTHLY" } }); assert.equal(r.status, 201, JSON.stringify(r.body)); return r.body; };
const d = new Date(Date.now() + 86400000 * 2); const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// 1. Registro: contraseña obligatoria; dirección reservada; sin pago la barbería no existe
assert.equal((await call("/platform/barbershops", { method: "POST", body: { name: "X", ownerName: "QA", email: "x@ejemplo.com", phone: "3001234567", city: "Cali", plan: "basico", period: "MONTHLY" } })).status, 400, "sin contraseña -> 400");
const reservada = await register("Admin");
assert.notEqual(reservada.barbershop.slug, "admin", "admin es una ruta de BarberOS");
const b = await register(`Navaja ${run}`);
const slug = b.barbershop.slug;
assert.equal((await call(`/shops/${slug}`)).status, 404, "sin pagar no existe");
assert.equal((await call(`/shops/${slug}/login`, { method: "POST", body: { password: "clave-qa-123" } })).status, 401, "sin pagar no entra al panel");
await call(`/platform/payments/${b.reference}/demo`, { method: "POST", body: { status: "APPROVED" } });
const pub = await call(`/shops/${slug}`);
assert.equal(pub.status, 200); assert.equal(pub.body.open, true); assert.equal(pub.body.passwordHash, undefined);

// 2. Sesiones separadas: cada token solo ve su barbería
const tokenB = (await call(`/shops/${slug}/login`, { method: "POST", body: { password: "clave-qa-123" } })).body.accessToken;
const tokenL = (await call("/shops/legacy-barber/login", { method: "POST", body: { password: "legacy-dev" } })).body.accessToken;
assert.ok(tokenB && tokenL);
assert.equal((await call(`/shops/${slug}/login`, { method: "POST", body: { password: "legacy-dev" } })).status, 401, "la clave de Legacy no abre otra barbería");
assert.deepEqual((await call("/admin/barbers", { token: tokenB })).body, [], "la barbería nueva arranca sin equipo");
assert.equal((await call("/admin/barbers/esteban", { method: "PATCH", token: tokenB, body: { name: "Hackeado" } })).status, 404, "no puede editar barberos de otra");
assert.equal((await call("/admin/services/solo-corte", { method: "PATCH", token: tokenB, body: { price: 1 } })).status, 404, "no puede editar servicios de otra");
assert.equal((await call(`/admin/bookings?date=${fecha}`, { token: tokenB })).body.length, 0, "no ve la agenda de otra");
assert.equal((await call("/platform/barbershops", { token: tokenB })).status, 403, "un dueño no entra al panel de BarberOS");

// 3. Panel de la barbería nueva (navegador): equipo, carta, tope del plan y tema
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${WEB}/${slug}/admin`, { waitUntil: "networkidle" });
await page.getByLabel("Contraseña").fill("clave-qa-123");
await page.getByRole("button", { name: /Entrar/ }).click();
await page.locator(".look-admin").waitFor();
const team = page.locator(".barber-form");
await team.getByLabel("Nombre").fill("Sara"); await team.getByLabel("Frase corta").fill("Fades y diseños");
await team.getByRole("button", { name: "Agregar barbero" }).click();
await page.locator(".team-admin .appointment-card", { hasText: "Sara" }).waitFor();
await team.getByLabel("Nombre").fill("Tomás");
await team.getByRole("button", { name: "Agregar barbero" }).click();
await page.getByText(/permite hasta 1 barbero/).waitFor();
const svc = page.locator(".service-form:not(.barber-form)");
await svc.getByLabel("Nombre").fill("Corte clásico"); await svc.getByLabel("Precio (COP)").fill("28000"); await svc.getByLabel("Descripción").fill("Tijera y navaja.");
await svc.getByRole("button", { name: "Agregar servicio" }).click();
await page.locator(".services-admin:not(.team-admin) .appointment-card", { hasText: "Corte clásico" }).waitFor();
// El tema se ve en vivo antes de guardar
await page.getByRole("radio", { name: /Minimal/ }).click();
assert.equal(await page.locator("main").getAttribute("data-theme"), "minimal", "vista previa en vivo");
await page.getByLabel("Instagram (sin @)").fill("@navajaqa");
await page.getByRole("button", { name: "Guardar mi página" }).click();
await page.getByText("Guardado. Tu página ya se ve así.").waitFor();
await page.screenshot({ path: "tenant-panel-minimal.png", fullPage: true });
const bad = await call("/admin/shop", { method: "PATCH", token: tokenB, body: { mapsUrl: "javascript:alert(1)" } });
assert.equal(bad.status, 400, "link de Maps inseguro -> 400");

// 4. Página pública con el tema y su propio contenido
await page.goto(`${WEB}/${slug}`, { waitUntil: "networkidle" });
assert.equal(await page.locator("main").getAttribute("data-theme"), "minimal");
assert.equal(await page.locator(".poster").count(), 0, "sin foto propia no muestra el afiche de Legacy");
assert.match(await page.locator(".neon").innerText(), new RegExp(`NAVAJA ${run}`));
assert.equal(await page.locator(".choice").count(), 1, "solo su carta");
await page.locator(".footer-contact a", { hasText: "@navajaqa" }).waitFor();
await page.screenshot({ path: "tenant-publica-minimal.png", fullPage: true });
// Reserva completa en la barbería nueva
await page.locator(".choice", { hasText: "Corte clásico" }).click();
await page.getByRole("button", { name: /Continuar/ }).first().click();
assert.equal(await page.locator(".barber-card").count(), 1);
await page.locator(".barber-card", { hasText: "Sara" }).click();
if (d.getMonth() !== new Date().getMonth()) await page.getByLabel("Mes siguiente").click();
await page.locator(".days button", { hasText: new RegExp(`^${d.getDate()}$`) }).click();
await page.locator(".slot-grid button").first().click();
await page.getByRole("button", { name: /Continuar/ }).click();
await page.getByLabel("Tu nombre").fill("Cliente Tenant"); await page.getByLabel("Teléfono").fill("3005550000");
await page.getByRole("button", { name: /Confirmar cita/ }).click();
await page.locator(".success").waitFor();
assert.equal((await call(`/admin/bookings?date=${fecha}`, { token: tokenB })).body.length, 1, "la cita queda en su agenda");
assert.ok(!(await call(`/admin/bookings?date=${fecha}`, { token: tokenL })).body.some((a) => a.customer.name === "Cliente Tenant"), "Legacy no ve la cita de otra barbería");
const sara = (await call("/admin/barbers", { token: tokenB })).body[0];
assert.equal((await call(`/shops/legacy-barber/availability?date=${fecha}&duration=30&barberId=${sara.id}`)).status, 404, "no se cruza un barbero de otra barbería");
assert.equal((await call("/shops/legacy-barber/bookings?phone=3005550000")).body.length, 0, "el historial de Legacy no muestra citas de otra");

// 5. Los otros dos temas, en escritorio y móvil, sin scroll horizontal
const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
for (const theme of ["clasico", "callejero", "minimal"]) {
  await call("/admin/shop", { method: "PATCH", token: tokenB, body: { theme, accent: theme === "clasico" ? "#2f6b4f" : "" } });
  await page.goto(`${WEB}/${slug}`, { waitUntil: "networkidle" }); await page.screenshot({ path: `tenant-tema-${theme}.png` });
  await m.goto(`${WEB}/${slug}`, { waitUntil: "networkidle" });
  const o = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth); assert.ok(o <= 0, `${theme} desborda ${o}px en móvil`);
  await m.screenshot({ path: `tenant-movil-${theme}.png`, fullPage: true });
}
const accent = await page.locator("main").evaluate((el) => el.style.getPropertyValue("--red"));
assert.equal(accent, "", "sin acento usa el del tema");

// 6. Licencia vencida: se ve la página, pero sin reservas; el historial y cancelar siguen
execSync(`docker exec barberia-reservas-postgres-1 psql -U barberia barberia -c "update \\"Barbershop\\" set \\"paidUntil\\" = now() - interval '1 day' where slug = '${slug}'"`);
assert.equal((await call(`/shops/${slug}`)).body.open, false);
assert.equal((await call(`/shops/${slug}/availability?date=${fecha}&duration=30&barberId=${sara.id}`)).status, 403, "vencida -> no reserva");
assert.equal((await call(`/shops/${slug}/bookings?phone=3005550000`)).body.length, 1, "vencida -> el cliente aún ve su cita");
await page.goto(`${WEB}/${slug}`, { waitUntil: "networkidle" });
await page.getByText("RESERVAS PAUSADAS").waitFor();
await page.goto(`${WEB}/${slug}/admin`, { waitUntil: "networkidle" });
await page.getByLabel("Contraseña").fill("clave-qa-123"); await page.getByRole("button", { name: /Entrar/ }).click();
await page.getByText(/Tu licencia de BarberOS venció/).waitFor();
await page.screenshot({ path: "tenant-vencida-panel.png" });

// 7. Una dirección que no existe
await page.goto(`${WEB}/no-existe-${run}`, { waitUntil: "networkidle" });
await page.getByText("Barbería no encontrada.").waitFor();
await browser.close();
assert.deepEqual(errors, []);
console.log(`E2E multi-barbería OK (/${slug}, reservada -> /${reservada.barbershop.slug})`);
