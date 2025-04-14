import { NextResponse } from "next/server";

const TICKS_PER_YEAR = 35040;
const TICKS_PER_DAY = 96;

const ARRIVAL_PROBABILITIES_PER_HOUR = [
  // 0-1
  0.0094,
  // 1-2
  0.0094,
  // 2-3
  0.0094,
  // 3-4
  0.0094,
  // 4-5
  0.0094,
  // 5-6
  0.0094,
  // 6-7
  0.0094,
  // 7-8
  0.0094,
  // 8-9
  0.0283,
  // 9-10
  0.0283,
  // 10-11
  0.0566,
  // 11-12
  0.0566,
  // 12-13
  0.0566,
  // 13-14
  0.0755,
  // 14-15
  0.0755,
  // 15-16
  0.0755,
  // 16-17
  0.1038,
  // 17-18
  0.1038,
  // 18-19
  0.1038,
  // 19-20
  0.0472,
  // 20-21
  0.0472,
  // 21-22
  0.0472,
  // 22-23
  0.0094,
  // 23-0
  0.0094,
] as const satisfies readonly number[];

const DEMAND_PROBABILITIES = [
  { prob: 0.3431, km: 0 },
  { prob: 0.049, km: 5 },
  { prob: 0.098, km: 10 },
  { prob: 0.1176, km: 20 },
  { prob: 0.0882, km: 30 },
  { prob: 0.1176, km: 50 },
  { prob: 0.1078, km: 100 },
  { prob: 0.049, km: 200 },
  { prob: 0.0294, km: 300 },
] as const satisfies readonly { prob: number; km: number }[];

export interface SimulationRouteGetResponseJsonData {
  totalEnergyKWh: number;
  theoreticalMaxPowerDemandKW: number;
  actualMaxPowerDemandKW: number;
  concurrencyFactor: number;
  // This is too much to send back.
  kWhPerTick: number[];
  kWhPerChargepoint: number[];
}

export interface SimulationRouteGetResponseJson {
  data: SimulationRouteGetResponseJsonData;
}

const getRandomDemand = () => {
  const rand = Math.random();
  let cumulative = 0;

  for (const p of DEMAND_PROBABILITIES) {
    cumulative += p.prob;
    if (rand <= cumulative) {
      return p.km;
    }
  }

  return getRandomDemand();
};

// Very unoptimized.
const calculate = (options: {
  chargepoints: number;
  arrivalProbabilityMultiplierPercentage: number;
  evConsumptionPer100kmKWh: number;
  chargingPowerPerChargepointKW: number;
}) => {
  const chargerDetails = Array.from({ length: options.chargepoints }, () => ({
    chargingTicksRemaining: null,
  })) as {
    chargingTicksRemaining: null | number;
  }[];
  const kWhPerTick = Array.from({
    length: TICKS_PER_YEAR,
  }).fill(0) as number[];
  const kWhPerChargepoint = Array.from({
    length: options.chargepoints,
  }).fill(0) as number[];
  let actualMaxPowerDemandKW = 0;
  for (let tick = 0; tick < TICKS_PER_YEAR; tick++) {
    console.debug(`Tick ${tick}:`);

    const arrivalProb =
      ARRIVAL_PROBABILITIES_PER_HOUR[Math.floor((tick % TICKS_PER_DAY) / 4)] *
      (options.arrivalProbabilityMultiplierPercentage / 100);

    const availableChargersIdxs = [];
    for (let chargerIdx = 0; chargerIdx < chargerDetails.length; chargerIdx++) {
      const { chargingTicksRemaining } = chargerDetails[chargerIdx];
      if (!chargingTicksRemaining) {
        availableChargersIdxs.push(chargerIdx);
      }
    }

    for (const chargerIdx of availableChargersIdxs) {
      if (Math.random() > arrivalProb) {
        continue;
      }

      const km = getRandomDemand();
      if (km === 0) {
        continue;
      }

      const hoursNeededToCharge =
        ((options.evConsumptionPer100kmKWh / 100) * km) /
        options.chargingPowerPerChargepointKW;
      const ticksNeeded = Math.ceil((hoursNeededToCharge * 60) / 15);
      chargerDetails[chargerIdx].chargingTicksRemaining = ticksNeeded;
      console.debug(
        `  Charger ${chargerIdx} |`,
        "EV needs charge for",
        `${km}km.`,
        "Charging for",
        ticksNeeded,
        "ticks."
      );
    }

    let tickPowerDemandKW = 0;
    for (let chargerIdx = 0; chargerIdx < chargerDetails.length; chargerIdx++) {
      const { chargingTicksRemaining } = chargerDetails[chargerIdx];
      if (chargingTicksRemaining && chargingTicksRemaining > 0) {
        console.debug(
          `  Charger ${chargerIdx} |`,
          "EV still requires",
          chargingTicksRemaining,
          "ticks to be fully charged."
        );
        kWhPerTick[tick] += options.chargingPowerPerChargepointKW / 4;
        kWhPerChargepoint[chargerIdx] +=
          options.chargingPowerPerChargepointKW / 4;
        tickPowerDemandKW += options.chargingPowerPerChargepointKW;
        if (chargerDetails[chargerIdx].chargingTicksRemaining) {
          chargerDetails[chargerIdx].chargingTicksRemaining!--;
        }
      }
      if (chargerDetails[chargerIdx].chargingTicksRemaining === 0) {
        console.debug(`  Charger ${chargerIdx} |`, "EV disconnected.");
        chargerDetails[chargerIdx].chargingTicksRemaining = null;
      }
    }
    if (tickPowerDemandKW > actualMaxPowerDemandKW) {
      actualMaxPowerDemandKW = tickPowerDemandKW;
    }
  }

  const theoreticalMaxPowerDemandKW =
    options.chargepoints * options.chargingPowerPerChargepointKW;
  return {
    totalEnergyKWh: kWhPerTick.reduce((sum, c) => sum + c, 0),
    theoreticalMaxPowerDemandKW,
    actualMaxPowerDemandKW: actualMaxPowerDemandKW,
    concurrencyFactor: actualMaxPowerDemandKW / theoreticalMaxPowerDemandKW,
    kWhPerTick,
    kWhPerChargepoint,
  };
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const chargepoints = parseInt(url.searchParams.get("chargepoints") || "20");
  const arrivalProbabilityMultiplierPercentage = parseInt(
    url.searchParams.get("arrivalProbabilityMultiplierPercentage") || "100"
  );
  const evConsumptionPer100kmKWh = parseInt(
    url.searchParams.get("evConsumptionPer100kmKWh") || "18"
  );
  const chargingPowerPerChargepointKW = parseInt(
    url.searchParams.get("chargingPowerPerChargepointKW") || "11"
  );

  const simulationResult = calculate({
    chargepoints,
    arrivalProbabilityMultiplierPercentage,
    evConsumptionPer100kmKWh,
    chargingPowerPerChargepointKW,
  });
  return NextResponse.json({
    data: simulationResult,
  } satisfies SimulationRouteGetResponseJson);
}
