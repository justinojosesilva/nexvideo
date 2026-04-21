jest.mock('../../prisma/prisma.service', () => ({ PrismaService: jest.fn() }));

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UpdateMemberRoleUseCase } from './update-member-role.use-case';

const mockFindUnique = jest.fn();
const mockCount = jest.fn();
const mockUpdate = jest.fn();
const mockAuditCreate = jest.fn();

const mockPrisma = {
  client: {
    user: { findUnique: mockFindUnique, count: mockCount, update: mockUpdate },
    memberRoleAudit: { create: mockAuditCreate },
    $transaction: jest.fn().mockImplementation((ops: Promise<any>[]) => Promise.all(ops)),
  },
} as any;

const BASE = {
  organizationId: 'org-1',
  requestingUserId: 'requester-1',
  targetUserId: 'target-1',
};

describe('UpdateMemberRoleUseCase', () => {
  let useCase: UpdateMemberRoleUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateMemberRoleUseCase(mockPrisma);
  });

  it('updates role successfully and creates audit record', async () => {
    mockFindUnique.mockResolvedValue({ id: 'target-1', organizationId: 'org-1', role: 'member' });
    mockUpdate.mockResolvedValue({ id: 'target-1', role: 'manager' });
    mockAuditCreate.mockResolvedValue({});

    const result = await useCase.execute({ ...BASE, newRole: 'manager' });

    expect(result.role).toBe('manager');
    expect(mockAuditCreate).toHaveBeenCalledTimes(1);
  });

  it('returns current role without DB write if role unchanged', async () => {
    mockFindUnique.mockResolvedValue({ id: 'target-1', organizationId: 'org-1', role: 'creator' });

    const result = await useCase.execute({ ...BASE, newRole: 'creator' });

    expect(result.role).toBe('creator');
    expect(mockAuditCreate).not.toHaveBeenCalled();
  });

  it('throws BadRequestException for invalid role', async () => {
    await expect(useCase.execute({ ...BASE, newRole: 'superuser' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws NotFoundException when member not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(useCase.execute({ ...BASE, newRole: 'manager' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ForbiddenException for cross-org attempt', async () => {
    mockFindUnique.mockResolvedValue({ id: 'target-1', organizationId: 'org-other', role: 'member' });

    await expect(useCase.execute({ ...BASE, newRole: 'manager' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws BadRequestException when demoting last admin', async () => {
    mockFindUnique.mockResolvedValue({ id: 'target-1', organizationId: 'org-1', role: 'admin' });
    mockCount.mockResolvedValue(1);

    await expect(useCase.execute({ ...BASE, newRole: 'member' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('allows demoting admin when multiple admins exist', async () => {
    mockFindUnique.mockResolvedValue({ id: 'target-1', organizationId: 'org-1', role: 'admin' });
    mockCount.mockResolvedValue(2);
    mockUpdate.mockResolvedValue({ id: 'target-1', role: 'manager' });
    mockAuditCreate.mockResolvedValue({});

    const result = await useCase.execute({ ...BASE, newRole: 'manager' });

    expect(result.role).toBe('manager');
  });
});
