import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useSkillGraph } from "@/hooks/useInsights";
import { Skeleton } from "@/components/Skeleton";

interface Node extends d3.SimulationNodeDatum {
  id: string;
  count: number;
}

interface Edge {
  source: string | Node;
  target: string | Node;
  weight: number;
}

export function SkillForceGraph() {
  const { data, isLoading } = useSkillGraph(2);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;
    if (data.nodes.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = 350;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const nodes: Node[] = data.nodes.map((n) => ({ ...n }));
    const edges: Edge[] = data.edges.map((e) => ({ ...e }));

    const maxCount = d3.max(nodes, (d) => d.count) || 1;
    const radiusScale = d3.scaleSqrt().domain([1, maxCount]).range([6, 24]);
    const maxWeight = d3.max(edges, (d) => d.weight) || 1;

    const simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink<Node, Edge>(edges).id((d) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<Node>().radius((d) => radiusScale(d.count) + 4));

    const link = svg
      .append("g")
      .selectAll("line")
      .data(edges)
      .enter()
      .append("line")
      .attr("stroke", "hsl(var(--border))")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d) => Math.max(1, (d.weight / maxWeight) * 4));

    const nodeGroup = svg
      .append("g")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .call(
        d3.drag<SVGGElement, Node>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    nodeGroup
      .append("circle")
      .attr("r", (d) => radiusScale(d.count))
      .attr("fill", "hsl(221, 83%, 53%)")
      .attr("fill-opacity", 0.8)
      .attr("stroke", "hsl(221, 83%, 43%)")
      .attr("stroke-width", 1.5);

    nodeGroup
      .append("text")
      .text((d) => d.id)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => radiusScale(d.count) + 14)
      .attr("font-size", 10)
      .attr("fill", "hsl(var(--muted-foreground))");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as Node).x!)
        .attr("y1", (d) => (d.source as Node).y!)
        .attr("x2", (d) => (d.target as Node).x!)
        .attr("y2", (d) => (d.target as Node).y!);

      nodeGroup.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <Skeleton className="h-5 w-1/3 mb-4" />
        <Skeleton className="h-[350px] w-full" />
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <h3 className="text-base font-semibold mb-4">Skill Co-occurrence Graph</h3>
        <div className="flex h-[350px] items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
          Not enough data to build the graph
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6" ref={containerRef}>
      <h3 className="text-base font-semibold mb-4">Skill Co-occurrence Graph</h3>
      <svg ref={svgRef} className="w-full" style={{ height: 350 }} />
    </div>
  );
}
