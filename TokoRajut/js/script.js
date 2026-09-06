const SUPABASE_URL = 'https://lbalqunwxodkpkgcwmkp.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiYWxxdW53eG9ka3BrZ2N3bWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDgzMjUsImV4cCI6MjEwNDE4NDMyNX0.6L-czMTWnxDCsiPN5rY3Qz3YoQ7IlLpIr8PW4BrPAvk';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

let products = [];
let kategoriMap = {};
let activeCategory = 'Semua';
let searchTerm = '';
let editingId = null;

// ELEMEN DOM
const productGrid = document.getElementById('productGrid');
const emptyMsg = document.getElementById('emptyMsg');
const categoryFilter = document.getElementById('categoryFilter');
const searchInput = document.getElementById('searchInput');

// ELEMEN FORM INLINE
const formContainer = document.getElementById('formContainer');
const toggleFormBtn = document.getElementById('toggleFormBtn');
const closeFormBtn = document.getElementById('closeFormBtn');
const cancelFormBtn = document.getElementById('cancelFormBtn');
const productForm = document.getElementById('productForm');
const formTitle = document.getElementById('formTitle');
const submitFormBtn = document.getElementById('submitFormBtn');

// ELEMEN MODAL DETAIL PRODUK
const detailOverlay = document.getElementById('detailOverlay');
const detailCloseBtn = document.getElementById('detailCloseBtn');
const detailImage = document.getElementById('detailImage');
const detailCategory = document.getElementById('detailCategory');
const detailName = document.getElementById('detailName');
const detailPrice = document.getElementById('detailPrice');
const detailDesc = document.getElementById('detailDesc');

// ELEMEN MODAL KONFIRMASI HAPUS
const deleteOverlay = document.getElementById('deleteOverlay');
const deleteCancelBtn = document.getElementById('deleteCancelBtn');
const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
let pendingDeleteId = null;

function formatRupiah(num) {
  return 'Rp ' + num.toLocaleString('id-ID');
}

// AMBIL DATA KATEGORI (buat pemetaan nama -> id, dipakai saat simpan produk)
async function loadKategori() {
  const { data, error } = await supabaseClient
    .from('kategori')
    .select('id, nama_kategori');
  if (error) {
    console.error('Gagal ambil kategori:', error.message);
    return;
  }
  kategoriMap = {};
  data.forEach((k) => {
    kategoriMap[k.nama_kategori] = k.id;
  });
}

// AMBIL DATA PRODUK DARI SUPABASE (join ke kategori biar dapat namanya)
async function loadProducts() {
  const { data, error } = await supabaseClient
    .from('produk')
    .select(
      'id, nama_produk, harga, gambar, deskripsi, id_kategori, kategori ( nama_kategori )'
    )
    .order('id', { ascending: true });

  if (error) {
    console.error('Gagal ambil produk:', error.message);
    return;
  }

  products = data.map((p) => ({
    id: p.id,
    name: p.nama_produk,
    category: p.kategori ? p.kategori.nama_kategori : '-',
    price: p.harga,
    image: p.gambar,
    description: p.deskripsi || 'Belum ada deskripsi untuk produk ini.',
  }));

  renderProducts();
}

// TOGGLE / BUKA / TUTUP FORM
function showForm(isEdit = false) {
  formContainer.style.display = 'block';
  formContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (!isEdit) {
    editingId = null;
    productForm.reset();
    formTitle.textContent = 'Tambah Produk Baru';
    submitFormBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Tambah Produk';
  }
}

function hideForm() {
  formContainer.style.display = 'none';
  editingId = null;
  productForm.reset();
}

toggleFormBtn.addEventListener('click', () => {
  if (formContainer.style.display === 'none' || editingId !== null) {
    showForm(false);
  } else {
    hideForm();
  }
});

closeFormBtn.addEventListener('click', hideForm);
cancelFormBtn.addEventListener('click', hideForm);

// RENDER PRODUK (murni tampilan, datanya sudah diambil dari Supabase)
function renderProducts() {
  const filtered = products.filter((p) => {
    const matchCategory =
      activeCategory === 'Semua' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  productGrid.innerHTML = '';
  emptyMsg.style.display = filtered.length === 0 ? 'block' : 'none';

  filtered.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'product-card';

    card.dataset.id = p.id;

    const mediaHTML = p.image
      ? `<img src="${p.image}" alt="${p.name}" class="product-image">`
      : `<div class="product-icon">🧶</div>`;

    card.innerHTML = `
      <div class="card-admin-actions">
        <button class="card-action-btn edit-btn" data-id="${p.id}" title="Edit Produk">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button class="card-action-btn delete-btn" data-id="${p.id}" title="Hapus Produk">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
      ${mediaHTML}
      <span class="category-tag">${p.category}</span>
      <h3>${p.name}</h3>
      <div class="product-price">${formatRupiah(p.price)}</div>
    `;
    productGrid.appendChild(card);
  });

  // Listener buka modal detail (klik di area card, selain tombol edit/hapus)
  document.querySelectorAll('.product-card').forEach((card) => {
    card.addEventListener('click', () => {
      openDetail(Number(card.dataset.id));
    });
  });

  document.querySelectorAll('.card-admin-actions .edit-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      startEditProduct(Number(btn.dataset.id));
    });
  });

  document
    .querySelectorAll('.card-admin-actions .delete-btn')
    .forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteProduct(Number(btn.dataset.id));
      });
    });
}

// PROSES SUBMIT FORM (TAMBAH / EDIT) -> langsung ke Supabase
productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('productName').value.trim();
  const categoryName = document.getElementById('productCategory').value;
  const price = Number(document.getElementById('productPrice').value);
  const image = document.getElementById('productImage').value.trim();
  const deskripsi = document.getElementById('productDeskripsi').value.trim();

  if (!name || price <= 0 || !image) return;

  const id_kategori = kategoriMap[categoryName];
  if (!id_kategori) {
    alert('Kategori tidak ditemukan di database.');
    return;
  }

  if (editingId) {
    // UPDATE produk yang sudah ada
    const { error } = await supabaseClient
      .from('produk')
      .update({
        nama_produk: name,
        id_kategori,
        harga: price,
        gambar: image,
        deskripsi,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingId);

    if (error) {
      alert('Gagal menyimpan perubahan: ' + error.message);
      return;
    }
  } else {
    // INSERT produk baru
    const { error } = await supabaseClient.from('produk').insert({
      nama_produk: name,
      id_kategori,
      harga: price,
      gambar: image,
      deskripsi,
    });

    if (error) {
      alert('Gagal menambah produk: ' + error.message);
      return;
    }
  }

  await loadProducts();
  hideForm();
});

// ISI FORM SAAT EDIT
function startEditProduct(id) {
  const p = products.find((item) => item.id === id);
  if (!p) return;

  editingId = id;
  document.getElementById('productId').value = p.id;
  document.getElementById('productName').value = p.name;
  document.getElementById('productCategory').value = p.category;
  document.getElementById('productPrice').value = p.price;
  document.getElementById('productImage').value = p.image || '';
  document.getElementById('productDeskripsi').value =
    p.description === 'Belum ada deskripsi untuk produk ini.'
      ? ''
      : p.description;

  formTitle.textContent = 'Edit Produk';
  submitFormBtn.innerHTML =
    '<i class="fa-solid fa-check"></i> Simpan Perubahan';
  showForm(true);
}

// HAPUS PRODUK -> buka modal konfirmasi dulu
function deleteProduct(id) {
  pendingDeleteId = id;
  deleteOverlay.classList.add('open');
}

function closeDeleteModal() {
  pendingDeleteId = null;
  deleteOverlay.classList.remove('open');
}

deleteCancelBtn.addEventListener('click', closeDeleteModal);
deleteOverlay.addEventListener('click', (e) => {
  if (e.target === deleteOverlay) closeDeleteModal();
});

deleteConfirmBtn.addEventListener('click', async () => {
  if (pendingDeleteId === null) return;

  const { error } = await supabaseClient
    .from('produk')
    .delete()
    .eq('id', pendingDeleteId);

  if (error) {
    alert('Gagal menghapus produk: ' + error.message);
    return;
  }

  closeDeleteModal();
  await loadProducts();
});

// FILTER & SEARCH (tetap di sisi tampilan, tidak perlu query ulang ke server)
categoryFilter.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document
    .querySelectorAll('.chip')
    .forEach((c) => c.classList.remove('active'));
  chip.classList.add('active');
  activeCategory = chip.dataset.category;
  renderProducts();
});

searchInput.addEventListener('input', (e) => {
  searchTerm = e.target.value;
  renderProducts();
});

// MODAL DETAIL PRODUK
function openDetail(id) {
  const p = products.find((item) => item.id === id);
  if (!p) return;

  detailImage.src = p.image || '';
  detailImage.alt = p.name;
  detailCategory.textContent = p.category;
  detailName.textContent = p.name;
  detailPrice.textContent = formatRupiah(p.price);
  detailDesc.textContent = p.description;

  detailOverlay.classList.add('open');
}

function closeDetail() {
  detailOverlay.classList.remove('open');
}

detailCloseBtn.addEventListener('click', closeDetail);
detailOverlay.addEventListener('click', (e) => {
  if (e.target === detailOverlay) closeDetail();
});

// RUN
(async function init() {
  await loadKategori();
  await loadProducts();
})();
