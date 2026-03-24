import type {
  ParkingLot,
  ParkingLotWithDistance,
  ParkingSpot,
  Building,
  LotBuildingDistance,
  SimulatorState,
  WhatIfScenarioRequest,
  DayArrivalPlanResponse,
  PredictionMode,
} from "./types";

export const api = {
  get: <T>(path: string, token?: string) =>
    request<T>(path, { method: "GET", token }),

  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body), token }),

  patch: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body), token }),

  delete: (path: string, token?: string) =>
    request<void>(path, { method: "DELETE", token }),

  // ----------------------------
  // Lots
  // ----------------------------
  getLots: (buildingId?: string, token?: string) => {
    const query = buildingId ? `?buildingId=${encodeURIComponent(buildingId)}` : "";
    return request<ParkingLotWithDistance[]>(`/api/parking-lots${query}`, {
      method: "GET",
      token,
    });
  },

  getLotById: (lotId: string, token?: string) =>
    request<ParkingLot>(`/api/parking-lots/${encodeURIComponent(lotId)}`, {
      method: "GET",
      token,
    }),

  getLotSpots: (lotId: string, token?: string) =>
    request<ParkingSpot[]>(`/api/parking-lots/${encodeURIComponent(lotId)}/spots`, {
      method: "GET",
      token,
    }),

  // ----------------------------
  // Buildings
  // ----------------------------
  getBuildings: (token?: string) =>
    request<Building[]>(`/api/buildings`, {
      method: "GET",
      token,
    }),

  getLotBuildingDistances: (lotId: string, token?: string) =>
    request<LotBuildingDistance[]>(
      `/api/parking-lots/${encodeURIComponent(lotId)}/building-distances`,
      {
        method: "GET",
        token,
      }
    ),

  // ----------------------------
  // Simulator / scenario state
  // ----------------------------
  getSimulatorState: (token?: string) =>
    request<SimulatorState>(`/api/simulator/state`, {
      method: "GET",
      token,
    }),

  applyScenario: (date: string, time: string, token?: string) =>
    request<SimulatorState>(`/api/parking-spots/apply-scenario`, {
      method: "POST",
      body: JSON.stringify({ date, time }),
      token,
    }),

  applyLive: (token?: string) =>
    request<SimulatorState>(`/api/parking-spots/apply-live`, {
      method: "POST",
      body: JSON.stringify({}),
      token,
    }),

  toggleSimulationPause: (paused: boolean, token?: string) =>
    request<SimulatorState>(`/api/simulator/state`, {
      method: "PATCH",
      body: JSON.stringify({ paused }),
      token,
    }),

  // ----------------------------
  // What-if / recommendation
  // ----------------------------
  getWhatIfRecommendation: (payload: WhatIfScenarioRequest, token?: string) =>
    request<DayArrivalPlanResponse>(`/api/users/me/arrival-recommendation/what-if`, {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    }),

  getDayArrivalPlan: (date: string, token?: string) =>
    request<DayArrivalPlanResponse>(
      `/api/users/me/arrival-recommendation?date=${encodeURIComponent(date)}`,
      {
        method: "GET",
        token,
      }
    ),

  // ----------------------------
  // Prediction / forecasting
  // ----------------------------
  getPredictedLots: (
    params: {
      buildingId?: string;
      predictionMode?: string;
      date?: string;
      time?: string;
    },
    token?: string
  ) => {
    const search = new URLSearchParams();
    if (params.buildingId) search.set("buildingId", params.buildingId);
    if (params.predictionMode) search.set("predictionMode", params.predictionMode);
    if (params.date) search.set("date", params.date);
    if (params.time) search.set("time", params.time);

    const query = search.toString() ? `?${search.toString()}` : "";
    return request<ParkingLotWithDistance[]>(`/api/predictions/lots${query}`, {
      method: "GET",
      token,
    });
  },

  // ----------------------------
  // Walking route
  // ----------------------------
  getWalkingRoute: (
    lotId: string,
    buildingId: string,
    token?: string
  ) =>
    request<LotBuildingDistance>(
      `/api/routes/walking?lotId=${encodeURIComponent(lotId)}&buildingId=${encodeURIComponent(buildingId)}`,
      {
        method: "GET",
        token,
      }
    ),
};
