import {
  DEFAULT_FILTERS,
  filterProjects,
  paginate,
  sortProjects,
} from "./projects-filter";
import type { ContentProjectWithChannelProfile } from "./projects-client";

const project = (
  overrides: Partial<ContentProjectWithChannelProfile>,
): ContentProjectWithChannelProfile => ({
  id: overrides.id ?? "p",
  title: overrides.title ?? "Untitled",
  keyword: overrides.keyword ?? "kw",
  niche: overrides.niche ?? "tech",
  format: overrides.format ?? "long_form",
  status: overrides.status ?? "planning",
  durationMinutes: overrides.durationMinutes,
  createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
  updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
  channelProfile: overrides.channelProfile ?? {
    id: "c",
    name: "Channel",
    platform: "youtube",
  },
});

const sample: ContentProjectWithChannelProfile[] = [
  project({
    id: "a",
    title: "Alpha",
    status: "active",
    createdAt: "2026-01-05T10:00:00.000Z",
    keyword: "finance",
  }),
  project({
    id: "b",
    title: "Bravo",
    status: "planning",
    createdAt: "2026-02-10T10:00:00.000Z",
    keyword: "ai",
  }),
  project({
    id: "c",
    title: "Charlie",
    status: "archived",
    createdAt: "2026-03-15T10:00:00.000Z",
    keyword: "finance",
  }),
  project({
    id: "d",
    title: "Delta",
    status: "active",
    createdAt: "2026-04-20T10:00:00.000Z",
    keyword: "health",
  }),
];

describe("filterProjects", () => {
  it("returns all projects with default filters", () => {
    expect(filterProjects(sample, DEFAULT_FILTERS)).toHaveLength(4);
  });

  it("filters by status", () => {
    const result = filterProjects(sample, { ...DEFAULT_FILTERS, status: "active" });
    expect(result.map((p) => p.id)).toEqual(["a", "d"]);
  });

  it("filters by date range (inclusive)", () => {
    const result = filterProjects(sample, {
      ...DEFAULT_FILTERS,
      from: "2026-02-01",
      to: "2026-03-31",
    });
    expect(result.map((p) => p.id)).toEqual(["b", "c"]);
  });

  it("supports open-ended date range (from only)", () => {
    const result = filterProjects(sample, {
      ...DEFAULT_FILTERS,
      from: "2026-03-01",
    });
    expect(result.map((p) => p.id)).toEqual(["c", "d"]);
  });

  it("matches search across title, keyword, niche, and channel", () => {
    const result = filterProjects(sample, {
      ...DEFAULT_FILTERS,
      search: "finance",
    });
    expect(result.map((p) => p.id)).toEqual(["a", "c"]);
  });

  it("combines status, date and search predicates", () => {
    const result = filterProjects(sample, {
      status: "active",
      from: "2026-04-01",
      to: null,
      search: "health",
    });
    expect(result.map((p) => p.id)).toEqual(["d"]);
  });

  it("ignores leading/trailing whitespace in search", () => {
    const result = filterProjects(sample, {
      ...DEFAULT_FILTERS,
      search: "  alpha  ",
    });
    expect(result.map((p) => p.id)).toEqual(["a"]);
  });
});

describe("sortProjects", () => {
  it("sorts by createdAt desc by default option", () => {
    const result = sortProjects(sample, "createdAt_desc");
    expect(result.map((p) => p.id)).toEqual(["d", "c", "b", "a"]);
  });

  it("sorts by createdAt asc", () => {
    const result = sortProjects(sample, "createdAt_asc");
    expect(result.map((p) => p.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("sorts by title (numeric-aware)", () => {
    const items = [
      project({ id: "1", title: "Item 10" }),
      project({ id: "2", title: "Item 2" }),
      project({ id: "3", title: "Item 1" }),
    ];
    const asc = sortProjects(items, "title_asc").map((p) => p.id);
    expect(asc).toEqual(["3", "2", "1"]);
  });

  it("does not mutate the input", () => {
    const snapshot = sample.map((p) => p.id);
    sortProjects(sample, "title_desc");
    expect(sample.map((p) => p.id)).toEqual(snapshot);
  });
});

describe("paginate", () => {
  it("returns the first page", () => {
    const r = paginate([1, 2, 3, 4, 5], 0, 2);
    expect(r.rows).toEqual([1, 2]);
    expect(r.totalPages).toBe(3);
    expect(r.total).toBe(5);
  });

  it("clamps an out-of-range page", () => {
    const r = paginate([1, 2, 3], 99, 2);
    expect(r.page).toBe(1);
    expect(r.rows).toEqual([3]);
  });

  it("treats negative page as zero", () => {
    const r = paginate([1, 2, 3], -5, 2);
    expect(r.page).toBe(0);
  });

  it("returns empty rows but totalPages=1 for empty input", () => {
    const r = paginate<number>([], 0, 10);
    expect(r.rows).toEqual([]);
    expect(r.totalPages).toBe(1);
    expect(r.total).toBe(0);
  });
});
