import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
type Role = 'admin' | 'manager' | 'creator' | 'viewer' | 'member';
import { PrismaService } from '../../prisma/prisma.service';

const ALLOWED_ROLES: Role[] = ['admin', 'manager', 'creator', 'viewer', 'member'];

export interface UpdateMemberRoleInput {
  organizationId: string;
  requestingUserId: string;
  targetUserId: string;
  newRole: string;
}

export interface UpdateMemberRoleOutput {
  id: string;
  role: Role;
}

@Injectable()
export class UpdateMemberRoleUseCase {
  constructor(private prisma: PrismaService) {}

  async execute(input: UpdateMemberRoleInput): Promise<UpdateMemberRoleOutput> {
    const { organizationId, requestingUserId, targetUserId, newRole } = input;

    if (!ALLOWED_ROLES.includes(newRole as Role)) {
      throw new BadRequestException(
        `Invalid role. Allowed values: ${ALLOWED_ROLES.join(', ')}`,
      );
    }

    const targetUser = await this.prisma.client.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, organizationId: true, role: true },
    });

    if (!targetUser) {
      throw new NotFoundException('Member not found');
    }

    if (targetUser.organizationId !== organizationId) {
      throw new ForbiddenException('Member does not belong to your organization');
    }

    if (targetUser.role === (newRole as Role)) {
      return { id: targetUser.id, role: targetUser.role };
    }

    // Prevent demoting the last admin
    if (targetUser.role === 'admin' && newRole !== 'admin') {
      const adminCount = await this.prisma.client.user.count({
        where: { organizationId, role: 'admin' },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('Cannot demote the last admin of the organization');
      }
    }

    const previousRole = targetUser.role;
    const typedNewRole = newRole as Role;

    const [updated] = await this.prisma.client.$transaction([
      this.prisma.client.user.update({
        where: { id: targetUserId },
        data: { role: typedNewRole },
        select: { id: true, role: true },
      }),
      this.prisma.client.memberRoleAudit.create({
        data: {
          organizationId,
          changedByUserId: requestingUserId,
          targetUserId,
          previousRole,
          newRole: typedNewRole,
        },
      }),
    ]);

    return updated;
  }
}
