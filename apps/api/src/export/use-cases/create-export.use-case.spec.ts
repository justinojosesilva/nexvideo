const mockPrisma = {
  contentProject: { findFirst: jest.fn() },
  script: { findFirst: jest.fn() },
  narration: { findFirst: jest.fn() },
  mediaSuggestion: { findMany: jest.fn() },
  publicationMetadata: { findUnique: jest.fn() },
};

jest.mock('@nexvideo/database', () => ({
  prisma: mockPrisma,
  PrismaClient: jest.fn(),
}));

import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { CreateExportUseCase } from './create-export.use-case';

const mockExportJobRepo = {
  create: jest.fn(),
};

const mockQueue = {
  add: jest.fn(),
};

describe('CreateExportUseCase', () => {
  let useCase: CreateExportUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateExportUseCase(
      mockExportJobRepo as any,
      mockQueue as any,
    );
  });

  const validInput = {
    projectId: 'proj-1',
    organizationId: 'org-1',
  };

  function setupValidProject() {
    mockPrisma.contentProject.findFirst.mockResolvedValue({
      id: 'proj-1',
      organizationId: 'org-1',
    });
    mockPrisma.script.findFirst.mockResolvedValue({
      id: 'script-1',
      projectId: 'proj-1',
      status: 'approved',
    });
    mockPrisma.narration.findFirst.mockResolvedValue({
      id: 'narration-1',
      scriptId: 'script-1',
      status: 'completed',
    });
    mockPrisma.mediaSuggestion.findMany.mockResolvedValue([
      { id: 'asset-1', metadata: { selected: true } },
    ]);
    mockPrisma.publicationMetadata.findUnique.mockResolvedValue({
      id: 'meta-1',
      projectId: 'proj-1',
      title: 'My Video Title',
      tags: ['tag1', 'tag2', 'tag3'],
      thumbnailUrl: 'https://cdn.example.com/thumb.png',
      complianceScore: 80,
    });
    mockExportJobRepo.create.mockResolvedValue({
      id: 'ej-1',
      status: 'pending',
    });
    mockQueue.add.mockResolvedValue({ id: 'bullmq-job-1' });
  }

  it('succeeds when all validations pass', async () => {
    setupValidProject();

    const result = await useCase.execute(validInput);

    expect(result.exportJobId).toBe('ej-1');
    expect(result.bullmqJobId).toBe('bullmq-job-1');
    expect(mockExportJobRepo.create).toHaveBeenCalledWith({
      organizationId: 'org-1',
      projectId: 'proj-1',
      assetType: 'metadata',
    });
    expect(mockQueue.add).toHaveBeenCalledWith(
      'process-export',
      expect.objectContaining({
        exportJobId: 'ej-1',
        projectId: 'proj-1',
        scriptId: 'script-1',
        narrationId: 'narration-1',
        organizationId: 'org-1',
      }),
      expect.objectContaining({
        jobId: expect.stringContaining('process-export-proj-1-'),
      }),
    );
  });

  it('throws ForbiddenException when organizationId is missing', async () => {
    await expect(
      useCase.execute({ projectId: 'proj-1', organizationId: '' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws BadRequestException when project not found', async () => {
    mockPrisma.contentProject.findFirst.mockResolvedValue(null);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      'Project not found',
    );
  });

  it('throws UnprocessableEntityException when no script with status READY', async () => {
    mockPrisma.contentProject.findFirst.mockResolvedValue({ id: 'proj-1' });
    mockPrisma.script.findFirst.mockResolvedValue(null);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('throws UnprocessableEntityException when no completed narration', async () => {
    mockPrisma.contentProject.findFirst.mockResolvedValue({ id: 'proj-1' });
    mockPrisma.script.findFirst.mockResolvedValue({ id: 'script-1' });
    mockPrisma.narration.findFirst.mockResolvedValue(null);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('throws UnprocessableEntityException when no selected assets', async () => {
    mockPrisma.contentProject.findFirst.mockResolvedValue({ id: 'proj-1' });
    mockPrisma.script.findFirst.mockResolvedValue({ id: 'script-1' });
    mockPrisma.narration.findFirst.mockResolvedValue({ id: 'narration-1' });
    mockPrisma.mediaSuggestion.findMany.mockResolvedValue([]);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('throws UnprocessableEntityException when no publication title', async () => {
    mockPrisma.contentProject.findFirst.mockResolvedValue({ id: 'proj-1' });
    mockPrisma.script.findFirst.mockResolvedValue({ id: 'script-1' });
    mockPrisma.narration.findFirst.mockResolvedValue({ id: 'narration-1' });
    mockPrisma.mediaSuggestion.findMany.mockResolvedValue([{ id: 'asset-1' }]);
    mockPrisma.publicationMetadata.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('throws UnprocessableEntityException when publication metadata has no title', async () => {
    mockPrisma.contentProject.findFirst.mockResolvedValue({ id: 'proj-1' });
    mockPrisma.script.findFirst.mockResolvedValue({ id: 'script-1' });
    mockPrisma.narration.findFirst.mockResolvedValue({ id: 'narration-1' });
    mockPrisma.mediaSuggestion.findMany.mockResolvedValue([{ id: 'asset-1' }]);
    mockPrisma.publicationMetadata.findUnique.mockResolvedValue({
      id: 'meta-1',
      title: null,
      tags: ['t1', 't2', 't3'],
      thumbnailUrl: 'https://cdn.example.com/x.png',
      complianceScore: 80,
    });

    await expect(useCase.execute(validInput)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('throws UnprocessableEntityException when thumbnail is missing', async () => {
    setupValidProject();
    mockPrisma.publicationMetadata.findUnique.mockResolvedValue({
      id: 'meta-1',
      title: 'My Video',
      tags: ['t1', 't2', 't3'],
      thumbnailUrl: null,
      complianceScore: 80,
    });

    await expect(useCase.execute(validInput)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('throws UnprocessableEntityException when compliance score is below minimum', async () => {
    setupValidProject();
    mockPrisma.publicationMetadata.findUnique.mockResolvedValue({
      id: 'meta-1',
      title: 'My Video',
      tags: ['t1', 't2', 't3'],
      thumbnailUrl: 'https://cdn.example.com/x.png',
      complianceScore: 30,
    });

    await expect(useCase.execute(validInput)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });
});
