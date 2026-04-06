export type RoutePoint = {
  orderId: string;
  label: string;
  createdAt: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type RouteStrategy = 'fastest' | 'economic' | 'chronological';

export type RoutingProvider = {
  planRoute(input: { origin: { latitude: number; longitude: number }; points: RoutePoint[]; strategy: RouteStrategy }): Promise<string[]>;
};

export function haversineKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return earthKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function planLocalRoute(input: {
  origin?: { latitude: number; longitude: number } | null;
  points: RoutePoint[];
  strategy: RouteStrategy;
}) {
  const withCoordinates = input.points.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));

  if (input.strategy === 'chronological' || !input.origin || withCoordinates.length !== input.points.length) {
    return [...input.points].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  if (input.strategy === 'economic') {
    return [...input.points].sort((a, b) => {
      const distanceA = haversineKm(input.origin!, { latitude: Number(a.latitude), longitude: Number(a.longitude) });
      const distanceB = haversineKm(input.origin!, { latitude: Number(b.latitude), longitude: Number(b.longitude) });
      return distanceA - distanceB;
    });
  }

  const pending = [...input.points];
  const route: RoutePoint[] = [];
  let current = { ...input.origin };

  while (pending.length) {
    pending.sort((a, b) => {
      const distanceA = haversineKm(current, { latitude: Number(a.latitude), longitude: Number(a.longitude) });
      const distanceB = haversineKm(current, { latitude: Number(b.latitude), longitude: Number(b.longitude) });
      const ageDelta = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return distanceA - distanceB + ageDelta / (1000 * 60 * 60 * 8);
    });

    const next = pending.shift()!;
    route.push(next);
    current = { latitude: Number(next.latitude), longitude: Number(next.longitude) };
  }

  return route;
}
