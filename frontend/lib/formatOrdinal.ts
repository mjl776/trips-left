// 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 11 -> "11th", 92 -> "92nd", etc.
export function formatOrdinal(value: number): string {
  const rounded = Math.round(value);
  const remainder100 = rounded % 100;

  if (remainder100 >= 11 && remainder100 <= 13) {
    return `${rounded}th`;
  }

  switch (rounded % 10) {
    case 1:
      return `${rounded}st`;
    case 2:
      return `${rounded}nd`;
    case 3:
      return `${rounded}rd`;
    default:
      return `${rounded}th`;
  }
}
