export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateEmail(email: string): EmailValidationResult {
  if (!email || !email.trim()) {
    return { isValid: false, error: "Email address is required." };
  }

  const cleanEmail = email.trim();

  // RFC 5322 compliant regex for email validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(cleanEmail)) {
    return { isValid: false, error: "Please enter a valid email address (e.g. user@da.gov.ph or user@gmail.com)." };
  }

  return { isValid: true };
}
