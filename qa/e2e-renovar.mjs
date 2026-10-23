import { chromium } from "playwright";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
const API = "http://localhost:3001/api", WEB = "http://localhost:3005";
const run = Date.now().toString().slice(-6);
const json = async (r) => ({ status: r.status, body: await r.json().catch(() => null) });
const call = (path, { method = "GET", body, token } = {}) => fetch(`${API}${path}`, { method, headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) }).then(json);
const register = async (name, plan) => { const r = await call("/platform/barbershops", { method: "POST", body: { name, ownerName: "Dueño QA", email: `r${run}@ejemplo.com`, phone: "3001234567", city: "Cali", password: "clave-qa-123", plan, period: "MONTHLY" } }); assert.equal(r.status, 201, JSON.stringify(r.body)); await call(`/platform/payments/${r.body.reference}/demo`, { method: "POST", body: { status: "APPROVED" } }); return r.body.barbershop.slug; };
const login = async (slug) => (await call(`/shops/${slug}/login`, { method: "POST", body: { password: "clave-qa-123" } })).body.accessToken;
const browser = await chromium.launch({ channel: "msedge" });
const errors = [];

// 1. La cinta no tapa el letrero neón: en sus cuatro esquinas, lo que se ve encima es el propio letrero
for (const [label, viewport, reducedMotion] of [["escritorio", { width: 1440, height: 900 }], ["laptop", { width: 1280, height: 720 }, "reduce"], ["tablet", { width: 768, height: 1024 }], ["movil", { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport, reducedMotion });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${WEB}/legacy-barber`, { waitUntil: "networkidle" });
  const neon = page.locator(".hero-visual p.neon");
  await neon.scrollIntoViewIfNeeded();
  const covered = await neon.evaluate((el) => { const r = el.getBoundingClientRect(); return [[r.left + 2, r.top + 2], [r.right - 2, r.top + 2], [r.left + 2, r.bottom - 2], [r.right - 2, r.bottom - 2]].filter(([x, y]) => !el.contains(document.elementFromPoint(x, y))).length; });
  assert.equal(covered, 0, `${label}: la cinta tapa el letrero`);
  const box = await page.locator(".hero-visual").boundingBox();
  await page.screenshot({ path: `renovar-cinta-${label}.png`, clip: { x: box.x, y: box.y + box.height - 260, width: box.width, height: 340 } });
  await page.close();
}

// 2. Renovación (API): bajar de plan con más barberos que el tope se rechaza; renovar da checkout con referencia REN-
const pro = await register(`Tijera ${run}`, "pro"), tokenPro = await login(pro);
for (const name of ["Uno QA", "Dos QA"]) assert.equal((await call("/admin/barbers", { method: "POST", token: tokenPro, body: { name, role: "Barbero", bio: "" } })).status, 201);
const tope = await call("/platform/renew", { method: "POST", token: tokenPro, body: { plan: "basico", period: "MONTHLY" } });
assert.equal(tope.status, 400); assert.match(tope.body.message, /2 barberos activos/);
assert.equal((await call("/platform/renew", { method: "POST", body: { plan: "pro", period: "MONTHLY" } })).status, 401, "sin sesión no renueva");
assert.equal((await call("/platform/renew", { method: "POST", token: tokenPro, body: { plan: "oro", period: "MONTHLY" } })).status, 400, "plan inexistente");
const ok = await call("/platform/renew", { method: "POST", token: tokenPro, body: { plan: "pro", period: "YEARLY" } });
assert.equal(ok.status, 201); assert.match(ok.body.reference, /^REN-/); assert.match(ok.body.checkoutUrl, /pago-demo\?reference=REN-/);

// 3. Renovación (navegador): licencia vencida -> aviso -> pagar -> licencia vigente y reservas abiertas
const slug = await register(`Navaja ${run}`, "basico");
execSync(`docker exec barberia-reservas-postgres-1 psql -U barberia barberia -c "update \\"Barbershop\\" set \\"paidUntil\\" = now() - interval '1 day' where slug = '${slug}'"`);
assert.equal((await call(`/shops/${slug}`)).body.open, false);
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${WEB}/${slug}/admin`, { waitUntil: "networkidle" });
await page.getByLabel("Contraseña").fill("clave-qa-123");
await page.getByRole("button", { name: /Entrar/ }).click();
await page.getByRole("link", { name: /Renovar ahora/ }).click();
await page.getByRole("combobox", { name: "Periodo" }).selectOption("YEARLY");
await assert.doesNotReject(page.getByText("Total:").filter({ hasText: "599.000" }).waitFor({ timeout: 5000 }), "anual del Básico = 10 meses");
await page.locator("#licencia").screenshot({ path: "renovar-panel-licencia.png" });
await page.getByRole("button", { name: /Renovar y pagar/ }).click();
await page.waitForURL(/pago-demo/);
await page.getByRole("button", { name: /Simular pago aprobado/ }).click();
await page.getByRole("heading", { name: "¡Licencia renovada!" }).waitFor();
await page.screenshot({ path: "renovar-resultado.png" });
await page.getByRole("link", { name: /Volver a mi panel/ }).click();
await page.waitForURL(`${WEB}/${slug}/admin`);
const pub = (await call(`/shops/${slug}`)).body;
assert.equal(pub.open, true, "con la licencia renovada se vuelve a reservar");
const vigente = (await call("/admin/shop", { token: await login(slug) })).body.paidUntil;
assert.ok(new Date(vigente) > new Date(Date.now() + 86400000 * 360), `anual = 12 meses (${vigente})`);

// 4. Logo y foto propios: se suben desde el panel, se guardan comprimidos y salen en la página pública
await page.getByLabel("Contraseña").fill("clave-qa-123");
await page.getByRole("button", { name: /Entrar/ }).click();
await page.getByLabel("Subir logo").setInputFiles("../public/night-cuts.webp");
await page.getByLabel("Subir foto del afiche").setInputFiles("../public/night-cuts.webp");
await page.locator('img[alt="Logo actual"]').waitFor();
await page.getByRole("button", { name: "Guardar mi página" }).click();
await page.getByText("Guardado.").waitFor();
await page.locator(".look-admin").screenshot({ path: "renovar-panel-imagenes.png" });
const saved = (await call(`/shops/${slug}`)).body;
assert.match(saved.logo, /^data:image\/webp;base64,/); assert.match(saved.heroImage, /^data:image\/webp;base64,/);
assert.ok(saved.logo.length < 200000 && saved.heroImage.length < 700000, `pesos: logo ${saved.logo.length}, foto ${saved.heroImage.length}`);
await page.goto(`${WEB}/${slug}`, { waitUntil: "networkidle" });
assert.equal(await page.locator(".topbar .brand-logo").count(), 1, "logo en la barra");
assert.equal(await page.locator(".poster img").getAttribute("src"), saved.heroImage, "foto propia en el afiche");
await page.screenshot({ path: "renovar-publica-imagenes.png" });
// Solo imágenes reales: nada de javascript: ni URLs externas
const token = await login(slug);
for (const bad of ["javascript:alert(1)", "https://evil.example/x.png", "data:text/html;base64,PHNjcmlwdD4="]) assert.equal((await call("/admin/shop", { method: "PATCH", token, body: { logo: bad } })).status, 400, bad);

await browser.close();
assert.deepEqual(errors, [], "errores en la consola");
console.log("e2e-renovar OK", { pro, slug, logo: saved.logo.length, foto: saved.heroImage.length });
