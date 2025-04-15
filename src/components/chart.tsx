import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LoadingText } from "./loading-text";

export enum ChartType {
  Bar = "BAR",
  Area = "AREA",
}

export interface ChartDataEntry {
  name: string;
  value: number;
}

interface ChartProps {
  type: ChartType;
  data: ChartDataEntry[];
  isLoading?: boolean;
}

const CHART_TYPE_COMPONENT_MAP = {
  [ChartType.Bar]: {
    Outer: BarChart,
    Inner: Bar,
  },
  [ChartType.Area]: {
    Outer: AreaChart,
    Inner: Area,
  },
} as const;

export const Chart = (props: ChartProps) => {
  const chartTypeComps = CHART_TYPE_COMPONENT_MAP[props.type];

  return props.isLoading ? (
    <LoadingText className="h-[300px] w-full" />
  ) : (
    <ResponsiveContainer width="100%" height={300}>
      <chartTypeComps.Outer
        data={props.data}
        margin={{
          left: 0,
          right: 0,
          top: 16,
          bottom: 0,
        }}
      >
        <XAxis dataKey="name" className="text-xs" />
        <YAxis className="text-xs" />
        <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
        <chartTypeComps.Inner
          type="monotone"
          dataKey="value"
          stroke="#82ca9d"
          fill="#82ca9d"
        />
        <Tooltip />
      </chartTypeComps.Outer>
    </ResponsiveContainer>
  );
};
