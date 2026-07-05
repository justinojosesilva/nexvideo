import {
  EXPORT_CHECKLIST_RULES,
  evaluateExportChecklist,
  type ChecklistInputs,
} from './export-checklist';

const passingInputs = (): ChecklistInputs => ({
  hasApprovedScript: true,
  hasCompletedNarration: true,
  selectedAssetsCount: 3,
  publicationTitle: 'Como sair das dívidas em 90 dias',
  thumbnailUrl: 'https://cdn.example.com/thumb.png',
  tagsCount: 5,
  complianceScore: 80,
});

describe('evaluateExportChecklist', () => {
  describe('happy path', () => {
    it('marks every item pass and allows export', () => {
      const result = evaluateExportChecklist(passingInputs());

      expect(result.canExport).toBe(true);
      expect(result.blocking).toHaveLength(0);
      expect(result.items.every((i) => i.status === 'pass')).toBe(true);
    });
  });

  describe('blocking failures', () => {
    it.each([
      [
        'no approved script',
        { hasApprovedScript: false } as Partial<ChecklistInputs>,
        'approved_script',
      ],
      [
        'narration not completed',
        { hasCompletedNarration: false } as Partial<ChecklistInputs>,
        'completed_narration',
      ],
      [
        'no media selected',
        { selectedAssetsCount: 0 } as Partial<ChecklistInputs>,
        'selected_media_assets',
      ],
      [
        'no publication title',
        { publicationTitle: '' } as Partial<ChecklistInputs>,
        'publication_title',
      ],
      [
        'whitespace title',
        { publicationTitle: '   ' } as Partial<ChecklistInputs>,
        'publication_title',
      ],
      [
        'no thumbnail',
        { thumbnailUrl: null } as Partial<ChecklistInputs>,
        'thumbnail',
      ],
      [
        'compliance score below min',
        {
          complianceScore: EXPORT_CHECKLIST_RULES.minComplianceScore - 1,
        } as Partial<ChecklistInputs>,
        'compliance_score',
      ],
      [
        'compliance score not calculated',
        { complianceScore: null } as Partial<ChecklistInputs>,
        'compliance_score',
      ],
    ])('%s blocks export and reports %s', (_label, patch, expectedBlocking) => {
      const result = evaluateExportChecklist({ ...passingInputs(), ...patch });

      expect(result.canExport).toBe(false);
      expect(result.blocking).toContain(expectedBlocking);
      const failed = result.items.find((i) => i.id === expectedBlocking);
      expect(failed?.status).toBe('fail');
      expect(failed?.message).toBeDefined();
    });
  });

  describe('non-critical (tags)', () => {
    it('warns when below min but at least one tag is present (does not block)', () => {
      const result = evaluateExportChecklist({ ...passingInputs(), tagsCount: 1 });
      const tags = result.items.find((i) => i.id === 'tags');

      expect(tags?.status).toBe('warn');
      expect(result.canExport).toBe(true);
      expect(result.blocking).not.toContain('tags');
    });

    it('fails with zero tags but still does not block export (non-critical)', () => {
      const result = evaluateExportChecklist({ ...passingInputs(), tagsCount: 0 });
      const tags = result.items.find((i) => i.id === 'tags');

      expect(tags?.status).toBe('fail');
      expect(tags?.critical).toBe(false);
      expect(result.canExport).toBe(true);
    });
  });

  describe('aggregation', () => {
    it('reports every blocking id when multiple critical items fail', () => {
      const result = evaluateExportChecklist({
        ...passingInputs(),
        hasApprovedScript: false,
        thumbnailUrl: null,
        complianceScore: 30,
      });

      expect(result.canExport).toBe(false);
      expect(result.blocking).toEqual(
        expect.arrayContaining([
          'approved_script',
          'thumbnail',
          'compliance_score',
        ]),
      );
    });
  });
});
