/**
 * Serveur mock WARAH — présentation sans Supabase
 * node mock-server.js
 */
const http = require('http');

const PORT = 3001;

const MOCK_USER_OWNER = {
  id: 'mock-owner-001',
  email: 'demo@warah.com',
  firstName: 'Kwame',
  lastName: 'Asante',
  role: 'OWNER',
  phone: '+228 90 12 34 56',
  accountStatus: 'ACTIVE',
};

const MOCK_TOKEN = 'mock-jwt-token-presentation-warah';

const MOCK_DATA = {
  '/api/auth/login': {
    accessToken: MOCK_TOKEN,
    refreshToken: 'mock-refresh-token',
    user: MOCK_USER_OWNER,
  },
  '/api/auth/me': {
    ...MOCK_USER_OWNER,
    profile: { companyName: 'Immobilier Asante', bio: 'Gestionnaire immobilier à Lomé' },
  },
  '/api/auth/refresh': {
    accessToken: MOCK_TOKEN,
    refreshToken: 'mock-refresh-token',
  },
  '/api/dashboard': {
    kpis: {
      totalBiens: 12,
      biensOccupes: 9,
      totalLocataires: 9,
      revenusMensuels: 3_850_000,
      impayes: 2,
    },
    revenusMensuels: [
      { mois: '2026-01', montant: 3200000, paiements: 8 },
      { mois: '2026-02', montant: 3500000, paiements: 9 },
      { mois: '2026-03', montant: 3850000, paiements: 10 },
      { mois: '2026-04', montant: 3700000, paiements: 9 },
      { mois: '2026-05', montant: 4100000, paiements: 11 },
      { mois: '2026-06', montant: 3850000, paiements: 10 },
      { mois: '2026-07', montant: 4200000, paiements: 11 },
      { mois: '2026-08', montant: 1950000, paiements: 5 },
    ],
    derniersPaiements: [
      { id: 'p1', locataire: 'Ama Mensah', bien: 'Villa Tokoin', montant: 450000, statut: 'PAID' },
      { id: 'p2', locataire: 'Koffi Adjoua', bien: 'App. Bè', montant: 280000, statut: 'PENDING_CONFIRMATION' },
      { id: 'p3', locataire: 'Yaw Boateng', bien: 'Studio Adidogomé', montant: 180000, statut: 'PAID' },
      { id: 'p4', locataire: 'Abena Kofi', bien: 'Maison Agoè', montant: 350000, statut: 'OVERDUE' },
      { id: 'p5', locataire: 'Sena Attivor', bien: 'App. Agbalépédogan', montant: 300000, statut: 'PAID' },
    ],
    derniersBiens: [
      { id: 'b1', neighborhood: 'Tokoin', city: 'Lomé', type: 'VILLA', status: 'OCCUPIED', monthlyRent: 450000 },
      { id: 'b2', neighborhood: 'Bè', city: 'Lomé', type: 'APARTMENT', status: 'OCCUPIED', monthlyRent: 280000 },
      { id: 'b3', neighborhood: 'Adidogomé', city: 'Lomé', type: 'STUDIO', status: 'VACANT', monthlyRent: 180000 },
      { id: 'b4', neighborhood: 'Agoè', city: 'Lomé', type: 'APARTMENT', status: 'OCCUPIED', monthlyRent: 350000 },
      { id: 'b5', neighborhood: 'Agbalépédogan', city: 'Lomé', type: 'VILLA', status: 'RENOVATION', monthlyRent: 500000 },
    ],
  },
  '/api/properties': [
    { id: 'b1', address: '12 Rue des Baobabs', neighborhood: 'Tokoin', city: 'Lomé', type: 'VILLA', status: 'OCCUPIED', monthlyRent: 450000, monthlyCharges: 20000, description: 'Belle villa avec jardin', createdAt: '2024-01-15' },
    { id: 'b2', address: '45 Avenue Duisburg', neighborhood: 'Bè', city: 'Lomé', type: 'APARTMENT', status: 'OCCUPIED', monthlyRent: 280000, monthlyCharges: 15000, description: 'Appartement 3 pièces lumineux', createdAt: '2024-02-10' },
    { id: 'b3', address: '8 Cité Adidogomé', neighborhood: 'Adidogomé', city: 'Lomé', type: 'STUDIO', status: 'VACANT', monthlyRent: 180000, monthlyCharges: 8000, description: 'Studio moderne tout équipé', createdAt: '2024-03-05' },
    { id: 'b4', address: '3 Rue Agoè Nord', neighborhood: 'Agoè', city: 'Lomé', type: 'APARTMENT', status: 'OCCUPIED', monthlyRent: 350000, monthlyCharges: 12000, description: 'Appartement 4 pièces', createdAt: '2024-03-20' },
    { id: 'b5', address: '22 Bd Agbalépédogan', neighborhood: 'Agbalépédogan', city: 'Lomé', type: 'VILLA', status: 'RENOVATION', monthlyRent: 500000, monthlyCharges: 25000, description: 'Grande villa en rénovation', createdAt: '2024-04-01' },
    { id: 'b6', neighborhood: 'Hédzranawoé', city: 'Lomé', address: '17 Voie X', type: 'COMMERCIAL', status: 'VACANT', monthlyRent: 600000, monthlyCharges: 30000, description: 'Local commercial 80m²', createdAt: '2024-04-15' },
  ],
  '/api/tenants': [
    { id: 't1', firstName: 'Ama', lastName: 'Mensah', email: 'ama.mensah@gmail.com', phone: '+228 91 23 45 67', accountStatus: 'ACTIVE', createdAt: '2024-02-01' },
    { id: 't2', firstName: 'Koffi', lastName: 'Adjoua', email: 'koffi.adjoua@gmail.com', phone: '+228 92 34 56 78', accountStatus: 'ACTIVE', createdAt: '2024-03-15' },
    { id: 't3', firstName: 'Yaw', lastName: 'Boateng', email: 'yaw.boateng@gmail.com', phone: '+228 93 45 67 89', accountStatus: 'ACTIVE', createdAt: '2024-01-20' },
    { id: 't4', firstName: 'Abena', lastName: 'Kofi', email: 'abena.kofi@yahoo.fr', phone: '+228 94 56 78 90', accountStatus: 'ACTIVE', createdAt: '2024-04-10' },
    { id: 't5', firstName: 'Sena', lastName: 'Attivor', email: 'sena.attivor@gmail.com', phone: '+228 95 67 89 01', accountStatus: 'INVITED', createdAt: '2024-05-05' },
  ],
  '/api/payments': [
    { id: 'p1', paidAmount: 450000, status: 'PAID', paymentMethod: 'BANK_TRANSFER', paidAt: '2026-08-01', createdAt: '2026-08-01', lease: { tenant: { firstName: 'Ama', lastName: 'Mensah' }, property: { address: 'Villa Tokoin', city: 'Lomé' } } },
    { id: 'p2', paidAmount: 280000, status: 'PENDING_CONFIRMATION', paymentMethod: 'TMONEY', paidAt: null, createdAt: '2026-08-05', lease: { tenant: { firstName: 'Koffi', lastName: 'Adjoua' }, property: { address: 'App. Bè', city: 'Lomé' } } },
    { id: 'p3', paidAmount: 180000, status: 'PAID', paymentMethod: 'CASH', paidAt: '2026-07-31', createdAt: '2026-07-31', lease: { tenant: { firstName: 'Yaw', lastName: 'Boateng' }, property: { address: 'Studio Adidogomé', city: 'Lomé' } } },
    { id: 'p4', paidAmount: 350000, status: 'OVERDUE', paymentMethod: null, paidAt: null, createdAt: '2026-07-01', lease: { tenant: { firstName: 'Abena', lastName: 'Kofi' }, property: { address: 'Maison Agoè', city: 'Lomé' } } },
    { id: 'p5', paidAmount: 300000, status: 'PAID', paymentMethod: 'FLOOZ', paidAt: '2026-08-03', createdAt: '2026-08-03', lease: { tenant: { firstName: 'Sena', lastName: 'Attivor' }, property: { address: 'App. Agbalépédogan', city: 'Lomé' } } },
  ],
  '/api/admin/users': [
    { id: 'u1', firstName: 'Kwame', lastName: 'Asante', email: 'demo@warah.com', role: 'OWNER', accountStatus: 'ACTIVE', createdAt: '2024-01-01' },
    { id: 'u2', firstName: 'Ama', lastName: 'Mensah', email: 'ama.mensah@gmail.com', role: 'TENANT', accountStatus: 'ACTIVE', createdAt: '2024-02-01' },
    { id: 'u3', firstName: 'Jean', lastName: 'Dupont', email: 'jean.dupont@warah.com', role: 'MANAGER', accountStatus: 'ACTIVE', createdAt: '2024-03-01' },
    { id: 'u4', firstName: 'Koffi', lastName: 'Adjoua', email: 'koffi.adjoua@gmail.com', role: 'TENANT', accountStatus: 'ACTIVE', createdAt: '2024-03-15' },
  ],
  '/api/admin/stats': {
    totalUsers: 24,
    totalOwners: 8,
    totalManagers: 3,
    totalTenants: 13,
    totalProperties: 31,
    totalPaymentsThisMonth: 18,
    revenueThisMonth: 7_200_000,
  },
  '/api/mandates': [],
  '/api/mandates/received': [],
  '/api/listings': [],
  '/api/notifications': { items: [], total: 0 },
};

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function send(res, data, status = 200) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];
  console.log(`[MOCK] ${req.method} ${url}`);

  // Login — accepte n'importe quels identifiants
  if (req.method === 'POST' && url === '/api/auth/login') {
    return send(res, MOCK_DATA['/api/auth/login']);
  }

  // Refresh token
  if (req.method === 'POST' && url === '/api/auth/refresh') {
    return send(res, MOCK_DATA['/api/auth/refresh']);
  }

  // Signup — répond OK pour ne pas bloquer
  if (req.method === 'POST' && url.startsWith('/api/auth/signup')) {
    return send(res, { user: MOCK_USER_OWNER }, 201);
  }

  // Toutes les autres routes GET
  if (req.method === 'GET') {
    if (MOCK_DATA[url]) return send(res, MOCK_DATA[url]);

    // Routes avec ID dynamique (ex: /api/properties/b1)
    if (url.startsWith('/api/properties/')) {
      const id = url.split('/')[3];
      const bien = MOCK_DATA['/api/properties'].find(b => b.id === id) || MOCK_DATA['/api/properties'][0];
      return send(res, bien);
    }
    if (url.startsWith('/api/tenants/')) {
      const id = url.split('/')[3];
      const t = MOCK_DATA['/api/tenants'].find(x => x.id === id) || MOCK_DATA['/api/tenants'][0];
      return send(res, t);
    }
    if (url.startsWith('/api/payments/')) {
      return send(res, MOCK_DATA['/api/payments']);
    }
    if (url.startsWith('/api/admin/')) {
      return send(res, MOCK_DATA[url] || []);
    }
    if (url.startsWith('/api/exports/')) {
      // Retourne un mini PDF vide (non fonctionnel mais sans crash)
      res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="export.pdf"' });
      return res.end('%PDF-1.4 mock');
    }

    return send(res, [], 200);
  }

  // POST/PATCH/DELETE — répondent OK
  if (['POST', 'PATCH', 'DELETE'].includes(req.method)) {
    return send(res, { success: true, message: 'OK (mock)' });
  }

  send(res, { error: 'Not found' }, 404);
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔═══════════════════════════════════╗');
  console.log('  ║   WARAH Mock Server — port 3001   ║');
  console.log('  ╠═══════════════════════════════════╣');
  console.log('  ║  Login : demo@warah.com            ║');
  console.log('  ║  Mdp   : n importe quoi            ║');
  console.log('  ║  URL   : http://localhost:3000     ║');
  console.log('  ╚═══════════════════════════════════╝');
  console.log('');
});
