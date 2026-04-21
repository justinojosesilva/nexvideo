import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Guards against CSRF on JSON APIs by rejecting mutation requests that carry
 * a non-JSON Content-Type.  A browser-initiated CSRF form submission sends
 * application/x-www-form-urlencoded or multipart/form-data, never
 * application/json — so this check is sufficient for a stateless JWT API
 * that never uses session cookies.
 *
 * Exemptions:
 *  - GET / HEAD / OPTIONS (no body)
 *  - POST /billing/webhook (Stripe sends application/json but without a browser context)
 *  - Requests with no body (Content-Length: 0 or missing)
 */
@Injectable()
export class ContentTypeCsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (!MUTATION_METHODS.has(req.method)) {
      return next();
    }

    // Stripe webhook — body already validated by signature, exempt from this check
    if (req.path === '/billing/webhook') {
      return next();
    }

    const contentLength = req.headers['content-length'];
    const hasBody = contentLength !== '0' && contentLength !== undefined;

    if (!hasBody) {
      return next();
    }

    const contentType = req.headers['content-type'] ?? '';
    if (!contentType.includes('application/json')) {
      throw new BadRequestException(
        'Content-Type must be application/json for mutation requests.',
      );
    }

    next();
  }
}
