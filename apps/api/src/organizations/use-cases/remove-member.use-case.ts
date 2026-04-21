import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface RemoveMemberInput {
  organizationId: string;
  requestingUserId: string;
  targetUserId: string;
}

export interface RemoveMemberOutput {
  removed: boolean;
}

@Injectable()
export class RemoveMemberUseCase {
  constructor(private prisma: PrismaService) {}

  async execute(input: RemoveMemberInput): Promise<RemoveMemberOutput> {
    const { organizationId, requestingUserId, targetUserId } = input;

    if (requestingUserId === targetUserId) {
      throw new BadRequestException('You cannot remove yourself from the organization');
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

    // Prevent removing the last admin
    if (targetUser.role === 'admin') {
      const adminCount = await this.prisma.client.user.count({
        where: { organizationId, role: 'admin' },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('Cannot remove the last admin of the organization');
      }
    }

    await this.prisma.client.user.delete({ where: { id: targetUserId } });

    return { removed: true };
  }
}
