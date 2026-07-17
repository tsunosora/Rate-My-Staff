// Mesin melapor hasil eksekusi perintah -> balas "OK".
export async function POST() {
  return new Response("OK", { headers: { "Content-Type": "text/plain" } });
}
