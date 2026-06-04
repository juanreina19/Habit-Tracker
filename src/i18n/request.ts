import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import esMessages from "../../messages/es.json";
import enMessages from "../../messages/en.json";

const allMessages = { es: esMessages, en: enMessages };

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value ?? "es") as "es" | "en";
  const messages = allMessages[locale] ?? allMessages.es;

  return { locale, messages };
});
