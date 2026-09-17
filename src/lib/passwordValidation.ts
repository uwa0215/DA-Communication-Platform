// passwordValidation.ts — Enterprise password policy and strength meter
export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0 to 4
  errors: string[];
  checks: {
    minLength: boolean;    // 8+ chars
    hasUppercase: boolean; // A-Z
    hasLowercase: boolean; // a-z
    hasNumber: boolean;    // 0-9
    hasSpecial: boolean;   // !@#$%^&*
  };
}

export function validatePassword(password: string): PasswordValidationResult {
  const minLength = (password || "").length >= 8;
  const hasUppercase = /[A-Z]/.test(password || "");
  const hasLowercase = /[a-z]/.test(password || "");
  const hasNumber = /[0-9]/.test(password || "");
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password || "");

  const errors: string[] = [];
  if (!minLength) errors.push("Password must be at least 8 characters long");
  if (!hasUppercase) errors.push("Password must contain at least one uppercase letter (A-Z)");
  if (!hasLowercase) errors.push("Password must contain at least one lowercase letter (a-z)");
  if (!hasNumber) errors.push("Password must contain at least one number (0-9)");
  if (!hasSpecial) errors.push("Password must contain at least one special character (e.g. !@#$%^&*)");

  let score = 0;
  if (minLength) score++;
  if (hasUppercase && hasLowercase) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  const isValid = minLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  return {
    isValid,
    score,
    errors,
    checks: {
      minLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecial,
    },
  };
}
