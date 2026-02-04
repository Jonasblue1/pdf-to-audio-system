export const metadata = {
  title: "PDF to Audio System",
  description: "Convert PDFs to speech using Text-to-Speech",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
