/** Input masks and Brazilian document validators. Pure functions, shared by browser and server. */
export const onlyDigits = (v: string) => v.replace(/\D/g, "");

export function maskPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
export const isValidPhone = (v: string) => /^[1-9]{2}(9\d{8}|[2-5]\d{7})$/.test(onlyDigits(v));

export function maskCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}
export function isValidCPF(v: string) {
  const d = onlyDigits(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (const n of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Number(d[i]) * (n + 1 - i);
    const dv = ((sum * 10) % 11) % 10;
    if (dv !== Number(d[n])) return false;
  }
  return true;
}

/** CNPJ: 12 alphanumeric chars (A-Z, 0-9) + 2 numeric check digits (Receita Federal, 2026). */
export const cleanCNPJ = (v: string) => {
  const s = v.toUpperCase().replace(/[^0-9A-Z]/g, "");
  return (s.slice(0, 12) + s.slice(12).replace(/\D/g, "")).slice(0, 14);
};
export function maskCNPJ(v: string) {
  const c = cleanCNPJ(v);
  const parts = [c.slice(0, 2), c.slice(2, 5), c.slice(5, 8), c.slice(8, 12), c.slice(12, 14)];
  let out = parts[0];
  if (parts[1]) out += "." + parts[1];
  if (parts[2]) out += "." + parts[2];
  if (parts[3]) out += "/" + parts[3];
  if (parts[4]) out += "-" + parts[4];
  return out;
}
export function isValidCNPJ(v: string) {
  const c = cleanCNPJ(v);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(c) || /^(.)\1{13}$/.test(c)) return false;
  const val = (ch: string) => ch.charCodeAt(0) - 48;
  const dv = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += val(c[i]) * w[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(c[12]) && dv(13) === Number(c[13]);
}

export function maskCardNumber(v: string) {
  return onlyDigits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
}
export function isValidLuhn(v: string) {
  const d = onlyDigits(v);
  if (d.length < 12 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}
export function maskExpiry(v: string) {
  const d = onlyDigits(v).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}
export function isValidExpiry(v: string, now = new Date()) {
  const d = onlyDigits(v);
  if (d.length !== 4) return false;
  const m = Number(d.slice(0, 2));
  const y = 2000 + Number(d.slice(2));
  if (m < 1 || m > 12) return false;
  return y > now.getFullYear() || (y === now.getFullYear() && m >= now.getMonth() + 1);
}
export const maskCVV = (v: string) => onlyDigits(v).slice(0, 4);
export function maskCEP(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
