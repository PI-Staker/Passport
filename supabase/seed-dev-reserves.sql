-- Development seed: the 15 placeholder reserves used while building.
-- Run in Supabase → SQL Editor. Safe to run more than once (skips names that
-- already exist). The full SANParks / CapeNature / provincial list will come
-- from data/reserves.json via the separate seed-data task.

insert into reserves (name, org, province)
select v.name, v.org, v.province
from (values
  ('Kruger National Park', 'SANParks', 'Limpopo / Mpumalanga'),
  ('Table Mountain National Park', 'SANParks', 'Western Cape'),
  ('Addo Elephant National Park', 'SANParks', 'Eastern Cape'),
  ('Golden Gate Highlands National Park', 'SANParks', 'Free State'),
  ('Augrabies Falls National Park', 'SANParks', 'Northern Cape'),
  ('Garden Route National Park', 'SANParks', 'Western Cape'),
  ('Mountain Zebra National Park', 'SANParks', 'Eastern Cape'),
  ('West Coast National Park', 'SANParks', 'Western Cape'),
  ('Cederberg Wilderness Area', 'CapeNature', 'Western Cape'),
  ('De Hoop Nature Reserve', 'CapeNature', 'Western Cape'),
  ('Kogelberg Nature Reserve', 'CapeNature', 'Western Cape'),
  ('Hluhluwe-iMfolozi Park', 'Ezemvelo KZN Wildlife', 'KwaZulu-Natal'),
  ('Pilanesberg National Park', 'North West Parks', 'North West'),
  ('Blyde River Canyon Nature Reserve', 'MTPA', 'Mpumalanga'),
  ('Royal Natal National Park', 'Ezemvelo KZN Wildlife', 'KwaZulu-Natal')
) as v(name, org, province)
where not exists (select 1 from reserves r where r.name = v.name);
