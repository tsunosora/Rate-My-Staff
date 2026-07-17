export default function LinkExpiredPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-100 via-slate-100 to-purple-100 p-4">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl">
          ⏰
        </div>
        <h2 className="text-xl font-bold text-slate-800">Tautan Kadaluarsa</h2>
        <p className="mt-1 text-slate-500">Tautan ini sudah tidak berlaku. Hubungi HR untuk tautan baru.</p>
      </div>
    </main>
  );
}
