// Format: [Company initials][first 2 letters of first+last name][join year][4-digit serial for that year]
// Example: OIJODO20220001  ->  OI + JO + DO + 2022 + 0001
export function buildLoginId({ companyInitials, firstName, lastName, joinYear, joinSerial }) {
  const nameCode = (
    firstName.slice(0, 2) + lastName.slice(0, 2)
  ).toUpperCase();
  const serial = String(joinSerial).padStart(4, '0');
  return `${companyInitials.toUpperCase()}${nameCode}${joinYear}${serial}`;
}

export function companyInitials(name) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Generates a random temporary password for system-created accounts.
export function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let pw = '';
  for (let i = 0; i < 10; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}
