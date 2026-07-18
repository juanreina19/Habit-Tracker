export type Period = "AM" | "PM";

/** Convierte "HH:MM" (24h) a partes de picker 12h — usado por WorkoutFormDialog
 *  y TaskFormDialog junto a TimePickerPopover, sin cambiar el esquema "HH:MM"
 *  con el que se persiste el horario. */
export function to12h(time24: string): { hour: string; minute: string; period: Period } {
  if (!time24) return { hour: "", minute: "", period: "AM" };
  const [h, m] = time24.split(":").map(Number);
  const period: Period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour: String(hour12).padStart(2, "0"), minute: String(m).padStart(2, "0"), period };
}

export function from12h(hour: string, minute: string, period: Period): string {
  let h = Number(hour) % 12;
  if (period === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${minute}`;
}
