export function decodeTemplateText(value: unknown) {
  return String(value ?? "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/ג€¢/g, "•")
    .replace(/â€¢/g, "•")
    .replace(/ֲ·/g, " · ");
}

export function toMailBody(value: unknown) {
  return decodeTemplateText(value).replace(/\n/g, "\r\n");
}
