// Título y descripción propios de cada barbería, puestos en el servidor para que buscadores y vistas previas
// (WhatsApp, Instagram) muestren su nombre y no uno genérico. Las páginas siguen siendo componentes de cliente.
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export async function generateMetadata({ params }) {
  const { shop: slug } = await params;
  try {
    const response = await fetch(`${apiUrl}/shops/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } });
    if (!response.ok) return { title: "Barbería no encontrada | BarberOS", robots: { index: false } };
    const shop = await response.json();
    const title = `${shop.name} | Reserva tu turno en línea`;
    const description = `Aparta tu silla en ${shop.name}${shop.address ? ` (${shop.address})` : ""}: elige el servicio, el barbero y la hora. Sin filas ni llamadas.`;
    return { title, description, openGraph: { title, description, type: "website", siteName: shop.name }, twitter: { card: "summary", title, description } };
  } catch {
    return {}; // sin API se usa el título por defecto del sitio
  }
}

export default function ShopLayout({ children }) { return children; }
