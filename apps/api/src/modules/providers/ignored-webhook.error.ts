export class IgnoredWebhookError extends Error {
  constructor(message = 'Webhook event is not relevant to this payment flow') {
    super(message);
    this.name = 'IgnoredWebhookError';
  }
}
