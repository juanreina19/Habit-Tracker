import { format, isToday, isYesterday, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";

export type ISODate = string; // "YYYY-MM-DD"

/** Convierte un Date a string ISODate "YYYY-MM-DD" */
export function toISODate(date: Date): ISODate {
  return format(date, "yyyy-MM-dd");
}

/** Fecha de hoy en formato ISODate */
export function today(): ISODate {
  return toISODate(new Date());
}

/** Número de día de la semana: 1=lunes ... 7=domingo */
export function dayOfWeek(date: Date): number {
  const d = date.getDay(); // 0=domingo
  return d === 0 ? 7 : d;
}

/** Días de la semana actual (lunes a domingo) */
export function currentWeekDays(): Date[] {
  const now = new Date();
  return eachDayOfInterval({
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  });
}

/** Formatea una fecha en español de forma amigable */
export function formatFriendly(date: Date): string {
  if (isToday(date)) return "Hoy";
  if (isYesterday(date)) return "Ayer";
  return format(date, "d 'de' MMMM", { locale: es });
}

/** Comprueba si una hora "HH:MM" ya pasó en el momento actual */
export function isTimePast(timeStr: string): boolean {
  const [h, m] = timeStr.split(":").map(Number);
  const now = new Date();
  return (now.getHours() * 60 + now.getMinutes()) > (h * 60 + m);
}

/** Verifica si un hábito debe ejecutarse en un día dado.
 *  Si se pasa createdAt, días anteriores a la creación del hábito devuelven false. */
export function isHabitActiveOnDay(activeDays: number[], date: Date, createdAt?: string): boolean {
  if (createdAt) {
    const creationDay = format(new Date(createdAt), "yyyy-MM-dd");
    const thisDay = format(date, "yyyy-MM-dd");
    if (thisDay < creationDay) return false;
  }
  return activeDays.includes(dayOfWeek(date));
}
