// Row shapes mirroring schema.sql. Field names stay snake_case to match what
// Supabase returns, so Step 2 can swap dummy data for real queries unchanged.

export type Reserve = {
  id: string;
  name: string;
  org: string | null;
  province: string | null;
  lat: number | null;
  lng: number | null;
};

export type Stamp = {
  id: string;
  user_id: string;
  reserve_id: string;
  photo_url: string;
  write_up: string | null;
  visited_at: string; // ISO timestamp
  capture_lat: number | null;
  capture_lng: number | null;
  is_public: boolean;
};
