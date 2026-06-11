const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
const CLOUD_METADATA_HOSTNAME = "169.254.169.254";

/**
 * Validación SSRF para URLs de webhook: el cron de dispatch corre con
 * service-role y podría usarse para golpear infraestructura interna si no
 * se valida el destino. Lanza un Error con un mensaje legible si la URL no
 * es válida o apunta a una red privada/local.
 */
export function validateWebhookUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid webhook URL");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Webhook URL must use https://");
  }

  const hostname = parsed.hostname.toLowerCase();

  if (LOCAL_HOSTNAMES.has(hostname) || hostname === CLOUD_METADATA_HOSTNAME) {
    throw new Error("Webhook URL cannot point to a local or cloud-metadata address");
  }

  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    const isPrivateRange =
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254);
    if (isPrivateRange) {
      throw new Error("Webhook URL cannot point to a private network address");
    }
  }
}
