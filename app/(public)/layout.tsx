export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Tanpa sidebar/header — untuk halaman token publik (rate, absence, link-expired).
  return <div className="min-h-screen bg-bg">{children}</div>;
}
