"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const BRAND = "#4f46e5";
const GOOD = "#059669";
const INK = "#6a7080";

function fmtShort(v: number | string): string {
  if (typeof v === "string") return v;
  return String(Math.round(v * 10) / 10);
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number | string; color?: string }>; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-ink-100 bg-surface px-3 py-2 shadow-pop">
      {label !== undefined && <div className="mb-1 text-[12px] font-semibold text-ink-900">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-[12px] text-ink-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? BRAND }} />
          <span>{p.name}:</span>
          <span className="font-semibold text-ink-900">{fmtShort(Number(p.value ?? 0))}</span>
        </div>
      ))}
    </div>
  );
}

const X_STYLE = { fontSize: 11, fill: "#8a90a0" } as const;

export function TrendAreaChart({
  data,
  keys,
  height = 260,
}: {
  data: Array<Record<string, string | number>>;
  keys: Array<{ key: string; label: string; color?: string }>;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          {keys.map((k, i) => (
            <linearGradient key={k.key} id={`grad-${k.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={k.color ?? (i === 0 ? BRAND : GOOD)} stopOpacity={0.25} />
              <stop offset="100%" stopColor={k.color ?? (i === 0 ? BRAND : GOOD)} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8eaf1" vertical={false} />
        <XAxis dataKey="label" tick={X_STYLE} axisLine={false} tickLine={false} dy={6} />
        <YAxis tick={X_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#d4d8e2" }} />
        {keys.map((k, i) => (
          <Area
            key={k.key}
            type="monotone"
            dataKey={k.key}
            name={k.label}
            stroke={k.color ?? (i === 0 ? BRAND : GOOD)}
            strokeWidth={2.2}
            fill={`url(#grad-${k.key})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function HBarChart({
  data,
  color = BRAND,
  height = 280,
}: {
  data: Array<{ label: string; value: number }>;
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 4 }} barCategoryGap="18%">
        <CartesianGrid strokeDasharray="3 3" stroke="#e8eaf1" horizontal={false} />
        <XAxis type="number" tick={X_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: "#4c5160" }} width={110} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f3f4f9" }} />
        <Bar dataKey="value" name="Обращения" fill={color} radius={[0, 6, 6, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  height = 240,
}: {
  data: Array<{ label: string; value: number; color: string }>;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius="62%"
          outerRadius="88%"
          paddingAngle={3}
          cornerRadius={5}
          strokeWidth={0}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function VBarChart({
  data,
  color = GOOD,
  height = 260,
}: {
  data: Array<{ label: string; value: number }>;
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#e8eaf1" vertical={false} />
        <XAxis dataKey="label" tick={X_STYLE} axisLine={false} tickLine={false} dy={6} />
        <YAxis tick={X_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f3f4f9" }} />
        <Bar dataKey="value" name="Реализовано" fill={color} radius={[6, 6, 0, 0]} maxBarSize={34} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export const CHART_INK = INK;
