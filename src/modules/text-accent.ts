import { Resize } from "@/lib/subs";
import { onDestroy } from "./_";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

function getSpanRects(spans: HTMLSpanElement[], element: HTMLElement): Rect[] {
  const elementRect = element.getBoundingClientRect();
  return spans.map((span) => {
    const spanRect = span.getBoundingClientRect();
    return {
      x: spanRect.left - elementRect.left,
      y: spanRect.top - elementRect.top,
      width: spanRect.width,
      height: spanRect.height,
    };
  });
}

function getRectCorners(rect: Rect): Point[] {
  return [
    { x: rect.x, y: rect.y }, // top-left
    { x: rect.x + rect.width, y: rect.y }, // top-right
    { x: rect.x + rect.width, y: rect.y + rect.height }, // bottom-right
    { x: rect.x, y: rect.y + rect.height }, // bottom-left
  ];
}

function isPointInsideRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function isPointInsideAnyRect(point: Point, rects: Rect[]): boolean {
  return rects.some((rect) => isPointInsideRect(point, rect));
}

function getRectIntersectionPoints(rect1: Rect, rect2: Rect): Point[] {
  const intersections: Point[] = [];
  const seen = new Set<string>();

  function getKey(p: Point): string {
    return `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
  }

  function addPoint(p: Point) {
    const key = getKey(p);
    if (!seen.has(key)) {
      intersections.push(p);
      seen.add(key);
    }
  }

  // Get all corners of both rectangles
  const corners1 = getRectCorners(rect1);
  const corners2 = getRectCorners(rect2);

  // Only check for actual edge intersections (not corners inside rectangles)
  const edges1 = [
    { start: corners1[0], end: corners1[1] }, // top
    { start: corners1[1], end: corners1[2] }, // right
    { start: corners1[2], end: corners1[3] }, // bottom
    { start: corners1[3], end: corners1[0] }, // left
  ];

  const edges2 = [
    { start: corners2[0], end: corners2[1] }, // top
    { start: corners2[1], end: corners2[2] }, // right
    { start: corners2[2], end: corners2[3] }, // bottom
    { start: corners2[3], end: corners2[0] }, // left
  ];

  // Check intersections between edges (only actual crossings, not endpoints)
  edges1.forEach((e1) => {
    edges2.forEach((e2) => {
      // Check if edges intersect (one horizontal, one vertical)
      const e1Horizontal = Math.abs(e1.start.y - e1.end.y) < 0.001;
      const e2Horizontal = Math.abs(e2.start.y - e2.end.y) < 0.001;

      if (e1Horizontal !== e2Horizontal) {
        const hEdge = e1Horizontal ? e1 : e2;
        const vEdge = e1Horizontal ? e2 : e1;

        const x = vEdge.start.x;
        const y = hEdge.start.y;

        const hMin = Math.min(hEdge.start.x, hEdge.end.x);
        const hMax = Math.max(hEdge.start.x, hEdge.end.x);
        const vMin = Math.min(vEdge.start.y, vEdge.end.y);
        const vMax = Math.max(vEdge.start.y, vEdge.end.y);

        // Check if edges actually cross (not just touch at endpoints)
        const epsilon = 0.001;
        const isOnHEdgeStart = Math.abs(x - hEdge.start.x) < epsilon;
        const isOnHEdgeEnd = Math.abs(x - hEdge.end.x) < epsilon;
        const isOnVEdgeStart = Math.abs(y - vEdge.start.y) < epsilon;
        const isOnVEdgeEnd = Math.abs(y - vEdge.end.y) < epsilon;

        // Only add if it's a true intersection (not an endpoint)
        if (
          x > hMin + epsilon &&
          x < hMax - epsilon &&
          y > vMin + epsilon &&
          y < vMax - epsilon
        ) {
          addPoint({ x, y });
        }
      }
    });
  });

  return intersections;
}

function getAllIntersectionPoints(rects: Rect[]): Point[] {
  const allIntersections: Point[] = [];
  const seen = new Set<string>();

  function getKey(p: Point): string {
    return `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
  }

  function addPoint(p: Point) {
    const key = getKey(p);
    if (!seen.has(key)) {
      allIntersections.push(p);
      seen.add(key);
    }
  }

  // Check intersections between all pairs of rectangles
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const intersections = getRectIntersectionPoints(rects[i], rects[j]);
      intersections.forEach((p) => addPoint(p));
    }
  }

  return allIntersections;
}

type PointGraph = Map<string, Point[]>;

function buildUnionBoundaryGraph(rects: Rect[]): {
  graph: PointGraph;
  points: Map<string, Point>;
} {
  const xCoords = new Set<number>();
  const yCoords = new Set<number>();

  rects.forEach((rect) => {
    xCoords.add(rect.x);
    xCoords.add(rect.x + rect.width);
    yCoords.add(rect.y);
    yCoords.add(rect.y + rect.height);
  });

  const sortedX = Array.from(xCoords).sort((a, b) => a - b);
  const sortedY = Array.from(yCoords).sort((a, b) => a - b);

  const xSegments = sortedX.length - 1;
  const ySegments = sortedY.length - 1;

  if (xSegments <= 0 || ySegments <= 0) {
    return { graph: new Map(), points: new Map() };
  }

  const inside: boolean[][] = [];

  for (let yi = 0; yi < ySegments; yi++) {
    inside[yi] = [];
    const yMid = (sortedY[yi] + sortedY[yi + 1]) / 2;
    for (let xi = 0; xi < xSegments; xi++) {
      const xMid = (sortedX[xi] + sortedX[xi + 1]) / 2;
      const point = { x: xMid, y: yMid };
      inside[yi][xi] = isPointInsideAnyRect(point, rects);
    }
  }

  const graph: PointGraph = new Map();
  const points = new Map<string, Point>();

  function getKey(p: Point) {
    return `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
  }

  function addEdge(p1: Point, p2: Point) {
    const key1 = getKey(p1);
    const key2 = getKey(p2);

    if (!graph.has(key1)) {
      graph.set(key1, []);
      points.set(key1, p1);
    }
    if (!graph.has(key2)) {
      graph.set(key2, []);
      points.set(key2, p2);
    }

    graph.get(key1)!.push(p2);
    graph.get(key2)!.push(p1);
  }

  for (let yi = 0; yi < ySegments; yi++) {
    for (let xi = 0; xi < xSegments; xi++) {
      if (!inside[yi][xi]) continue;

      const xLeft = sortedX[xi];
      const xRight = sortedX[xi + 1];
      const yTop = sortedY[yi];
      const yBottom = sortedY[yi + 1];

      // Left edge
      if (xi === 0 || !inside[yi][xi - 1]) {
        addEdge({ x: xLeft, y: yTop }, { x: xLeft, y: yBottom });
      }

      // Right edge
      if (xi === xSegments - 1 || !inside[yi][xi + 1]) {
        addEdge({ x: xRight, y: yTop }, { x: xRight, y: yBottom });
      }

      // Top edge
      if (yi === 0 || !inside[yi - 1]?.[xi]) {
        addEdge({ x: xLeft, y: yTop }, { x: xRight, y: yTop });
      }

      // Bottom edge
      if (yi === ySegments - 1 || !inside[yi + 1]?.[xi]) {
        addEdge({ x: xLeft, y: yBottom }, { x: xRight, y: yBottom });
      }
    }
  }

  return { graph, points };
}

function getUnionOutlines(rects: Rect[]): Point[][] {
  if (rects.length === 0) return [];

  const { graph, points } = buildUnionBoundaryGraph(rects);
  const outlines: Point[][] = [];
  const visitedEdges = new Set<string>();

  function getKey(p: Point) {
    return `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
  }

  function edgeKey(a: Point, b: Point) {
    const keyA = getKey(a);
    const keyB = getKey(b);
    return keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;
  }

  for (const [startKey, neighbors] of graph.entries()) {
    const startPoint = points.get(startKey)!;

    for (const neighbor of neighbors) {
      const eKey = edgeKey(startPoint, neighbor);
      if (visitedEdges.has(eKey)) continue;

      const path: Point[] = [startPoint];
      visitedEdges.add(eKey);

      let current = neighbor;
      let prev = startPoint;
      let safety = 0;

      while (safety < 10000) {
        safety++;
        path.push(current);

        if (
          Math.abs(current.x - startPoint.x) < 0.001 &&
          Math.abs(current.y - startPoint.y) < 0.001 &&
          path.length > 2
        ) {
          break;
        }

        const currentKey = getKey(current);
        const nextCandidates = (graph.get(currentKey) || []).filter(
          (candidate) =>
            !(
              Math.abs(candidate.x - prev.x) < 0.001 &&
              Math.abs(candidate.y - prev.y) < 0.001
            )
        );

        let next: Point | null = null;
        for (const candidate of nextCandidates) {
          const candidateEdgeKey = edgeKey(current, candidate);
          if (!visitedEdges.has(candidateEdgeKey)) {
            visitedEdges.add(candidateEdgeKey);
            next = candidate;
            break;
          }
        }

        if (!next) {
          break;
        }

        prev = current;
        current = next;
      }

      if (path.length > 2) {
        const first = path[0];
        const last = path[path.length - 1];
        if (
          Math.abs(first.x - last.x) > 0.001 ||
          Math.abs(first.y - last.y) > 0.001
        ) {
          path.push(first);
        }
        outlines.push(path);
      }
    }
  }

  return outlines;
}

function drawIntersectionPoints(
  context: CanvasRenderingContext2D,
  points: Point[]
) {
  context.fillStyle = "rgba(0, 128, 0, 0.15)"; // Very faded green
  points.forEach((point) => {
    context.beginPath();
    context.arc(point.x, point.y, 6, 0, Math.PI * 2);
    context.fill();
  });
}

function drawUnionOutlines(
  context: CanvasRenderingContext2D,
  outlines: Point[][]
) {
  outlines.forEach((outline) => {
    if (outline.length < 2) return;
    context.beginPath();
    context.moveTo(outline[0].x, outline[0].y);

    for (let i = 1; i < outline.length; i++) {
      context.lineTo(outline[i].x, outline[i].y);
    }

    context.closePath();
    context.strokeStyle = "blue";
    context.lineWidth = 3;
    context.stroke();
  });
}

function drawRectOutline(context: CanvasRenderingContext2D, rect: Rect) {
  const corners = getRectCorners(rect);

  context.beginPath();
  context.moveTo(corners[0].x, corners[0].y);

  for (let i = 1; i < corners.length; i++) {
    context.lineTo(corners[i].x, corners[i].y);
  }

  context.closePath();
  context.strokeStyle = "red";
  context.lineWidth = 2;
  context.stroke();
}

function drawCanvas(element: HTMLElement, canvas: HTMLCanvasElement) {
  const spans = Array.from(element.querySelectorAll<HTMLSpanElement>("span"));

  const rect = element.getBoundingClientRect();
  const deviceRatio = window.devicePixelRatio || 1;
  const padding = 4; // Extra padding to prevent edge clipping
  const width = Math.max(1, Math.round(rect.width + padding * 2));
  const height = Math.max(1, Math.round(rect.height + padding * 2));

  canvas.width = width * deviceRatio;
  canvas.height = height * deviceRatio;

  const context = canvas.getContext("2d");
  if (!context) return;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.scale(deviceRatio, deviceRatio);
  // Clear canvas (transparent background)
  context.clearRect(0, 0, width, height);
  context.translate(padding, padding); // Offset drawing to account for padding

  if (spans.length > 0) {
    const spanRects = getSpanRects(spans, element);
    console.log(`Found ${spanRects.length} spans`);

    // Find and draw intersection points
    const intersectionPoints = getAllIntersectionPoints(spanRects);
    console.log(`Found ${intersectionPoints.length} intersection points`);
    drawIntersectionPoints(context, intersectionPoints);

    // Find and draw union outline
    const unionOutlines = getUnionOutlines(spanRects);
    console.log(`Union outlines: ${unionOutlines.length}`);
    drawUnionOutlines(context, unionOutlines);
  }
}

export default function TextAccent(element: HTMLElement) {
  const spans = Array.from(element.querySelectorAll<HTMLSpanElement>("span"));

  spans.forEach((span) => {
    span.style.backgroundColor = "rgba(0, 0, 255, 0.1)";
  });

  const canvas =
    element.querySelector<HTMLCanvasElement>("canvas[data-text-accent]") ??
    element.insertBefore(document.createElement("canvas"), element.firstChild);

  canvas.dataset.textAccent = "background";
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "-1";

  const computedPosition = window.getComputedStyle(element).position;
  if (computedPosition === "static" || !computedPosition) {
    element.style.position = "relative";
  }

  // Initial draw
  drawCanvas(element, canvas);

  // Subscribe to resize events
  const resizeUnsubscribe = Resize.add(() => {
    drawCanvas(element, canvas);
  });

  // Clean up subscription on destroy
  onDestroy(() => {
    resizeUnsubscribe();
  });
}
