import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "msedge" });
const errors = [];
for (const reducedMotion of ["no-preference", "reduce"]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion });
  page.on("pageerror", (e) => errors.push(`${reducedMotion}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !m.text().includes("404") && errors.push(`${reducedMotion}: ${m.text()}`));
  await page.goto("http://localhost:3005/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const tag = reducedMotion === "reduce" ? "r" : "f";
  await page.mouse.move(1000, 400); await page.waitForTimeout(700);
  await page.screenshot({ path: `os-${tag}-1-hero.png` });
  const shots = { nosotros: "#nosotros", funciones: "#funciones", demo: "#demo", precios: "#precios", preguntas: "#preguntas" };
  for (const [name, sel] of Object.entries(shots)) {
    await page.evaluate((s) => { const el = document.querySelector(s); window.scrollTo(0, el.getBoundingClientRect().top + scrollY); }, sel);
    for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(80); }
    await page.waitForTimeout(900);
    await page.screenshot({ path: `os-${tag}-${name}.png` });
  }
  // "Cómo funciona": recorrer el pin y ver que cambian los pasos
  await page.evaluate(() => { const el = document.querySelector(".os-how").closest(".pin-spacer") || document.querySelector(".os-how"); window.scrollTo(0, el.getBoundingClientRect().top + scrollY + 5); });
  const pasos = [];
  for (let i = 0; i < 3; i++) { await page.waitForTimeout(500); pasos.push(await page.locator(".os-step.on b").innerText()); if (i === 1) await page.screenshot({ path: `os-${tag}-como.png` }); await page.mouse.wheel(0, 650); }
  console.log(reducedMotion, "pasos activos al bajar:", pasos.join(" → "));
  const hidden = await page.$$eval("[data-os-reveal]", (els) => els.filter((e) => getComputedStyle(e).opacity !== "1").map((e) => e.className || e.tagName));
  if (hidden.length) errors.push(`${reducedMotion}: sin revelar ${hidden.length}: ${hidden.slice(0, 4)}`);
  const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) errors.push(`desborda ${o}`);
  await page.close();
}
const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
await m.goto("http://localhost:3005/", { waitUntil: "networkidle" }); await m.waitForTimeout(1200);
for (let y = 0; y < 12000; y += 500) { await m.mouse.wheel(0, 500); await m.waitForTimeout(100); }
await m.waitForTimeout(800);
const o = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) errors.push(`movil desborda ${o}`);
await m.screenshot({ path: "os-movil.png", fullPage: true });
await browser.close();
console.log(errors.length ? errors.join("\n") : "sin errores");
