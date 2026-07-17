// Mesin polling perintah dari server. Kita tak kirim perintah -> balas "OK".
export async function GET() {
  return new Response("OK", { headers: { "Content-Type": "text/plain" } });
}
