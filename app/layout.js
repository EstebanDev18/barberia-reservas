import "./globals.css";

export const metadata = {
  title: "Reservas en línea | BarberOS",
  description: "Aparta tu silla en línea. Sin filas, sin cuentos.",
};

export default function RootLayout({ children }) {
  return <html lang="es"><body>{children}</body></html>;
}
