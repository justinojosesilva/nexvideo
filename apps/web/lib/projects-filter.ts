import type { ContentProjectWithChannelProfile } from "./projects-client";

export const PROJECT_STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "planning", label: "Planejamento" },
  { value: "in_development", label: "Em desenvolvimento" },
  { value: "in_review", label: "Em revisão" },
  { value: "active", label: "Ativo" },
  { value: "paused", label: "Pausado" },
  { value: "archived", label: "Arquivado" },
] as const;

export type ProjectStatusFilter =
  (typeof PROJECT_STATUS_OPTIONS)[number]["value"];

export const PROJECT_SORT_OPTIONS = [
  { value: "createdAt_desc", label: "Mais recentes" },
  { value: "createdAt_asc", label: "Mais antigos" },
  { value: "title_asc", label: "Nome (A → Z)" },
  { value: "title_desc", label: "Nome (Z → A)" },
] as const;

export type ProjectSort = (typeof PROJECT_SORT_OPTIONS)[number]["value"];

export interface ProjectFilters {
  status: ProjectStatusFilter;
  from: string | null; // YYYY-MM-DD
  to: string | null; // YYYY-MM-DD
  search: string;
}

export const DEFAULT_FILTERS: ProjectFilters = {
  status: "all",
  from: null,
  to: null,
  search: "",
};

function inDateRange(
  iso: string,
  from: string | null,
  to: string | null,
): boolean {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return false;
  if (from) {
    const fromTs = Date.parse(`${from}T00:00:00.000Z`);
    if (Number.isFinite(fromTs) && ts < fromTs) return false;
  }
  if (to) {
    const toTs = Date.parse(`${to}T23:59:59.999Z`);
    if (Number.isFinite(toTs) && ts > toTs) return false;
  }
  return true;
}

export function filterProjects(
  projects: ContentProjectWithChannelProfile[],
  filters: ProjectFilters,
): ContentProjectWithChannelProfile[] {
  const search = filters.search.trim().toLowerCase();
  return projects.filter((p) => {
    if (filters.status !== "all" && p.status !== filters.status) return false;
    if (!inDateRange(p.createdAt, filters.from, filters.to)) return false;
    if (search) {
      const haystack =
        `${p.title} ${p.keyword} ${p.niche} ${p.channelProfile.name}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export function sortProjects(
  projects: ContentProjectWithChannelProfile[],
  sort: ProjectSort,
): ContentProjectWithChannelProfile[] {
  const copy = [...projects];
  switch (sort) {
    case "createdAt_asc":
      copy.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      break;
    case "createdAt_desc":
      copy.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      break;
    case "title_asc":
      copy.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { numeric: true }),
      );
      break;
    case "title_desc":
      copy.sort((a, b) =>
        b.title.localeCompare(a.title, undefined, { numeric: true }),
      );
      break;
  }
  return copy;
}

export interface PaginationResult<T> {
  rows: T[];
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number,
): PaginationResult<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const start = safePage * pageSize;
  return {
    rows: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    pageSize,
    total,
  };
}
