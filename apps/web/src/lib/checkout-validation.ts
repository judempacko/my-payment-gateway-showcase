export type CheckoutErrors = Record<string, string>;

export type ContactValues = {
  email: string;
  name: string;
  phone: string;
};

export type DeliveryValues = {
  address1: string;
  city: string;
  postalCode: string;
};

export function validateEmail(email: string): string | null {
  if (!email.trim()) {
    return 'errors.emailRequired';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return 'errors.emailInvalid';
  }

  return null;
}

export function validatePhone(phone: string): string | null {
  if (!/^\+?[1-9]\d{6,15}$/.test(phone.replace(/[\s()-]/g, ''))) {
    return 'errors.phoneInvalid';
  }

  return null;
}

export function validateContact(values: ContactValues, requiresPhone: boolean): CheckoutErrors {
  const errors: CheckoutErrors = {};
  const emailError = validateEmail(values.email);
  const phoneError = values.phone.trim() ? validatePhone(values.phone) : null;

  if (emailError) errors.email = emailError;
  if (!values.name.trim()) errors.name = 'errors.nameRequired';
  if (requiresPhone && !values.phone.trim()) errors.phone = 'errors.phoneRequired';
  if (!errors.phone && phoneError) errors.phone = phoneError;

  return errors;
}

export function validateDelivery(
  values: DeliveryValues,
  postalCodeRequired: boolean,
): CheckoutErrors {
  const errors: CheckoutErrors = {};

  if (!values.address1.trim()) errors.address1 = 'errors.addressRequired';
  if (!values.city.trim()) errors.city = 'errors.cityRequired';
  if (postalCodeRequired && !values.postalCode.trim()) {
    errors.postalCode = 'errors.postalRequired';
  }

  return errors;
}

export function validatePayment(
  values: ContactValues,
  requiresPhone: boolean,
  hasMethod: boolean,
): CheckoutErrors {
  const errors: CheckoutErrors = {};

  if (!hasMethod) {
    errors.method = 'errors.providerUnavailable';
  }

  if (requiresPhone && !values.phone.trim()) {
    errors.phone = 'errors.phoneRequired';
  } else if (values.phone.trim()) {
    const phoneError = validatePhone(values.phone);
    if (phoneError) errors.phone = phoneError;
  }

  return errors;
}

export function validateReview(terms: boolean): CheckoutErrors {
  return terms ? {} : { terms: 'errors.termsRequired' };
}

export function validateAll(
  values: ContactValues & DeliveryValues,
  options: {
    requiresPhone: boolean;
    postalCodeRequired: boolean;
    hasMethod: boolean;
    terms: boolean;
  },
): CheckoutErrors {
  return {
    ...validateContact(values, options.requiresPhone),
    ...validateDelivery(values, options.postalCodeRequired),
    ...validatePayment(values, options.requiresPhone, options.hasMethod),
    ...validateReview(options.terms),
  };
}

export function firstInvalidStep(errors: CheckoutErrors): 0 | 1 | 2 | 3 {
  if (errors.email || errors.name || errors.phone) return 0;
  if (errors.address1 || errors.city || errors.postalCode) return 1;
  if (errors.method) return 2;
  return 3;
}
