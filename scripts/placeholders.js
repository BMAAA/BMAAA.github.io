const WEEKDAYS_RU = [
  "воскресенье",
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
];

function pad2(value) {
  return String(value).padStart(2, "0");
}

function pluralRu(value, one, few, many) {
  const absolute = Math.abs(value) % 100;
  const last = absolute % 10;
  if (absolute > 10 && absolute < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

function formatHoursMinutesRu(hours, minutes) {
  const parts = [];
  if (hours > 0) {
    parts.push(`${hours} ${pluralRu(hours, "час", "часа", "часов")}`);
  }
  if (minutes > 0 || hours === 0) {
    parts.push(`${minutes} ${pluralRu(minutes, "минута", "минуты", "минут")}`);
  }
  return parts.join(" ");
}

function formatClock(hours, minutes) {
  return `${pad2(hours)}:${pad2(minutes)}`;
}

function resolveTimeSince(hoursRaw, minutesRaw, now) {
  let hours = Number(hoursRaw);
  let minutes = Number(minutesRaw);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 1 || hours > 24 || minutes < 0 || minutes > 60) return null;
  if (hours === 24) hours = 0;
  if (minutes === 60) {
    minutes = 0;
    hours = (hours + 1) % 24;
  }
  const target = new Date(now);
  target.setSeconds(0, 0);
  target.setHours(hours, minutes, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  const diffMs = target.getTime() - now.getTime();
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const remainHours = Math.floor(totalMinutes / 60);
  const remainMinutes = totalMinutes % 60;
  return formatHoursMinutesRu(remainHours, remainMinutes);
}

function resolveYearsSince(yearRaw, now) {
  const year = Number(yearRaw);
  if (!Number.isInteger(year)) return null;
  return String(now.getFullYear() - year);
}

function resolvePlaceholder(name, args, now) {
  switch (name) {
    case "timeNow":
      return formatClock(now.getHours(), now.getMinutes());
    case "yearsNow":
      return String(now.getFullYear());
    case "dayToday":
      return WEEKDAYS_RU[now.getDay()];
    case "dayTomorrow": {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return WEEKDAYS_RU[tomorrow.getDay()];
    }
    case "timeSince": {
      if (!args || args.length !== 2) return null;
      return resolveTimeSince(args[0], args[1], now);
    }
    case "yearsSince": {
      if (!args || args.length !== 1) return null;
      return resolveYearsSince(args[0], now);
    }
    default:
      return null;
  }
}

function applyPlaceholders(template, now = new Date()) {
  return String(template).replace(/\[([a-zA-Z]+)(?::([^\]]+))?\]/g, (match, name, rawArgs) => {
    const args = rawArgs == null ? null : rawArgs.split(",").map((part) => part.trim());
    const value = resolvePlaceholder(name, args, now);
    return value == null ? match : value;
  });
}

window.PplPlaceholders = {
  applyPlaceholders,
};
