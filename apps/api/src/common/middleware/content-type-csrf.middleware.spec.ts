import { ContentTypeCsrfMiddleware } from './content-type-csrf.middleware';
import { BadRequestException } from '@nestjs/common';

function makeReq(overrides: Partial<any> = {}): any {
  return {
    method: 'POST',
    path: '/auth/login',
    headers: { 'content-type': 'application/json', 'content-length': '20' },
    ...overrides,
  };
}

const res: any = {};
const next = jest.fn();

describe('ContentTypeCsrfMiddleware', () => {
  let middleware: ContentTypeCsrfMiddleware;

  beforeEach(() => {
    middleware = new ContentTypeCsrfMiddleware();
    next.mockClear();
  });

  it('passes GET requests without content-type check', () => {
    middleware.use(makeReq({ method: 'GET', headers: {} }), res, next);
    expect(next).toHaveBeenCalled();
  });

  it('passes POST with application/json', () => {
    middleware.use(makeReq(), res, next);
    expect(next).toHaveBeenCalled();
  });

  it('passes POST with no body (no content-length)', () => {
    middleware.use(makeReq({ headers: {} }), res, next);
    expect(next).toHaveBeenCalled();
  });

  it('blocks POST with application/x-www-form-urlencoded', () => {
    expect(() =>
      middleware.use(
        makeReq({ headers: { 'content-type': 'application/x-www-form-urlencoded', 'content-length': '10' } }),
        res,
        next,
      ),
    ).toThrow(BadRequestException);
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks POST with multipart/form-data (simulated CSRF attack)', () => {
    expect(() =>
      middleware.use(
        makeReq({ headers: { 'content-type': 'multipart/form-data; boundary=----', 'content-length': '50' } }),
        res,
        next,
      ),
    ).toThrow(BadRequestException);
  });

  it('exempts POST /billing/webhook regardless of content-type', () => {
    middleware.use(
      makeReq({
        path: '/billing/webhook',
        headers: { 'content-type': 'application/json', 'content-length': '100' },
      }),
      res,
      next,
    );
    expect(next).toHaveBeenCalled();
  });

  it('passes DELETE with application/json', () => {
    middleware.use(makeReq({ method: 'DELETE' }), res, next);
    expect(next).toHaveBeenCalled();
  });

  it('blocks PUT with text/plain body', () => {
    expect(() =>
      middleware.use(
        makeReq({ method: 'PUT', headers: { 'content-type': 'text/plain', 'content-length': '5' } }),
        res,
        next,
      ),
    ).toThrow(BadRequestException);
  });
});
