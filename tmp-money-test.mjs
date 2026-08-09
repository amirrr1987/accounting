function toAsciiDigits(value) {
  if (!value) return value;
  return value
    .replace(/[۰-۹]/g, (d) => "x")
    .replace(/[٠-٩]/g, (d) => "y");
}
try {
  console.log("result", toAsciiDigits(1000));
} catch (e) {
  console.log("FAIL", e.message);
}
try {
  console.log("string coerce", toAsciiDigits(String(1000)));
} catch (e) {
  console.log("FAIL2", e.message);
}
