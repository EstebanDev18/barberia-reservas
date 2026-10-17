// Retira los barberos de prueba (Kevin/Brayan NNNNN) que hayan quedado, cancelando antes sus citas.
const API = "http://localhost:3001/api", SHOP = `${API}/shops/legacy-barber`;
const { accessToken } = await (await fetch(`${SHOP}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: "legacy-dev" }) })).json();
const h = { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` };
const prueba = (await (await fetch(`${SHOP}/barbers`)).json()).filter((b) => /^(Kevin|Brayan) \d{5}$/.test(b.name));
for (const b of prueba) {
  for (let i = 0; i < 30; i++) {
    const date = new Date(Date.now() + 86400000 * i).toISOString().slice(0, 10);
    for (const a of await (await fetch(`${API}/admin/bookings?date=${date}&barberId=${b.id}`, { headers: h })).json()) if (a.status === "CONFIRMED") await fetch(`${API}/admin/bookings/${a.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ status: "CANCELLED" }) });
  }
  const r = await fetch(`${API}/admin/barbers/${b.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ active: false }) });
  console.log("retirado", b.name, r.status);
}
