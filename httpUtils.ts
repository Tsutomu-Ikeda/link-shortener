export const toKebabCase = (obj : {
  [s: string]: string
}) => Object.fromEntries(Object.entries(obj).map(([key, val]) => [
  key.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2").replace(/(-|^)-/g, "").toLowerCase(),
  val
]));
