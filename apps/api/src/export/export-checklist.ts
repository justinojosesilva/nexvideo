export type ChecklistStatus = 'pass' | 'fail' | 'warn';

export interface ChecklistItem {
  id: string;
  label: string;
  status: ChecklistStatus;
  critical: boolean;
  message?: string;
}

export interface ChecklistInputs {
  hasApprovedScript: boolean;
  hasCompletedNarration: boolean;
  selectedAssetsCount: number;
  publicationTitle: string | null;
  thumbnailUrl: string | null;
  tagsCount: number;
  complianceScore: number | null;
}

export interface ChecklistResult {
  items: ChecklistItem[];
  canExport: boolean;
  blocking: string[];
}

export const EXPORT_CHECKLIST_RULES = {
  minComplianceScore: 60,
  minTagsCount: 3,
  minSelectedAssets: 1,
} as const;

export function evaluateExportChecklist(inputs: ChecklistInputs): ChecklistResult {
  const items: ChecklistItem[] = [
    {
      id: 'approved_script',
      label: 'Script aprovado',
      critical: true,
      status: inputs.hasApprovedScript ? 'pass' : 'fail',
      message: inputs.hasApprovedScript
        ? undefined
        : 'Aprove uma versão do script antes de exportar.',
    },
    {
      id: 'completed_narration',
      label: 'Narração concluída',
      critical: true,
      status: inputs.hasCompletedNarration ? 'pass' : 'fail',
      message: inputs.hasCompletedNarration
        ? undefined
        : 'Gere a narração antes de exportar.',
    },
    {
      id: 'selected_media_assets',
      label: `Pelo menos ${EXPORT_CHECKLIST_RULES.minSelectedAssets} mídia selecionada`,
      critical: true,
      status:
        inputs.selectedAssetsCount >= EXPORT_CHECKLIST_RULES.minSelectedAssets
          ? 'pass'
          : 'fail',
      message:
        inputs.selectedAssetsCount >= EXPORT_CHECKLIST_RULES.minSelectedAssets
          ? undefined
          : 'Selecione ao menos uma mídia para o pacote.',
    },
    {
      id: 'publication_title',
      label: 'Título de publicação definido',
      critical: true,
      status:
        inputs.publicationTitle && inputs.publicationTitle.trim().length > 0
          ? 'pass'
          : 'fail',
      message:
        inputs.publicationTitle && inputs.publicationTitle.trim().length > 0
          ? undefined
          : 'Escolha um título antes de exportar.',
    },
    {
      id: 'thumbnail',
      label: 'Thumbnail selecionada',
      critical: true,
      status: inputs.thumbnailUrl ? 'pass' : 'fail',
      message: inputs.thumbnailUrl
        ? undefined
        : 'Gere e selecione uma thumbnail.',
    },
    {
      id: 'tags',
      label: `Pelo menos ${EXPORT_CHECKLIST_RULES.minTagsCount} tags`,
      critical: false,
      status:
        inputs.tagsCount >= EXPORT_CHECKLIST_RULES.minTagsCount
          ? 'pass'
          : inputs.tagsCount > 0
            ? 'warn'
            : 'fail',
      message:
        inputs.tagsCount >= EXPORT_CHECKLIST_RULES.minTagsCount
          ? undefined
          : `Adicione mais tags (${inputs.tagsCount}/${EXPORT_CHECKLIST_RULES.minTagsCount}) para melhorar descoberta.`,
    },
    {
      id: 'compliance_score',
      label: `Compliance score ≥ ${EXPORT_CHECKLIST_RULES.minComplianceScore}`,
      critical: true,
      status:
        inputs.complianceScore == null
          ? 'fail'
          : inputs.complianceScore >= EXPORT_CHECKLIST_RULES.minComplianceScore
            ? 'pass'
            : 'fail',
      message:
        inputs.complianceScore == null
          ? 'Calcule o compliance antes de exportar.'
          : inputs.complianceScore >= EXPORT_CHECKLIST_RULES.minComplianceScore
            ? undefined
            : `Score ${inputs.complianceScore} abaixo do mínimo (${EXPORT_CHECKLIST_RULES.minComplianceScore}). Revise originalidade, copyright e monetização.`,
    },
  ];

  const blocking = items
    .filter((i) => i.critical && i.status !== 'pass')
    .map((i) => i.id);

  return {
    items,
    canExport: blocking.length === 0,
    blocking,
  };
}
