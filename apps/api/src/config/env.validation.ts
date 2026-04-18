import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3002),
  DATABASE_URL: Joi.string().uri().required(),
  REDIS_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().required(),
  YOUTUBE_API_KEY: Joi.string().required(),
  GOOGLE_TRENDS_REGION: Joi.string().required(),
  OPENAI_API_KEY: Joi.string().required(),
  MAX_COST_PER_SCRIPT_BRL: Joi.number().positive().default(1.5),
  STRIPE_SECRET_KEY: Joi.string()
    .pattern(/^sk_(test|live)_/)
    .required()
    .messages({
      'string.pattern.base':
        'STRIPE_SECRET_KEY must start with sk_test_ (staging) or sk_live_ (production)',
    }),
  STRIPE_WEBHOOK_SECRET: Joi.string()
    .pattern(/^whsec_/)
    .required()
    .messages({
      'string.pattern.base': 'STRIPE_WEBHOOK_SECRET must start with whsec_',
    }),
  STRIPE_SUCCESS_URL: Joi.string().uri().required(),
  STRIPE_CANCEL_URL: Joi.string().uri().required(),
  STRIPE_PORTAL_RETURN_URL: Joi.string().uri().required(),
  RESEND_API_KEY: Joi.string().required(),
  APP_URL: Joi.string().uri().required(),
  ADMIN_API_KEY: Joi.string().min(32).optional(),
  SENTRY_DSN: Joi.string().uri().optional(),
}).custom((value, helpers) => {
  // Guard against live Stripe key used outside production
  const isLiveKey = (value.STRIPE_SECRET_KEY as string).startsWith('sk_live_');
  const isProduction = value.NODE_ENV === 'production';
  if (isLiveKey && !isProduction) {
    return helpers.error('any.invalid', {
      label: 'STRIPE_SECRET_KEY',
      message:
        'sk_live_ keys must only be used in NODE_ENV=production. Use sk_test_ in staging/dev.',
    });
  }
  return value;
});
