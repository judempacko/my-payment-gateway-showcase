'use client';

import type { PaymentStatsTrendPoint } from '@pay/contracts';
import { Activity } from 'lucide-react';
import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';

type Point = { x: number; y: number };

const PADDING = { top: 18, right: 12, bottom: 30, left: 34 };

function clamp(value: number, first: number, second: number): number {
  return Math.min(Math.max(value, Math.min(first, second)), Math.max(first, second));
}

function smoothPath(points: Point[]): string {
  if (points.length === 0) {
    return '';
  }

  if (points.length === 1) {
    return `M ${points[0]?.x ?? 0} ${points[0]?.y ?? 0}`;
  }

  let path = `M ${points[0]?.x ?? 0} ${points[0]?.y ?? 0}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]!;
    const next = points[index + 1]!;
    const previous = points[index - 1] ?? current;
    const after = points[index + 2] ?? next;
    const control1X = clamp(current.x + (next.x - previous.x) / 6, current.x, next.x);
    const control1Y = clamp(current.y + (next.y - previous.y) / 6, current.y, next.y);
    const control2X = clamp(next.x - (after.x - current.x) / 6, current.x, next.x);
    const control2Y = clamp(next.y - (after.y - current.y) / 6, current.y, next.y);

    path += ` C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${next.x} ${next.y}`;
  }

  return path;
}

export function PaymentTrendChart({
  series,
  locale,
  labels,
}: {
  series: PaymentStatsTrendPoint[];
  locale: string;
  labels: {
    chartAria: string;
    empty: string;
    date: string;
    succeeded: string;
    failed: string;
    caption: string;
  };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const gradientId = `trend-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const height = width > 0 && width < 520 ? 236 : 280;

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    const measure = () => setWidth(Math.round(element.getBoundingClientRect().width));
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const hasActivity = series.some((point) => point.succeeded > 0 || point.failed > 0);

  if (!hasActivity) {
    return (
      <div className="mt-6 flex h-[236px] flex-col items-center justify-center gap-2 rounded-2xl bg-fog-white px-6 text-center">
        <Activity className="size-5 text-slate-gray" aria-hidden="true" />
        <p className="text-sm text-slate-gray">{labels.empty}</p>
      </div>
    );
  }

  const innerWidth = Math.max(width - PADDING.left - PADDING.right, 0);
  const innerHeight = height - PADDING.top - PADDING.bottom;
  const rawMax = Math.max(0, ...series.flatMap((point) => [point.succeeded, point.failed]));
  const step = Math.max(1, Math.ceil(rawMax / 4));
  const max = step * 4;
  const xFor = (index: number) =>
    PADDING.left +
    (series.length > 1 ? (index / (series.length - 1)) * innerWidth : innerWidth / 2);
  const yFor = (value: number) => PADDING.top + innerHeight - (value / max) * innerHeight;
  const successPoints = series.map((point, index) => ({
    x: xFor(index),
    y: yFor(point.succeeded),
  }));
  const failedPoints = series.map((point, index) => ({
    x: xFor(index),
    y: yFor(point.failed),
  }));
  const successPath = smoothPath(successPoints);
  const failedPath = smoothPath(failedPoints);
  const areaPath =
    successPoints.length > 1
      ? `${successPath} L ${successPoints.at(-1)?.x ?? 0} ${PADDING.top + innerHeight} L ${
          successPoints[0]?.x ?? 0
        } ${PADDING.top + innerHeight} Z`
      : '';
  const ticks = Array.from({ length: 5 }, (_, index) => step * index);
  const labelEvery = width < 520 ? 2 : series.length > 7 ? 5 : 1;
  const dayLabel = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const fullLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });

  function pointDate(date: string): Date {
    return new Date(`${date}T12:00:00.000Z`);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();

    if (bounds.width === 0 || series.length === 0) {
      return;
    }

    const relative = ((event.clientX - bounds.left) / bounds.width) * width;
    const ratio = Math.min(Math.max((relative - PADDING.left) / innerWidth, 0), 1);
    setHovered(Math.round(ratio * (series.length - 1)));
  }

  const hoveredPoint = hovered === null ? null : series[hovered];
  const hoveredX = hovered === null ? 0 : xFor(hovered);
  const tooltipLeft = Math.min(Math.max(hoveredX, 78), width - 78);
  const tooltipTop = hovered === null ? 0 : Math.max(6, yFor(hoveredPoint?.succeeded ?? 0) - 76);

  return (
    <figure className="mt-6">
      <div ref={containerRef} className="relative w-full" style={{ height }}>
        {width > 0 ? (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={labels.chartAria}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHovered(null)}
            className="touch-pan-y"
          >
            <title>{labels.chartAria}</title>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-status-success)" stopOpacity="0.16" />
                <stop offset="100%" stopColor="var(--color-status-success)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {ticks.map((tick) => {
              const y = yFor(tick);

              return (
                <g key={tick}>
                  <line
                    x1={PADDING.left}
                    x2={width - PADDING.right}
                    y1={y}
                    y2={y}
                    className="stroke-border"
                    strokeWidth={1}
                  />
                  <text
                    x={PADDING.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="text-slate-gray"
                    fill="currentColor"
                    fontSize={11}
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {series.map((point, index) => {
              if (index % labelEvery !== 0 && index !== series.length - 1) {
                return null;
              }

              return (
                <text
                  key={point.date}
                  x={xFor(index)}
                  y={height - 8}
                  textAnchor={
                    index === 0 ? 'start' : index === series.length - 1 ? 'end' : 'middle'
                  }
                  className="text-slate-gray"
                  fill="currentColor"
                  fontSize={11}
                >
                  {dayLabel.format(pointDate(point.date))}
                </text>
              );
            })}

            {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}
            <path
              d={failedPath}
              fill="none"
              className="stroke-status-danger"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={successPath}
              fill="none"
              className="stroke-status-success"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {hovered !== null && hoveredPoint ? (
              <g>
                <line
                  x1={hoveredX}
                  x2={hoveredX}
                  y1={PADDING.top}
                  y2={PADDING.top + innerHeight}
                  className="stroke-slate-gray"
                  strokeWidth={1}
                  strokeDasharray="3 4"
                />
                <circle
                  cx={hoveredX}
                  cy={yFor(hoveredPoint.succeeded)}
                  r={4}
                  className="fill-status-success"
                  stroke="var(--color-paper-white)"
                  strokeWidth={2}
                />
                <circle
                  cx={hoveredX}
                  cy={yFor(hoveredPoint.failed)}
                  r={4}
                  className="fill-status-danger"
                  stroke="var(--color-paper-white)"
                  strokeWidth={2}
                />
              </g>
            ) : null}
          </svg>
        ) : null}

        {hoveredPoint ? (
          <div
            className="pointer-events-none absolute z-10 w-[150px] -translate-x-1/2 rounded-2xl border border-border bg-paper-white px-3 py-2 shadow-subtle"
            style={{ left: tooltipLeft, top: tooltipTop }}
          >
            <p className="text-xs text-slate-gray">
              {fullLabel.format(pointDate(hoveredPoint.date))}
            </p>
            <div className="mt-1.5 space-y-1">
              <p className="flex items-center justify-between gap-2 text-sm text-ink-black">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-status-success" aria-hidden="true" />
                  {labels.succeeded}
                </span>
                <span className="tabular-nums">{hoveredPoint.succeeded}</span>
              </p>
              <p className="flex items-center justify-between gap-2 text-sm text-ink-black">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-status-danger" aria-hidden="true" />
                  {labels.failed}
                </span>
                <span className="tabular-nums">{hoveredPoint.failed}</span>
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <table className="sr-only">
        <caption>{labels.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{labels.date}</th>
            <th scope="col">{labels.succeeded}</th>
            <th scope="col">{labels.failed}</th>
          </tr>
        </thead>
        <tbody>
          {series.map((point) => (
            <tr key={point.date}>
              <th scope="row">{fullLabel.format(pointDate(point.date))}</th>
              <td>{point.succeeded}</td>
              <td>{point.failed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
