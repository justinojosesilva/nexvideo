import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { KPICard } from "./kpi-card";

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

function findByText(node: ReactNode, text: string): boolean {
  return flatten(node).some((child) => child === text);
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

describe("KPICard", () => {
  it("renders title, value, delta and icon", () => {
    const tree = KPICard({
      title: "Receita",
      value: "R$ 100",
      delta: "+10%",
      icon: <svg data-testid="icon" />,
      variant: "positive",
    });

    expect(findByText(tree, "Receita")).toBe(true);
    expect(findByText(tree, "R$ 100")).toBe(true);
    expect(findByText(tree, "+10%")).toBe(true);
    expect(findByProp(tree, "data-testid", "icon")).toBeTruthy();
  });

  it("exposes the variant via data attribute", () => {
    expect(
      findByProp(
        KPICard({ title: "A", value: "1", delta: "+1", variant: "positive" }),
        "data-variant",
        "positive",
      ),
    ).toBeTruthy();
    expect(
      findByProp(
        KPICard({ title: "A", value: "1", delta: "0", variant: "neutral" }),
        "data-variant",
        "neutral",
      ),
    ).toBeTruthy();
    expect(
      findByProp(
        KPICard({ title: "A", value: "1", delta: "-1", variant: "negative" }),
        "data-variant",
        "negative",
      ),
    ).toBeTruthy();
  });

  it("omits delta block when delta is not provided", () => {
    const tree = KPICard({ title: "A", value: "1" });
    expect(findByProp(tree, "data-variant", "neutral")).toBeFalsy();
  });

  it("defaults variant to neutral", () => {
    const tree = KPICard({ title: "A", value: "1", delta: "0" });
    expect(findByProp(tree, "data-variant", "neutral")).toBeTruthy();
  });

  it("uses the title as accessible label", () => {
    const tree = KPICard({ title: "Receita Mensal", value: "R$ 100" });
    expect(findByProp(tree, "aria-label", "Receita Mensal")).toBeTruthy();
    expect(findByProp(tree, "role", "group")).toBeTruthy();
  });
});
