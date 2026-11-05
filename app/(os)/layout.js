import "./barberos.css";

export const metadata = {
  title: "BarberOS | Software de reservas para barberías",
  description: "Reservas en línea, agenda por barbero y carta de precios para tu barbería.",
};

export default function SoftwareLayout({ children }) {
  return <div className="os">
    <header className="os-header"><a className="os-logo" href="/">Barber<b>OS</b></a><nav className="os-nav" aria-label="BarberOS"><a href="/#nosotros">Quiénes somos</a><a href="/#funciones">Funciones</a><a href="/#precios">Precios</a><a className="os-btn os-btn-main" href="/registro">Registrar mi barbería</a></nav><i className="os-progress" aria-hidden="true" /></header>
    {children}
    <footer className="os-footer">
      <div className="os-footer-grid">
        <div><a className="os-logo" href="/">Barber<b>OS</b></a><p>El sistema operativo de tu barbería: reservas en línea, agenda por barbero y tu carta de precios en un solo lugar.</p></div>
        <nav aria-label="Producto"><h3>Producto</h3><a href="/#funciones">Funciones</a><a href="/#demo">Pruébalo</a><a href="/#precios">Precios</a><a href="/registro">Registrar mi barbería</a></nav>
        <nav aria-label="Empresa"><h3>Empresa</h3><a href="/#nosotros">Quiénes somos</a><a href="/#preguntas">Preguntas frecuentes</a><a href="/admin">Acceso BarberOS</a></nav>
        <nav aria-label="Barberías"><h3>Barberías</h3><a href="/legacy-barber" target="_blank" rel="noopener noreferrer">Legacy Barber ↗</a></nav>
      </div>
      <div className="os-footer-bottom"><span>© {new Date().getFullYear()} BarberOS</span><span className="os-secure"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>Pagos seguros procesados por Wompi</span></div>
    </footer>
  </div>;
}
