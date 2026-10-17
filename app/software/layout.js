export const metadata = {
  title: "BarberOS | Software de reservas para barberías",
  description: "Reservas en línea, agenda por barbero y carta de precios para tu barbería.",
};

export default function SoftwareLayout({ children }) {
  return <div className="os">
    <header className="topbar os-topbar"><a className="os-brand" href="/software">Barber<span>OS</span></a><nav><a href="/software#nosotros">Quiénes somos</a><a href="/software#funciones">Funciones</a><a href="/software#precios">Precios</a><a className="os-nav-cta" href="/software/registro">Registrar mi barbería</a></nav></header>
    {children}
    <footer className="os-footer">
      <div className="os-footer-grid">
        <div><a className="os-brand" href="/software">Barber<span>OS</span></a><p>El sistema operativo de tu barbería: reservas en línea, agenda por barbero y tu carta de precios en un solo lugar.</p></div>
        <nav aria-label="Producto"><h3>Producto</h3><a href="/software#funciones">Funciones</a><a href="/software#precios">Precios</a><a href="/software/registro">Registrar mi barbería</a></nav>
        <nav aria-label="Empresa"><h3>Empresa</h3><a href="/software#nosotros">Quiénes somos</a><a href="/software#preguntas">Preguntas frecuentes</a><a href="/software/admin">Acceso BarberOS</a></nav>
        <nav aria-label="Clientes"><h3>Barberías</h3><a href="/" target="_blank" rel="noopener noreferrer">Legacy Barber ↗</a></nav>
      </div>
      <div className="os-footer-bottom"><span>© {new Date().getFullYear()} BarberOS · Hecho en Colombia</span><span>Pagos procesados por Wompi</span></div>
    </footer>
  </div>;
}
