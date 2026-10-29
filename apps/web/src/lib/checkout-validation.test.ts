import { describe, expect, it } from 'vitest';
import {
  firstInvalidStep,
  validateAll,
  validateContact,
  validateDelivery,
  validatePayment,
  validateReview,
} from './checkout-validation';

const contact = {
  email: 'awa@example.com',
  name: 'Awa Diop',
  phone: '+221770000000',
};

const delivery = {
  address1: '12 rue des Lilas',
  city: 'Dakar',
  postalCode: '10000',
};

describe('checkout validation', () => {
  it('accepts a valid contact', () => {
    expect(validateContact(contact, true)).toEqual({});
  });

  it('rejects a missing email and name', () => {
    expect(validateContact({ ...contact, email: '', name: '' }, false)).toMatchObject({
      email: 'errors.emailRequired',
      name: 'errors.nameRequired',
    });
  });

  it('requires a phone only for mobile money', () => {
    expect(validateContact({ ...contact, phone: '' }, false)).toEqual({});
    expect(validateContact({ ...contact, phone: '' }, true)).toEqual({
      phone: 'errors.phoneRequired',
    });
  });

  it('requires a postal code only when the region requires it', () => {
    expect(validateDelivery({ ...delivery, postalCode: '' }, true)).toEqual({
      postalCode: 'errors.postalRequired',
    });
    expect(validateDelivery({ ...delivery, postalCode: '' }, false)).toEqual({});
  });

  it('validates payment prerequisites', () => {
    expect(validatePayment({ ...contact, phone: '' }, true, true)).toEqual({
      phone: 'errors.phoneRequired',
    });
    expect(validatePayment(contact, false, false)).toEqual({
      method: 'errors.providerUnavailable',
    });
  });

  it('requires terms', () => {
    expect(validateReview(false)).toEqual({ terms: 'errors.termsRequired' });
    expect(validateReview(true)).toEqual({});
  });

  it('returns the first invalid step', () => {
    expect(firstInvalidStep({ email: 'errors.emailRequired' })).toBe(0);
    expect(firstInvalidStep({ city: 'errors.cityRequired' })).toBe(1);
    expect(firstInvalidStep({ method: 'errors.providerUnavailable' })).toBe(2);
    expect(firstInvalidStep({ terms: 'errors.termsRequired' })).toBe(3);
  });

  it('validates the whole checkout', () => {
    expect(
      validateAll(
        { ...contact, ...delivery },
        {
          requiresPhone: true,
          postalCodeRequired: true,
          hasMethod: true,
          terms: true,
        },
      ),
    ).toEqual({});
  });
});
