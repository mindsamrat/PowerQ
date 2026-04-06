const DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "tempmail.com",
  "throwaway.email",
  "temp-mail.org",
  "fakeinbox.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "grr.la",
  "dispostable.com",
  "yopmail.com",
  "trashmail.com",
  "trashmail.net",
  "mailnesia.com",
  "maildrop.cc",
  "discard.email",
  "mailcatch.com",
  "tempmailaddress.com",
  "tempail.com",
  "emailondeck.com",
  "33mail.com",
  "getairmail.com",
  "mohmal.com",
  "getnada.com",
  "tempinbox.com",
  "burnermail.io",
  "inboxbear.com",
  "mytemp.email",
  "correotemporal.org",
  "mintemail.com",
  "10minutemail.com",
  "10minutemail.net",
  "mailexpire.com",
  "tempmailo.com",
];

export function validateEmail(email: string): { valid: boolean; error?: string } {
  const trimmed = email.trim().toLowerCase();

  if (!trimmed) {
    return { valid: false, error: "Email is required." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Enter a valid email address." };
  }

  const domain = trimmed.split("@")[1];
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { valid: false, error: "Please use a permanent email address." };
  }

  return { valid: true };
}
