const shortDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatShortDate(date: Date) {
  return shortDateFormatter.format(date);
}
