import "./globals.css";
import { ApiStatus } from "../components/ui/ApiStatus";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <ApiStatus />
      </body>
    </html>
  );
}
