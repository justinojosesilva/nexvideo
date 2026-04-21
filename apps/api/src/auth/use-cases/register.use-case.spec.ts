jest.mock('@nexvideo/database', () => ({
  prisma: {},
  PrismaClient: jest.fn(),
}));
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RegisterUseCase } from './register.use-case';

const mockOrg = {
  id: 'org-1',
  name: 'Acme',
  slug: 'acme',
  plan: 'free',
  createdAt: new Date(),
  updatedAt: new Date(),
};
const mockUser = {
  id: 'user-1',
  organizationId: 'org-1',
  email: 'alice@example.com',
  name: 'Alice',
  role: 'admin',
  passwordHash: 'hashed-password',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const txMock = {
  organization: { create: jest.fn().mockResolvedValue(mockOrg) },
  user: { create: jest.fn().mockResolvedValue(mockUser) },
};

const mockPrismaService = {
  client: {
    user: { findUnique: jest.fn() },
    $transaction: jest.fn((cb: (tx: typeof txMock) => Promise<unknown>) =>
      cb(txMock),
    ),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('jwt-token'),
};

const mockRefreshTokenService = {
  generateRefreshToken: jest.fn().mockResolvedValue('refresh-token'),
};

const mockSendConfirmationEmailUseCase = {
  execute: jest.fn(),
};

const dto = {
  name: 'Alice',
  email: 'alice@example.com',
  password: 'supersecret',
  organizationName: 'Acme',
  acceptTerms: true as const,
};

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    mockJwtService.sign.mockReturnValue('jwt-token');
    mockRefreshTokenService.generateRefreshToken.mockResolvedValue(
      'refresh-token',
    );
    mockPrismaService.client.user.findUnique.mockResolvedValue(null);
    txMock.organization.create.mockResolvedValue(mockOrg);
    txMock.user.create.mockResolvedValue(mockUser);
    useCase = new RegisterUseCase(
      mockPrismaService as any,
      mockJwtService as any,
      mockRefreshTokenService as any,
      mockSendConfirmationEmailUseCase as any,
    );
  });

  it('creates organization and user atomically and returns access_token and refresh_token', async () => {
    const result = await useCase.execute(dto);

    expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
    expect(txMock.organization.create).toHaveBeenCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: expect.objectContaining({ name: 'Acme', slug: expect.stringMatching(/^acme/) }),
    });
    expect(txMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: mockOrg.id,
        email: dto.email,
        name: dto.name,
        role: 'admin',
        passwordHash: 'hashed-password',
        acceptedTermsAt: expect.any(Date),
        termsVersion: '1.0',
      }),
    });
    expect(mockJwtService.sign).toHaveBeenCalledWith({
      sub: mockUser.id,
      organizationId: mockOrg.id,
      role: mockUser.role,
      email: mockUser.email,
    });
    expect(mockRefreshTokenService.generateRefreshToken).toHaveBeenCalledWith(
      mockUser.id,
    );
    expect(result).toEqual({
      accessToken: 'jwt-token',
      refreshToken: 'refresh-token',
      user: {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
      },
      onboardingCompleted: false,
    });
  });

  it('throws ConflictException (409) when email already exists', async () => {
    mockPrismaService.client.user.findUnique.mockResolvedValue(mockUser);

    await expect(useCase.execute(dto)).rejects.toThrow(ConflictException);
    expect(mockPrismaService.client.$transaction).not.toHaveBeenCalled();
  });

  it('does not create any entity when email is duplicate', async () => {
    mockPrismaService.client.user.findUnique.mockResolvedValue(mockUser);

    await expect(useCase.execute(dto)).rejects.toThrow('Email already in use');
    expect(txMock.organization.create).not.toHaveBeenCalled();
    expect(txMock.user.create).not.toHaveBeenCalled();
  });

  it('hashes password with bcrypt using at least 10 rounds', async () => {
    await useCase.execute(dto);
    const [, rounds] = (bcrypt.hash as jest.Mock).mock.calls[0] as [
      string,
      number,
    ];
    expect(rounds).toBeGreaterThanOrEqual(10);
  });

  it('generates slug from organization name', async () => {
    const dtoWithSpaces = { ...dto, organizationName: 'My Awesome Org!' };
    await useCase.execute(dtoWithSpaces);
    expect(txMock.organization.create).toHaveBeenCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: expect.objectContaining({ slug: expect.stringMatching(/^my-awesome-org/) }),
    });
  });
});
