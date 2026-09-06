-- TABEL KATEGORI
create table if not exists kategori (
  id bigint generated always as identity primary key,
  nama_kategori text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- TABEL PRODUK (relasi ke kategori lewat id_kategori)
create table if not exists produk (
  id bigint generated always as identity primary key,
  id_kategori bigint not null references kategori(id) on delete restrict,
  nama_produk text not null,
  harga integer not null check (harga >= 0),
  gambar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- AKTIFKAN ROW LEVEL SECURITY
alter table kategori enable row level security;
alter table produk enable row level security;

-- KEBIJAKAN AKSES: untuk latihan, semua orang (anon) boleh baca & kelola data
-- CATATAN: ini longgar/tidak aman untuk aplikasi produksi sungguhan,
-- tapi cukup untuk kebutuhan latihan uji kompetensi (tanpa sistem login).
create policy "Publik boleh baca kategori" on kategori
  for select using (true);
create policy "Publik boleh kelola kategori" on kategori
  for all using (true) with check (true);

create policy "Publik boleh baca produk" on produk
  for select using (true);
create policy "Publik boleh kelola produk" on produk
  for all using (true) with check (true);

-- SEED DATA KATEGORI
insert into kategori (nama_kategori) values
  ('Syal'),
  ('Topi'),
  ('Tas')
on conflict (nama_kategori) do nothing;

-- SEED DATA PRODUK (6 produk default, merujuk id_kategori sesuai nama di atas)
insert into produk (id_kategori, nama_produk, harga, gambar)
select k.id, v.nama_produk, v.harga, v.gambar
from (values
  ('Syal', 'Syal Rajut Wol', 85000, 'img/produk/syal-rajut-wol.jpg'),
  ('Syal', 'Syal Motif Bunga', 95000, 'img/produk/syal-motif-bunga.jpg'),
  ('Topi', 'Topi Beanie Rajut', 65000, 'img/produk/topi-beanie-rajut.jpg'),
  ('Topi', 'Topi Pom-pom', 75000, 'img/produk/topi-pom-pom.jpg'),
  ('Tas', 'Tas Rajut Serut', 120000, 'img/produk/tas-rajut-serut.jpg'),
  ('Tas', 'Tas Selempang Rajut', 135000, 'img/produk/tas-selempang-rajut.jpg')
) as v(nama_kategori, nama_produk, harga, gambar)
join kategori k on k.nama_kategori = v.nama_kategori;
    