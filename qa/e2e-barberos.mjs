import { chromium } from "playwright";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const API = "http://localhost:3001/api", WEB = "http://localhost:3005";
const SHOP = `${API}/shops/legacy-barber`, HOME = `${WEB}/legacy-barber`;
const sha = (s) => createHash("sha256").update(s).digest("hex");
const post = (path, body, headers = {}) => fetch(`${API}${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
const run = Date.now().toString().slice(-6);

const browser = await chromium.launch({ channel: "msedge" });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = []; context.on("weberror", (e) => errors.push(e.error().message));

// 1. Desde Legacy Barber, el enlace del footer abre BarberOS en pestaña nueva
await page.goto(HOME, { waitUntil: "networkidle" });
const [tab] = await Promise.all([context.waitForEvent("page"), page.getByRole("link", { name: /Reservas con BarberOS/ }).click()]);
await tab.waitForLoadState("networkidle");
assert.equal(new URL(tab.url()).pathname, "/", `debe abrir BarberOS en pestaña nueva: ${tab.url()}`);

// 2. Landing: quiénes somos, funciones, precios con toggle y footer
for (const id of ["nosotros", "funciones", "precios", "preguntas"]) assert.equal(await tab.locator(`#${id}`).count(), 1, `falta la sección #${id}`);
assert.equal(await tab.locator(".os-footer").count(), 1, "falta el footer");
await tab.locator("#precios").scrollIntoViewIfNeeded();
await tab.locator(".os-plan").first().waitFor();
assert.equal(await tab.locator(".os-plan").count(), 3);
assert.match(await tab.locator(".os-plan").first().locator(".os-price").innerText(), /59\.900/);
await tab.getByRole("button", { name: /Anual/ }).click();
await tab.waitForTimeout(1200); // el precio se anima
assert.match(await tab.locator(".os-plan").first().locator(".os-price").innerText(), /599\.000/, "anual = 10 meses");
await tab.screenshot({ path: "barberos-landing.png", fullPage: true });

// 3. Registro Pro anual -> pasarela demo -> aprobado -> barbería activa
await tab.locator(".os-plan.featured").getByRole("link", { name: /Elegir/ }).click();
await tab.waitForURL(/\/registro\?plan=pro&periodo=YEARLY/);
await tab.locator(".os-side h2", { hasText: "Pro" }).waitFor();
// Paso 1 -> 2; en el paso 2 sin datos debe marcar los 5 campos
await tab.getByRole("button", { name: /Continuar/ }).click();
await tab.getByRole("button", { name: /Continuar/ }).click();
assert.equal(await tab.locator(".os-field.bad").count(), 6, "validación en línea de los 6 campos");
const fill = async (name) => { await tab.getByLabel("Nombre de la barbería").fill(name); await tab.getByLabel("Tu nombre").fill("Dueño QA"); await tab.getByLabel("Correo").fill(`qa${run}@ejemplo.com`); await tab.getByLabel("Celular").fill("3001234567"); await tab.getByLabel("Ciudad").fill("Barranquilla"); await tab.getByLabel("Contraseña de tu panel").fill("clave-qa-123"); };
await fill(`Fade Club ${run}`);
assert.equal(await tab.locator(".os-field.ok").count(), 6, "los 6 campos quedan válidos");
await tab.screenshot({ path: "barberos-registro-datos.png", fullPage: true });
await tab.getByRole("button", { name: /Continuar/ }).click();
await tab.locator(".os-review").waitFor();
assert.match(await tab.getByRole("button", { name: /Pagar/ }).innerText(), /1\.199\.000/, "Pro anual = 119.900 x 10");
await tab.screenshot({ path: "barberos-registro.png", fullPage: true });
await tab.getByRole("button", { name: /Pagar/ }).click();
await tab.waitForURL(/pago-demo\?reference=BOS-/);
const ref1 = new URL(tab.url()).searchParams.get("reference");
await tab.getByRole("button", { name: /Simular pago aprobado/ }).click();
await tab.getByText("¡Tu barbería ya está activa!").waitFor();
await tab.screenshot({ path: "barberos-aprobado.png", fullPage: true });
const s1 = await (await fetch(`${API}/platform/payments/${ref1}`)).json();
assert.equal(s1.status, "APPROVED"); assert.equal(s1.barbershop.status, "ACTIVE");
const months = (new Date(s1.barbershop.paidUntil) - Date.now()) / (30.4 * 86400000);
assert.ok(months > 11.5 && months < 12.5, `licencia anual ~12 meses, dio ${months.toFixed(1)}`);
// Repetir la aprobación no debe extender la licencia dos veces
await post(`/platform/payments/${ref1}/demo`, { status: "APPROVED" });
assert.equal((await (await fetch(`${API}/platform/payments/${ref1}`)).json()).barbershop.paidUntil, s1.barbershop.paidUntil, "pago idempotente");

// 4. Registro rechazado: la barbería NO queda activa
await tab.goto(`${WEB}/registro?plan=basico&periodo=MONTHLY`, { waitUntil: "networkidle" });
await tab.locator(".os-side h2", { hasText: "Básico" }).waitFor();
await tab.getByRole("button", { name: /Continuar/ }).click();
await fill(`Sin Pago ${run}`);
await tab.getByRole("button", { name: /Continuar/ }).click();
await tab.getByRole("button", { name: /Pagar/ }).click();
await tab.waitForURL(/pago-demo/);
const ref2 = new URL(tab.url()).searchParams.get("reference");
await tab.getByRole("button", { name: /Simular rechazo/ }).click();
await tab.getByText("El pago no pasó").waitFor();
assert.equal((await (await fetch(`${API}/platform/payments/${ref2}`)).json()).barbershop.status, "PENDING_PAYMENT", "sin pago no se activa");

// 5. Webhook de Wompi: firma válida activa; firma falsa y monto alterado se rechazan
const r3 = await (await post("/platform/barbershops", { name: `Webhook ${run}`, ownerName: "QA", email: `wh${run}@ejemplo.com`, phone: "3001112233", city: "Cali", password: "clave-qa-123", plan: "basico", period: "MONTHLY" })).json();
const tx = { id: `tx-${run}`, reference: r3.reference, status: "APPROVED", amount_in_cents: 5990000, currency: "COP" };
const event = (transaction, secret = "test_events_local_qa") => { const timestamp = Math.floor(Date.now() / 1000); const props = ["transaction.id", "transaction.status", "transaction.amount_in_cents"]; return { event: "transaction.updated", data: { transaction }, signature: { properties: props, checksum: sha(`${transaction.id}${transaction.status}${transaction.amount_in_cents}${timestamp}${secret}`).toUpperCase() }, timestamp }; };
assert.equal((await post("/platform/payments/wompi/webhook", event(tx, "secreto-falso"))).status, 401, "firma falsa -> 401");
assert.equal((await post("/platform/payments/wompi/webhook", event({ ...tx, amount_in_cents: 100 }))).status, 400, "monto alterado -> 400");
assert.equal((await (await fetch(`${API}/platform/payments/${r3.reference}`)).json()).barbershop.status, "PENDING_PAYMENT");
assert.equal((await post("/platform/payments/wompi/webhook", event(tx))).status, 200, "firma válida -> 200");
assert.equal((await (await fetch(`${API}/platform/payments/${r3.reference}`)).json()).barbershop.status, "ACTIVE", "webhook válido activa la barbería");

// 6. Panel BarberOS: protegido y con las barberías
assert.equal((await fetch(`${API}/platform/barbershops`)).status, 401, "sin token -> 401");
await tab.goto(`${WEB}/admin`, { waitUntil: "networkidle" });
await tab.getByLabel("Contraseña").fill("barberos-dev");
await tab.getByRole("button", { name: /Entrar/ }).click();
await tab.locator(".os-tr", { hasText: `Fade Club ${run}` }).waitFor();
assert.match(await tab.locator(".os-tr", { hasText: `Fade Club ${run}` }).innerText(), /activa hasta/i);
assert.match(await tab.locator(".os-tr", { hasText: `Sin Pago ${run}` }).innerText(), /pendiente de pago/i);
await tab.getByRole("button", { name: "Pendientes" }).click();
assert.equal(await tab.locator(".os-tr", { hasText: `Fade Club ${run}` }).count(), 0, "el filtro Pendientes oculta las activas");
await tab.getByRole("button", { name: "Todas" }).click();
await tab.getByLabel("Buscar").fill(`Fade Club ${run}`);
assert.equal(await tab.locator(".os-tr:not(.os-th)").count(), 1, "el buscador filtra");
await tab.screenshot({ path: "barberos-admin.png", fullPage: true });

// Móvil: sin scroll horizontal
const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
for (const path of ["/", "/registro"]) { await m.goto(`${WEB}${path}`, { waitUntil: "networkidle" }); const o = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth); assert.ok(o <= 0, `${path} desborda ${o}px en móvil`); }
await m.goto(`${WEB}/`, { waitUntil: "networkidle" }); await m.screenshot({ path: "barberos-movil.png", fullPage: true });
await browser.close();
assert.deepEqual(errors, []);
console.log(`E2E BarberOS OK (aprobado ${ref1}, rechazado ${ref2}, webhook ${r3.reference})`);
