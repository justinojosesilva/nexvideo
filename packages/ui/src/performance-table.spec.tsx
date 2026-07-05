import {
  compareValues,
  paginateRows,
  sortRows,
  type PerformanceTableColumn,
} from "./performance-table";

interface Row {
  id: string;
  name: string;
  views: number;
}

const columns: PerformanceTableColumn<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "views", header: "Views", accessor: (r) => r.views },
];

const data: Row[] = [
  { id: "a", name: "Charlie", views: 120 },
  { id: "b", name: "Alpha", views: 50 },
  { id: "c", name: "Bravo", views: 300 },
  { id: "d", name: "Delta", views: 80 },
  { id: "e", name: "Echo", views: 200 },
];

describe("compareValues", () => {
  it("compares numbers numerically", () => {
    expect(compareValues(10, 2)).toBeGreaterThan(0);
    expect(compareValues(2, 10)).toBeLessThan(0);
    expect(compareValues(5, 5)).toBe(0);
  });

  it("compares strings naturally", () => {
    expect(compareValues("Item 2", "Item 10")).toBeLessThan(0);
    expect(compareValues("Bravo", "Alpha")).toBeGreaterThan(0);
  });

  it("places null/undefined at the end", () => {
    expect(compareValues(null, 1)).toBeGreaterThan(0);
    expect(compareValues(1, null)).toBeLessThan(0);
    expect(compareValues(null, null)).toBe(0);
  });
});

describe("sortRows", () => {
  it("returns data unchanged when sort is null", () => {
    expect(sortRows(data, columns, null)).toBe(data);
  });

  it("sorts numerically ascending", () => {
    const result = sortRows(data, columns, { key: "views", direction: "asc" });
    expect(result.map((r) => r.views)).toEqual([50, 80, 120, 200, 300]);
  });

  it("sorts numerically descending", () => {
    const result = sortRows(data, columns, { key: "views", direction: "desc" });
    expect(result.map((r) => r.views)).toEqual([300, 200, 120, 80, 50]);
  });

  it("sorts strings ascending", () => {
    const result = sortRows(data, columns, { key: "name", direction: "asc" });
    expect(result.map((r) => r.name)).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
      "Delta",
      "Echo",
    ]);
  });

  it("ignores unknown sort keys", () => {
    expect(sortRows(data, columns, { key: "missing", direction: "asc" })).toBe(
      data,
    );
  });

  it("does not mutate the input array", () => {
    const snapshot = [...data];
    sortRows(data, columns, { key: "views", direction: "desc" });
    expect(data).toEqual(snapshot);
  });
});

describe("paginateRows", () => {
  it("returns the correct slice for the first page", () => {
    const result = paginateRows(data, 0, 2);
    expect(result.rows).toEqual(data.slice(0, 2));
    expect(result.totalPages).toBe(3);
    expect(result.page).toBe(0);
  });

  it("returns the correct slice for an intermediate page", () => {
    const result = paginateRows(data, 1, 2);
    expect(result.rows).toEqual(data.slice(2, 4));
    expect(result.page).toBe(1);
  });

  it("returns the correct slice for the last partial page", () => {
    const result = paginateRows(data, 2, 2);
    expect(result.rows).toEqual(data.slice(4, 5));
    expect(result.rows.length).toBe(1);
  });

  it("clamps page index to valid range", () => {
    expect(paginateRows(data, 99, 2).page).toBe(2);
    expect(paginateRows(data, -5, 2).page).toBe(0);
  });

  it("handles empty data", () => {
    const result = paginateRows<Row>([], 0, 10);
    expect(result.rows).toEqual([]);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(0);
  });
});
