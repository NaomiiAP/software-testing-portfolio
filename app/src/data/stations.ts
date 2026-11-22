export interface Station {
  code: string;
  name: string;
  city: string;
}

/** Sample network used by the application (codes follow Indian Railways style). */
export const STATIONS: Station[] = [
  { code: 'NDLS', name: 'New Delhi', city: 'Delhi' },
  { code: 'MMCT', name: 'Mumbai Central', city: 'Mumbai' },
  { code: 'CSMT', name: 'Mumbai CSMT', city: 'Mumbai' },
  { code: 'HWH', name: 'Howrah Jn', city: 'Kolkata' },
  { code: 'MAS', name: 'Chennai Central', city: 'Chennai' },
  { code: 'SBC', name: 'KSR Bengaluru', city: 'Bengaluru' },
  { code: 'SC', name: 'Secunderabad Jn', city: 'Hyderabad' },
  { code: 'PUNE', name: 'Pune Jn', city: 'Pune' },
  { code: 'ADI', name: 'Ahmedabad Jn', city: 'Ahmedabad' },
  { code: 'BRC', name: 'Vadodara Jn', city: 'Vadodara' },
  { code: 'JP', name: 'Jaipur Jn', city: 'Jaipur' },
  { code: 'KOTA', name: 'Kota Jn', city: 'Kota' },
  { code: 'LKO', name: 'Lucknow Charbagh', city: 'Lucknow' },
  { code: 'CNB', name: 'Kanpur Central', city: 'Kanpur' },
  { code: 'BPL', name: 'Bhopal Jn', city: 'Bhopal' },
  { code: 'NGP', name: 'Nagpur Jn', city: 'Nagpur' },
  { code: 'MAO', name: 'Madgaon Jn', city: 'Goa' },
  { code: 'ERS', name: 'Ernakulam Jn', city: 'Kochi' },
];

const BY_CODE = new Map(STATIONS.map((s) => [s.code, s]));

export function getStation(code: string): Station | undefined {
  return BY_CODE.get(code);
}

export function stationLabel(code: string): string {
  const s = BY_CODE.get(code);
  return s ? `${s.name} (${s.code})` : code;
}
