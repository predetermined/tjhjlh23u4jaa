"use client";

import { useCallback, useEffect, useState } from "react";
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
import { twMerge } from "tailwind-merge";
import type {
  SimulationRouteGetResponseJson,
  SimulationRouteGetResponseJsonData,
} from "./api/simulation/route";

interface Inputs {
  chargepoints: number;
  arrivalProbabilityMultiplierPercentage: number;
  evConsumptionPer100kmKWh: number;
  chargingPowerPerChargepointKW: number;
}

interface ChartDataEntry {
  name: string;
  value: number;
}

const DEFAULT_INPUTS = {
  chargepoints: 20,
  arrivalProbabilityMultiplierPercentage: 100,
  evConsumptionPer100kmKWh: 18,
  chargingPowerPerChargepointKW: 11,
} as const satisfies Inputs;

const TICKS_PER_WEEK = 672;
const TICKS_PER_MONTH = 2976;

const LoadingText = (props: { className?: string }) => {
  return (
    <div
      className={twMerge(
        "flex items-center justify-center rounded",
        props.className
      )}
    >
      <p className="animate-pulse italic">Loading...</p>
    </div>
  );
};

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyChartData, setWeeklyChartData] = useState<ChartDataEntry[]>([]);
  const [aggregatedMonthlyChartData, setAggregatedMonthlyChartData] = useState<
    ChartDataEntry[]
  >([]);
  const [chargepointsChartData, setChargepointsChartData] = useState<
    ChartDataEntry[]
  >([]);
  const [firstDayChartData, setFirstDayChartData] = useState<ChartDataEntry[]>(
    []
  );

  const setChartsData = (data: SimulationRouteGetResponseJsonData) => {
    const weeklyChartData: ChartDataEntry[] = [];
    for (let i = 0; i < 52; i++) {
      const weeklyConsumptionKWh = data.kWhPerTick
        .slice(i * TICKS_PER_WEEK, i * TICKS_PER_WEEK + TICKS_PER_WEEK)
        .reduce((sum, c) => sum + c);

      weeklyChartData[i] = {
        name: `Week ${i + 1}`,
        value: weeklyConsumptionKWh,
      };
    }
    setWeeklyChartData(weeklyChartData);

    const monthlyChartData: ChartDataEntry[] = [];
    for (let i = 0; i < 12; i++) {
      const consumptionKWh = data.kWhPerTick
        .slice(i * TICKS_PER_MONTH, i * TICKS_PER_MONTH + TICKS_PER_MONTH)
        .reduce((sum, c) => sum + c);

      monthlyChartData[i] = {
        name: `Month ${i + 1}`,
        value: (monthlyChartData.at(i - 1)?.value ?? 0) + consumptionKWh,
      };
    }
    setAggregatedMonthlyChartData(monthlyChartData);

    const chargepointsChartData: ChartDataEntry[] = [];
    for (let i = 0; i < data.kWhPerChargepoint.length; i++) {
      chargepointsChartData.push({
        name: `Chargepoint ${i + 1}`,
        value: data.kWhPerChargepoint[i],
      });
    }
    setChargepointsChartData(chargepointsChartData);

    const firstDayChartData: ChartDataEntry[] = [];
    for (let i = 0; i < 24; i++) {
      firstDayChartData.push({
        name: `${i}:00 - ${i + 1}:00`,
        value: data.kWhPerTick
          .slice(i * 4, i * 4 + 4)
          .reduce((sum, c) => sum + c),
      });
    }
    setFirstDayChartData(firstDayChartData);
  };

  const simulate = useCallback(async (inputs: Inputs) => {
    setIsLoading(true);
    const res = await fetch(
      `/api/simulation?${new URLSearchParams({
        chargepoints: String(inputs.chargepoints),
        arrivalProbabilityMultiplierPercentage: String(
          inputs.arrivalProbabilityMultiplierPercentage
        ),
        evConsumptionPer100kmKWh: String(inputs.evConsumptionPer100kmKWh),
        chargingPowerPerChargepointKW: String(
          inputs.chargingPowerPerChargepointKW
        ),
      })}`
    );
    const json = (await res.json()) as SimulationRouteGetResponseJson;
    console.debug(`Received simulate response data`, json.data);

    setChartsData(json.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    simulate(DEFAULT_INPUTS);
  }, [simulate]);

  return (
    <div className="min-h-screen flex items-center p-8">
      <div className="border border-neutral-200 rounded w-full flex p-6">
        <div className="grid grid-cols-2 gap-4 flex-1">
          <div className="bg-gray-100 p-4 rounded-sm border border-neutral-200">
            <h3 className="italic text-xs mb-1">
              Aggregated consumption (kWh)
            </h3>
            {isLoading ? (
              <LoadingText className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={aggregatedMonthlyChartData}
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
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                  />
                  <Tooltip />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-gray-100 p-4 rounded-sm border border-neutral-200">
            <h3 className="italic text-xs mb-1">Consumption per week (kWh)</h3>
            {isLoading ? (
              <LoadingText className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  className=""
                  height={300}
                  data={weeklyChartData}
                  width={500}
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
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                  />
                  <Tooltip />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-gray-100 p-4 rounded-sm border border-neutral-200 flex-1">
            <h3 className="italic text-xs mb-1">
              Consumption per chargepoint (kWh)
            </h3>
            {isLoading ? (
              <LoadingText className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  className=""
                  height={300}
                  data={chargepointsChartData}
                  width={500}
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
                  <Bar
                    type="monotone"
                    dataKey="value"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                  />
                  <Tooltip />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-gray-100 p-4 rounded-sm border border-neutral-200">
            <h3 className="italic text-xs mb-1">
              Consumption per hour on the first day (kWh)
            </h3>
            {isLoading ? (
              <LoadingText className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  className=""
                  height={300}
                  data={firstDayChartData}
                  width={500}
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
                  <Bar
                    type="monotone"
                    dataKey="value"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                  />
                  <Tooltip />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const chargepoints = parseInt(
              formData.get("chargepoints") as string
            );
            const arrivalProbabilityMultiplierPercentage = parseInt(
              formData.get("arrivalProbabilityMultiplierPercentage") as string
            );
            const evConsumptionPer100kmKWh = parseInt(
              formData.get("evConsumptionPer100kmKWh") as string
            );
            const chargingPowerPerChargepointKW = parseInt(
              formData.get("chargingPowerPerChargepointKW") as string
            );
            simulate({
              chargepoints,
              arrivalProbabilityMultiplierPercentage,
              evConsumptionPer100kmKWh,
              chargingPowerPerChargepointKW,
            });
          }}
          className="p-4 rounded-sm bg-gray-100 border border-neutral-200 ml-4 w-[40rem]"
        >
          <h2 className="text-xl font-semibold mb-1">Inputs</h2>

          <div className="grid grid-cols-2 gap-4">
            <label>
              <span className="block mb-0.5">Chargepoints</span>
              <input
                name="chargepoints"
                type="number"
                defaultValue={DEFAULT_INPUTS.chargepoints}
                className="bg-white rounded py-1 px-2 w-full"
              />
            </label>

            <label>
              <span className="block mb-0.5">
                Arrival probability multiplier (%)
              </span>
              <input
                name="arrivalProbabilityMultiplierPercentage"
                type="number"
                defaultValue={
                  DEFAULT_INPUTS.arrivalProbabilityMultiplierPercentage
                }
                className="bg-white rounded py-1 px-2 w-full"
                min={20}
                max={200}
              />
            </label>

            <label>
              <span className="block mb-0.5">
                EV consumption per 100km (kWh)
              </span>
              <input
                name="evConsumptionPer100kmKWh"
                type="number"
                defaultValue={DEFAULT_INPUTS.evConsumptionPer100kmKWh}
                className="bg-white rounded py-1 px-2 w-full"
              />
            </label>

            <label>
              <span className="block mb-0.5">
                Charging power per chargepoint (kW)
              </span>
              <input
                name="chargingPowerPerChargepointKW"
                type="number"
                defaultValue={DEFAULT_INPUTS.chargingPowerPerChargepointKW}
                className="bg-white rounded py-1 px-2 w-full"
              />
            </label>
          </div>

          <button
            type="submit"
            className="mt-4 p-2 rounded bg-gray-800 block w-full text-white disabled:opacity-50"
            disabled={isLoading}
          >
            Update simulation
          </button>
        </form>
      </div>
    </div>
  );
}
