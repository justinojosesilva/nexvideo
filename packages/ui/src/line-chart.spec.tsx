import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { LineChart, type LineChartPoint } from "./line-chart";

function flatten(node: ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  Children.forEach(node, (child) => {
    out.push(child);
    if (isValidElement(child)) {
      const props = child.props as { children?: ReactNode };
      if (props.children !== undefined) {
        out.push(...flatten(props.children));
      }
    }
  });
  return out;
}

function findByProp(
  node: ReactNode,
  prop: string,
  value: unknown,
): ReactElement | undefined {
  return flatten(node).find(
    (child) =>
      isValidElement(child) &&
      (child.props as Record<string, unknown>)[prop] === value,
  ) as ReactElement | undefined;
}

function findByText(node: ReactNode, text: string): boolean {
  return flatten(node).some((child) => child === text);
}

const sampleData: LineChartPoint[] = [
  { date: "2026-05-01", views: 100, subs: 10 },
  { date: "2026-05-02", views: 120, subs: 12 },
  { date: "2026-05-03", views: 150, subs: 15 },
];

describe("LineChart", () => {
  it("renders an empty state when data is empty", () => {
    const tree = LineChart({
      ariaLabel: "Vazio",
      data: [],
      series: [{ key: "views" }],
      emptyState: "Nada por aqui",
    });

    expect(findByText(tree, "Nada por aqui")).toBe(true);
    expect(findByProp(tree, "aria-label", "Vazio")).toBeTruthy();
  });

  it("renders a figure with aria-label and screen-reader summary when data is present", () => {
    const tree = LineChart({
      ariaLabel: "Visualizações",
      data: sampleData,
      series: [{ key: "views", label: "Views" }],
    });

    const figure = findByProp(tree, "aria-label", "Visualizações");
    expect(figure).toBeTruthy();
    expect(figure?.type).toBe("figure");

    const summaryHit = flatten(tree).some(
      (n) =>
        typeof n === "string" &&
        n.includes("Gráfico de linhas") &&
        n.includes("1 série(s)") &&
        n.includes("3 ponto(s)"),
    );
    expect(summaryHit).toBe(true);
  });

  it("uses custom aria description when provided", () => {
    const tree = LineChart({
      ariaLabel: "X",
      ariaDescription: "Resumo customizado para leitores de tela",
      data: sampleData,
      series: [{ key: "views" }],
    });

    expect(findByText(tree, "Resumo customizado para leitores de tela")).toBe(true);
  });

  it("invokes renderLegend with resolved series when provided", () => {
    const seen: { key: string; label: string; color: string }[][] = [];
    LineChart({
      ariaLabel: "Legenda custom",
      data: sampleData,
      series: [
        { key: "views", label: "Views", color: "#111" },
        { key: "subs", label: "Subs" },
      ],
      renderLegend: (items) => {
        seen.push(items);
        return null;
      },
    });

    expect(seen.length).toBe(1);
    expect(seen[0]?.[0]).toEqual({
      key: "views",
      label: "Views",
      color: "#111",
    });
    expect(seen[0]?.[1]?.label).toBe("Subs");
    expect(seen[0]?.[1]?.color).toBeTruthy();
  });
});
