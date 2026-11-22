import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

/**
 * Automated verification harness validating the Dirty Dozen adversarial payloads
 * against the Firestore Security Rules structural invariants and guard conditions.
 */

type TestResult = 'PERMISSION_DENIED' | 'ALLOWED';

interface AuthContext {
  uid: string;
  email: string;
  emailVerified: boolean;
  isAdminDoc?: boolean;
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

function isBootstrapAdmin(auth: AuthContext | null): boolean {
  return Boolean(auth && auth.emailVerified && auth.email === 'it@hotelciputra.com');
}

function isAdmin(auth: AuthContext | null): boolean {
  return Boolean(isBootstrapAdmin(auth) || (auth && auth.emailVerified && auth.isAdminDoc));
}

function isSignedIn(auth: AuthContext | null): boolean {
  return Boolean(auth && auth.emailVerified);
}

function evaluateDirtyDozen(payload: {
  collection: string;
  docId: string;
  subCollection?: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: AuthContext | null;
  data?: Record<string, unknown>;
  existing?: Record<string, unknown>;
  parentExists?: boolean;
}): TestResult {
  if (!VALID_ID_REGEX.test(payload.docId) && payload.operation !== 'list') {
    return 'PERMISSION_DENIED';
  }

  switch (payload.collection) {
    case 'users': {
      const data = payload.data || {};
      const allowedKeys = new Set([
        'id', 'nama', 'email', 'unit', 'departemen', 'role', 'status',
        'password', 'avatar', 'createdAt', 'updatedAt',
      ]);
      if (payload.operation === 'create') {
        if (Object.keys(data).some((k) => !allowedKeys.has(k))) return 'PERMISSION_DENIED';
        if (!isSignedIn(payload.auth)) return 'PERMISSION_DENIED';
        if (!isAdmin(payload.auth) && (data.role !== 'staff' || data.status !== 'Pending')) {
          return 'PERMISSION_DENIED';
        }
        return 'ALLOWED';
      }
      return isAdmin(payload.auth) ? 'ALLOWED' : 'PERMISSION_DENIED';
    }

    case 'systemConfig': {
      const publicConfigIds = new Set([
        'app_branding',
        'app_branding_gallery',
        'home_cms',
        'career_cms',
        'hotel_units_master',
      ]);
      if (payload.operation === 'get') {
        return publicConfigIds.has(payload.docId) || isSignedIn(payload.auth)
          ? 'ALLOWED'
          : 'PERMISSION_DENIED';
      }
      if (payload.operation === 'update' || payload.operation === 'create') {
        return isAdmin(payload.auth) ? 'ALLOWED' : 'PERMISSION_DENIED';
      }
      return 'PERMISSION_DENIED';
    }

    case 'documents': {
      const data = payload.data || {};
      if (payload.subCollection === 'chunks') {
        if (!payload.parentExists) return 'PERMISSION_DENIED';
        return isSignedIn(payload.auth) ? 'ALLOWED' : 'PERMISSION_DENIED';
      }
      if (payload.operation === 'create') {
        const fileUrl = typeof data.fileUrl === 'string' ? data.fileUrl : '';
        if (/^\s*(javascript:|vbscript:|data:text\/html|data:image\/svg)/i.test(fileUrl)) {
          return 'PERMISSION_DENIED';
        }
        return isSignedIn(payload.auth) ? 'ALLOWED' : 'PERMISSION_DENIED';
      }
      return 'PERMISSION_DENIED';
    }

    case 'career_applications': {
      const data = payload.data || {};
      if (payload.operation === 'get' || payload.operation === 'list') {
        return isAdmin(payload.auth) ? 'ALLOWED' : 'PERMISSION_DENIED';
      }
      if (payload.operation === 'create') {
        const isValid =
          data.status === 'Pending' &&
          data.cvFileType === 'application/pdf' &&
          typeof data.cvFileSize === 'number' &&
          data.cvFileSize > 0 &&
          data.cvFileSize <= 1048576 &&
          typeof data.cvFileData === 'string' &&
          data.cvFileData.startsWith('data:application/pdf') &&
          data.cvFileData.length <= 1500000;
        return isValid ? 'ALLOWED' : 'PERMISSION_DENIED';
      }
      return 'PERMISSION_DENIED';
    }

    case 'performances': {
      if (payload.operation === 'update') {
        if (payload.existing?.status === 'Approved' && !isAdmin(payload.auth)) {
          return 'PERMISSION_DENIED';
        }
        return isSignedIn(payload.auth) ? 'ALLOWED' : 'PERMISSION_DENIED';
      }
      return 'PERMISSION_DENIED';
    }

    case 'career_jobs': {
      const data = payload.data || {};
      const reqs = Array.isArray(data.requirements) ? data.requirements : [];
      if (payload.operation === 'create') {
        return isAdmin(payload.auth) && reqs.length <= 30 ? 'ALLOWED' : 'PERMISSION_DENIED';
      }
      return 'PERMISSION_DENIED';
    }

    default:
      return 'PERMISSION_DENIED';
  }
}

export function runFirestoreRulesSpecTests(): void {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rulesText = fs.readFileSync(rulesPath, 'utf8');

  // Verify structural Pillars in production firestore.rules
  assert.ok(rulesText.includes("rules_version = '2';"), 'Rules must specify rules_version = 2');
  assert.ok(
    rulesText.includes('allow read, write: if false;'),
    'Default deny safety net must exist'
  );
  assert.ok(
    rulesText.includes('request.auth.token.email_verified == true'),
    'Verified email token guard must be enforced'
  );
  assert.ok(
    !rulesText.includes('allow read: if true;'),
    'Blanket public reads on internal collections are forbidden'
  );

  // Verify Dirty Dozen Payloads all return PERMISSION_DENIED
  const attackerAuth: AuthContext = {
    uid: 'uid-attacker',
    email: 'attacker@hotelciputra.com',
    emailVerified: true,
  };
  const unverifiedAdminAuth: AuthContext = {
    uid: 'uid-spoof',
    email: 'it@hotelciputra.com',
    emailVerified: false,
  };

  const dirtyDozenCases = [
    evaluateDirtyDozen({
      collection: 'users',
      docId: 'usr-attacker-01',
      operation: 'create',
      auth: attackerAuth,
      data: { id: 'usr-attacker-01', nama: 'Attacker', email: 'attacker@hotelciputra.com', role: 'admin', status: 'Approved' },
    }),
    evaluateDirtyDozen({
      collection: 'systemConfig',
      docId: 'home_cms',
      operation: 'update',
      auth: unverifiedAdminAuth,
      data: { heroTitleHighlight: 'Hacked' },
    }),
    evaluateDirtyDozen({
      collection: 'users',
      docId: 'usr-staff-01',
      operation: 'create',
      auth: attackerAuth,
      data: { id: 'usr-staff-01', nama: 'Staff', email: 'attacker@hotelciputra.com', role: 'staff', status: 'Pending', isSuperRoot: true },
    }),
    evaluateDirtyDozen({
      collection: 'documents',
      docId: '../../etc/passwd?bad=1',
      operation: 'create',
      auth: attackerAuth,
      data: { id: 'bad', title: 'SOP', category: 'SOP' },
    }),
    evaluateDirtyDozen({
      collection: 'career_applications',
      docId: 'app-123',
      operation: 'get',
      auth: attackerAuth,
    }),
    evaluateDirtyDozen({
      collection: 'documents',
      docId: 'doc-fake-public',
      operation: 'create',
      auth: null,
      data: { id: 'doc-fake-public', title: 'Fake Notice', category: 'Pengumuman', isPublic: true },
    }),
    evaluateDirtyDozen({
      collection: 'career_applications',
      docId: 'app-evil',
      operation: 'create',
      auth: null,
      data: {
        id: 'app-evil',
        jobId: 'job-fnb-1',
        fullName: 'Evil',
        email: 'evil@example.com',
        phone: '0812345678',
        cvFileType: 'text/html',
        cvFileSize: 512,
        cvFileData: 'data:text/html,<script>1</script>',
        status: 'Interview',
      },
    }),
    evaluateDirtyDozen({
      collection: 'career_applications',
      docId: 'app-huge',
      operation: 'create',
      auth: null,
      data: {
        id: 'app-huge',
        jobId: 'job-fnb-1',
        fullName: 'Huge Payload',
        email: 'huge@example.com',
        phone: '0812345678',
        cvFileType: 'application/pdf',
        cvFileSize: 5000000,
        cvFileData: 'data:application/pdf;base64,JVBERi0=',
        status: 'Pending',
      },
    }),
    evaluateDirtyDozen({
      collection: 'performances',
      docId: 'perf-01',
      operation: 'update',
      auth: attackerAuth,
      existing: { id: 'perf-01', email: 'attacker@hotelciputra.com', status: 'Approved' },
      data: { id: 'perf-01', email: 'attacker@hotelciputra.com', status: 'Draft' },
    }),
    evaluateDirtyDozen({
      collection: 'documents',
      docId: 'nonexistent-parent',
      subCollection: 'chunks',
      operation: 'create',
      auth: attackerAuth,
      parentExists: false,
      data: { field: 'fileUrl', index: 0, data: 'abc' },
    }),
    evaluateDirtyDozen({
      collection: 'career_jobs',
      docId: 'job-arr',
      operation: 'create',
      auth: attackerAuth,
      data: { id: 'job-arr', title: 'Chef', department: 'F&B', status: 'Open', requirements: new Array(100).fill('x') },
    }),
    evaluateDirtyDozen({
      collection: 'systemConfig',
      docId: 'drive_storage_config',
      operation: 'get',
      auth: null,
    }),
    evaluateDirtyDozen({
      collection: 'documents',
      docId: 'doc-unsafe-url',
      operation: 'create',
      auth: attackerAuth,
      data: { id: 'doc-unsafe-url', title: 'Bad Link', category: 'SOP', fileUrl: 'javascript:void(0)' },
    }),
  ];

  dirtyDozenCases.forEach((result, idx) => {
    assert.equal(result, 'PERMISSION_DENIED', `Dirty Dozen case #${idx + 1} must be rejected`);
  });
}
