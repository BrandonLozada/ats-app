import { COMPANY_DOMAIN } from "@/config/app";

function isValidCompanyEmail(email: string, companyDomain: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;

  const domain = email.split("@")[1].toLowerCase();
  return domain === companyDomain.toLowerCase();
}

// Usage
// const isValid = isValidCompanyEmail('desarrollo@amah.com.mx', 'amah.com.mx');
const isValid = isValidCompanyEmail("desarrollo@amah.com.mx", COMPANY_DOMAIN);

console.log({ isValid });
