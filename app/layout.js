import "./globals.css";

export const metadata = {
  title: "My Personal AI",
  description: "A free personal AI assistant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}