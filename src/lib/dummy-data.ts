// Step 1 placeholder data. Replaced by Supabase reads in Step 2, and the real
// reserves list comes from data/reserves.json (separate seed-data task).
import type { Reserve, Stamp } from './types';

const reserve = (id: string, name: string, org: string, province: string): Reserve => ({
  id,
  name,
  org,
  province,
  lat: null,
  lng: null,
});

export const DUMMY_RESERVES: Reserve[] = [
  reserve('r01', 'Kruger National Park', 'SANParks', 'Limpopo / Mpumalanga'),
  reserve('r02', 'Table Mountain National Park', 'SANParks', 'Western Cape'),
  reserve('r03', 'Addo Elephant National Park', 'SANParks', 'Eastern Cape'),
  reserve('r04', 'Golden Gate Highlands National Park', 'SANParks', 'Free State'),
  reserve('r05', 'Augrabies Falls National Park', 'SANParks', 'Northern Cape'),
  reserve('r06', 'Garden Route National Park', 'SANParks', 'Western Cape'),
  reserve('r07', 'Mountain Zebra National Park', 'SANParks', 'Eastern Cape'),
  reserve('r08', 'West Coast National Park', 'SANParks', 'Western Cape'),
  reserve('r09', 'Cederberg Wilderness Area', 'CapeNature', 'Western Cape'),
  reserve('r10', 'De Hoop Nature Reserve', 'CapeNature', 'Western Cape'),
  reserve('r11', 'Kogelberg Nature Reserve', 'CapeNature', 'Western Cape'),
  reserve('r12', 'Hluhluwe-iMfolozi Park', 'Ezemvelo KZN Wildlife', 'KwaZulu-Natal'),
  reserve('r13', 'Pilanesberg National Park', 'North West Parks', 'North West'),
  reserve('r14', 'Blyde River Canyon Nature Reserve', 'MTPA', 'Mpumalanga'),
  reserve('r15', 'Royal Natal National Park', 'Ezemvelo KZN Wildlife', 'KwaZulu-Natal'),
];

export const DUMMY_USER_ID = 'dummy-user';

const stamp = (id: string, reserveId: string, visitedAt: string, writeUp: string | null): Stamp => ({
  id,
  user_id: DUMMY_USER_ID,
  reserve_id: reserveId,
  photo_url: '',
  write_up: writeUp,
  visited_at: visitedAt,
  capture_lat: null,
  capture_lng: null,
  is_public: false,
});

// Includes a repeat visit (Table Mountain twice) — repeat visits are allowed by design.
export const DUMMY_STAMPS: Stamp[] = [
  stamp('s1', 'r02', '2026-03-14T09:30:00Z', 'Lion’s Head at sunrise. Worth the early alarm.'),
  stamp('s2', 'r02', '2026-08-02T13:00:00Z', null),
  stamp('s3', 'r09', '2026-05-01T16:45:00Z', 'Wolfberg Cracks — tight squeeze, great views.'),
  stamp('s4', 'r01', '2025-12-20T06:10:00Z', 'Leopard on the H4-1 before breakfast!'),
];
