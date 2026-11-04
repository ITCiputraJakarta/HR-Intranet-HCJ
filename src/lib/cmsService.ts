/**
 * CMS Service for Home Landing Page & Career Portal
 * Synchronized with Firebase Firestore (systemConfig/home_cms, systemConfig/career_cms, career_jobs, career_applications)
 * and local storage fallback.
 */

import { doc, getDoc, setDoc, onSnapshot, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { sanitizeForFirestore, isFirestoreIdDeleted, markFirestoreIdDeleted } from './firestoreService';
import {
  HomeCmsContent,
  CareerCmsContent,
  CareerJobPosting,
  CareerApplication,
} from '../types';

const HOME_CMS_STORAGE_KEY = 'hcj_home_cms_v1';
const CAREER_CMS_STORAGE_KEY = 'hcj_career_cms_v1';
const CAREER_JOBS_STORAGE_KEY = 'hcj_career_jobs_v1';
const CAREER_APPLICATIONS_STORAGE_KEY = 'hcj_career_applications_v1';

// 1MB Maximum limit strictly enforced for PDF CV uploads
export const MAX_PDF_BYTES = 1048576; // 1 MB = 1024 * 1024 bytes

export const DEFAULT_HOME_CMS: HomeCmsContent = {
  heroTitlePrefix: '',
  heroTitleHighlight: 'Portal Internal',
  heroTitleSuffix: '& Informasi Karir Hotel Ciputra Jakarta',
  heroSubtitle:
    'Pusat informasi terpadu yang memberikan kemudahan akses data operasional, pengumuman HR, hingga peluang pengembangan karir bagi seluruh jajaran staf dan calon kandidat profesional kami.',
  heroImageUrl:
    'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  ctaExploreText: 'Jelajahi Portal',
  ctaVideoText: 'Tonton Panduan',
  floatingCard1: {
    title: 'Jadwal Shift Terkini',
    subtitle: 'Update Sistem',
    status: 'Aktif',
    icon: 'calendar',
    badgeText: 'Live',
    badgeColor: 'emerald',
  },
  floatingCard2: {
    name: 'Bpk. Hendra (HR)',
    message: 'Notifikasi HR: Panduan Cuti & Form 2026...',
    avatarUrl: '',
    roleTag: 'HR',
    badgeText: 'Baru',
  },
  servicesTitle: 'Layanan Terintegrasi',
  servicesSubtitle:
    'Solusi digital menyeluruh untuk mendukung efisiensi kerja, pengembangan karir, dan kesejahteraan seluruh jajaran Hotel Ciputra Jakarta.',
  services: [
    {
      id: 'srv-1',
      icon: 'id-card',
      title: 'Sistem Informasi Karyawan',
      description:
        'Akses mudah untuk pembaruan data diri, riwayat absensi, pengajuan cuti, pergantian shift, dan pencetakan slip gaji secara mandiri.',
      color: 'indigo',
    },
    {
      id: 'srv-2',
      icon: 'chart-line',
      title: 'Pengembangan & Karir',
      description:
        'Pantau jenjang karir Anda, ikuti program E-Learning, tinjau KPI, dan temukan peluang promosi internal di seluruh departemen.',
      color: 'orange',
    },
    {
      id: 'srv-3',
      icon: 'heart',
      title: 'Kesejahteraan & Benefit',
      description:
        'Informasi lengkap terkait fasilitas kesehatan, klaim asuransi, program reward karyawan terbaik, dan jadwal employee gathering.',
      color: 'teal',
    },
  ],
  aboutTag: 'Mengapa Portal Ini Penting?',
  aboutTitle: 'Menghubungkan Setiap Elemen dalam Keluarga Besar Kami',
  aboutDescription:
    'Di Hotel Ciputra Jakarta, kami percaya bahwa komunikasi internal yang baik adalah kunci menuju Service Excellence. Portal ini dibangun secara khusus untuk menjembatani manajemen, HR, dan seluruh staf operasional.',
  aboutStatNumber: '100%',
  aboutStatLabel: 'Transparansi Data',
  aboutImage1: '',
  aboutImage2: '',
  aboutFeature1Title: 'Akses Terpusat',
  aboutFeature1Desc:
    'Tidak ada lagi kebingungan birokrasi, semua dokumen, formulir operasional, dan SOP tersedia di satu tempat.',
  aboutFeature2Title: 'Notifikasi Real-time',
  aboutFeature2Desc:
    'Pengumuman penting langsung masuk ke dashboard portal tanpa keterlambatan dan dapat dipantau seluruh tim.',
  aboutCtaText: 'Baca Pedoman Perusahaan',
  testimonialsTitle: 'Apa Kata Mereka?',
  testimonialsSubtitle:
    'Mendengar langsung pengalaman dari rekan kerja kita tentang bagaimana sistem internal ini membantu produktivitas dan perencanaan karir mereka di Hotel Ciputra.',
  testimonials: [],
  newsletterTitle: '',
  newsletterDescription: '',
  contactAddress:
    'Jl. Letnan Jenderal S. Parman No.11, Tanjung Duren Utara, Grogol Petamburan, Jakarta Barat 11470',
  contactEmail: 'it@hotelciputra.com',
  contactPhone: '+62 21 566 0640',
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_CAREER_CMS: CareerCmsContent = {
  heroTitle: 'JOIN OUR TEAM',
  heroSubtitle:
    'Menjadi bagian dari Hotel Ciputra Jakarta berarti bergabung dengan keluarga profesional perhotelan yang berdedikasi untuk memberikan pengalaman tak terlupakan. Bangun karir gemilang Anda bersama kami.',
  heroBgUrl: '',
  benefitsTag: 'BENEFITS & CULTURE',
  benefitsTitle: 'Mengapa Anda Harus Bergabung Bersama Kami',
  benefitsDescription:
    'Kami ingin Anda merasa seperti di rumah sendiri saat bekerja di Hotel Ciputra Jakarta. Untuk itu, kami telah menyusun serangkaian manfaat dan lingkungan kerja yang mendukung pertumbuhan profesional Anda.',
  benefits: [
    {
      id: 'b-1',
      icon: 'users',
      title: 'Lingkungan Kerja Positif',
      description:
        'Kami mengutamakan kerja sama tim dan saling menghargai. Di sini, setiap suara didengar dan kontribusi Anda dihargai.',
      color: 'blue',
    },
    {
      id: 'b-2',
      icon: 'shield',
      title: 'Masa Depan Terjamin',
      description:
        'Kami menawarkan paket kompensasi yang kompetitif, asuransi kesehatan komprehensif, dan program pensiun untuk ketenangan pikiran Anda.',
      color: 'green',
    },
    {
      id: 'b-3',
      icon: 'graduation-cap',
      title: 'Peluang Belajar',
      description:
        'Akses ke program pelatihan berkelanjutan, lokakarya, dan pendampingan untuk memastikan Anda terus berkembang di industri perhotelan.',
      color: 'purple',
    },
    {
      id: 'b-4',
      icon: 'chart-line',
      title: 'Jenjang Karir Jelas',
      description:
        'Kami memprioritaskan promosi dari dalam. Tunjukkan dedikasi Anda, dan kami akan membantu Anda mencapai posisi kepemimpinan.',
      color: 'orange',
    },
  ],
  openingsTag: 'COME JOIN US',
  openingsTitle: 'Lowongan Tersedia',
  openingsSubtitle:
    'Kami selalu mencari individu kreatif, berbakat, dan memiliki inisiatif tinggi untuk bergabung dengan keluarga besar Hotel Ciputra. Silakan cek posisi yang terbuka di bawah ini.',
  contactEmail: 'hrd@hotelciputra.com',
  contactPhone: '+62 21 566 0640',
  contactAddress:
    'Jl. Letnan Jenderal S. Parman No.11, Tanjung Duren Utara, Grogol Petamburan, Jakarta Barat 11470',
  updatedAt: new Date().toISOString(),
};

export const INITIAL_CAREER_JOBS: CareerJobPosting[] = [
  {
    id: 'job-fnb-1',
    title: 'Executive Chef',
    department: 'Food & Beverage',
    experience: 'Min. 5 Tahun',
    deadline: '20 Nov 2026',
    jobType: 'Full-time',
    description:
      'Memimpin operasional dapur hotel bintang 4, merancang menu inovatif, mengawasi standar kebersihan HACCP, serta membimbing tim kuliner.',
    requirements: [
      'Pengalaman minimal 5 tahun sebagai Executive Chef atau Executive Sous Chef di hotel berbintang.',
      'Kemampuan manajerial, kepemimpinan tim, dan kontrol biaya bahan makanan (food cost control).',
      'Pemahaman mendalam mengenai standar keamanan pangan HACCP.',
    ],
    status: 'Open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'job-fnb-2',
    title: 'Restaurant Manager',
    department: 'Food & Beverage',
    experience: 'Min. 3 Tahun',
    deadline: '15 Nov 2026',
    jobType: 'Full-time',
    description:
      'Mengelola jalannya restoran harian, meningkatkan kepuasan tamu, memimpin briefing staf layanan, dan menjaga target penjualan F&B.',
    requirements: [
      'Pendidikan minimal D3/S1 Perhotelan / Pariwisata.',
      'Pengalaman minimal 3 tahun di posisi yang sama.',
      'Kemampuan komunikasi bahasa Inggris yang fasih dan ramah.',
    ],
    status: 'Open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'job-fnb-3',
    title: 'Barista',
    department: 'Food & Beverage',
    experience: '1 - 2 Tahun',
    deadline: '30 Okt 2026',
    jobType: 'Full-time',
    description:
      'Meracik aneka minuman kopi dan mocktail berkualitas tinggi untuk lounge dan restoran, menjaga kebersihan area bar.',
    requirements: [
      'Pengalaman kerja sebagai barista minimal 1 tahun.',
      'Memahami kalibrasi espresso machine, latte art dasar, dan beverage presentation.',
      'Penampilan rapi, enerjik, dan berorientasi pada pelayanan pelanggan.',
    ],
    status: 'Open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'job-fnb-4',
    title: 'Banquet Waiter / Waitress',
    department: 'Food & Beverage',
    experience: 'Fresh Graduate',
    deadline: 'Terbuka',
    jobType: 'Daily Worker',
    description:
      'Melayani kebutuhan acara perjamuan, pernikahan, rapat korporat di ballroom dan meeting room Hotel Ciputra Jakarta.',
    requirements: [
      'Pria/Wanita, lulusan SMK Perhotelan / Pariwisata dipersilakan.',
      'Tinggi badan proporsional dan berpenampilan menarik.',
      'Bersedia bekerja sistem shift dan fleksibel saat ada event.',
    ],
    status: 'Open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'job-fo-1',
    title: 'Front Desk Agent',
    department: 'Front Office',
    experience: '1 - 2 Tahun',
    deadline: '05 Nov 2026',
    jobType: 'Full-time',
    description:
      'Menyambut tamu hotel, memproses check-in / check-out, mengelola sistem reservasi PMS, serta memberikan informasi fasilitas.',
    requirements: [
      'Pria/Wanita usia maksimal 27 tahun.',
      'Pendidikan minimal D3 Perhotelan.',
      'Kemampuan bahasa Inggris aktif lisan dan tulisan.',
      'Mampu mengoperasikan sistem hotel PMS (Property Management System).',
    ],
    status: 'Open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'job-fo-2',
    title: 'Guest Relation Officer',
    department: 'Front Office',
    experience: 'Min. 2 Tahun',
    deadline: '10 Nov 2026',
    jobType: 'Full-time',
    description:
      'Menangani tamu VIP, mengkoordinasikan kebutuhan khusus, dan memastikan pengalaman menginap berkesan sesuai standar bintang 4.',
    requirements: [
      'Pengalaman minimal 2 tahun di Front Office atau Guest Relations.',
      'Keterampilan komunikasi interpersonal yang luar biasa dan pemecahan masalah cepat.',
      'Kemampuan bahasa asing tambahan (Mandarin / Jepang) menjadi nilai tambah.',
    ],
    status: 'Open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'job-hk-1',
    title: 'Room Attendant',
    department: 'Housekeeping',
    experience: 'Fresh Graduate',
    deadline: 'Terbuka',
    jobType: 'Full-time',
    description:
      'Membersihkan dan merapikan kamar tamu sesuai standar kebersihan dan sanitasi hotel, mengelola persediaan linen dan amenities.',
    requirements: [
      'Pria/Wanita, jujur, disiplin, dan teliti.',
      'Lulusan SMA/SMK atau D1 Perhotelan.',
      'Kebugaran fisik prima dan berorientasi pada detail kerapian.',
    ],
    status: 'Open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// =========================================================================
// PDF VALIDATION (1MB LIMIT ENFORCED AS REQUESTED)
// =========================================================================

export function validatePdfCv(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'Silakan pilih berkas CV/Resume Anda.' };
  }

  // Must be PDF format
  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    return {
      valid: false,
      error: 'Format berkas tidak didukung! Berkas CV wajib berformat PDF (.pdf).',
    };
  }

  // Must not exceed 1MB (1,048,576 bytes)
  if (file.size > MAX_PDF_BYTES) {
    const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `Ukuran berkas (${fileSizeMb} MB) melebihi batas maksimal 1 MB! Silakan kompres atau pilih berkas PDF di bawah 1 MB.`,
    };
  }

  return { valid: true };
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// =========================================================================
// HOME CMS STORAGE & FIRESTORE
// =========================================================================

export function getHomeCmsContent(): HomeCmsContent {
  try {
    const local = localStorage.getItem(HOME_CMS_STORAGE_KEY);
    if (local) {
      return { ...DEFAULT_HOME_CMS, ...JSON.parse(local) };
    }
  } catch (e) {
    console.warn('Error reading local Home CMS:', e);
  }
  return DEFAULT_HOME_CMS;
}

export async function saveHomeCmsContent(content: HomeCmsContent): Promise<void> {
  const updated = { ...content, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(HOME_CMS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('LocalStorage save Home CMS error:', e);
  }

  if (isFirebaseConfigured()) {
    try {
      const ref = doc(db, 'systemConfig', 'home_cms');
      await setDoc(ref, sanitizeForFirestore(updated), { merge: true });
    } catch (e) {
      console.warn('Firestore save Home CMS error:', e);
    }
  }
}

export function subscribeToHomeCms(callback: (content: HomeCmsContent) => void): () => void {
  // Initial local delivery
  callback(getHomeCmsContent());

  if (!isFirebaseConfigured()) {
    return () => {};
  }

  try {
    const ref = doc(db, 'systemConfig', 'home_cms');
    return onSnapshot(
      ref,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as HomeCmsContent;
          const merged = { ...DEFAULT_HOME_CMS, ...data };
          try {
            localStorage.setItem(HOME_CMS_STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          callback(merged);
        }
      },
      (error) => {
        console.warn('Home CMS snapshot listener error:', error);
      }
    );
  } catch (e) {
    console.warn('subscribeToHomeCms failed:', e);
    return () => {};
  }
}

// =========================================================================
// CAREER CMS STORAGE & FIRESTORE
// =========================================================================

export function getCareerCmsContent(): CareerCmsContent {
  try {
    const local = localStorage.getItem(CAREER_CMS_STORAGE_KEY);
    if (local) {
      return { ...DEFAULT_CAREER_CMS, ...JSON.parse(local) };
    }
  } catch (e) {
    console.warn('Error reading local Career CMS:', e);
  }
  return DEFAULT_CAREER_CMS;
}

export async function saveCareerCmsContent(content: CareerCmsContent): Promise<void> {
  const updated = { ...content, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(CAREER_CMS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('LocalStorage save Career CMS error:', e);
  }

  if (isFirebaseConfigured()) {
    try {
      const ref = doc(db, 'systemConfig', 'career_cms');
      await setDoc(ref, sanitizeForFirestore(updated), { merge: true });
    } catch (e) {
      console.warn('Firestore save Career CMS error:', e);
    }
  }
}

export function subscribeToCareerCms(callback: (content: CareerCmsContent) => void): () => void {
  callback(getCareerCmsContent());

  if (!isFirebaseConfigured()) {
    return () => {};
  }

  try {
    const ref = doc(db, 'systemConfig', 'career_cms');
    return onSnapshot(
      ref,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as CareerCmsContent;
          const merged = { ...DEFAULT_CAREER_CMS, ...data };
          try {
            localStorage.setItem(CAREER_CMS_STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          callback(merged);
        }
      },
      (error) => {
        console.warn('Career CMS snapshot listener error:', error);
      }
    );
  } catch (e) {
    console.warn('subscribeToCareerCms failed:', e);
    return () => {};
  }
}

// =========================================================================
// CAREER JOBS STORAGE & FIRESTORE
// =========================================================================

export function getCareerJobs(): CareerJobPosting[] {
  try {
    const local = localStorage.getItem(CAREER_JOBS_STORAGE_KEY);
    if (local !== null) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) return parsed.filter((j) => !isFirestoreIdDeleted(j.id));
    }
  } catch (e) {
    console.warn('Error reading local career jobs:', e);
  }
  return INITIAL_CAREER_JOBS.filter((j) => !isFirestoreIdDeleted(j.id));
}

export async function saveCareerJobs(jobs: CareerJobPosting[]): Promise<void> {
  const clean = (jobs || []).filter((j) => !isFirestoreIdDeleted(j.id));
  try {
    localStorage.setItem(CAREER_JOBS_STORAGE_KEY, JSON.stringify(clean));
  } catch (e) {
    console.warn('LocalStorage save career jobs error:', e);
  }

  if (isFirebaseConfigured()) {
    try {
      for (const job of clean) {
        const ref = doc(db, 'career_jobs', job.id);
        await setDoc(ref, sanitizeForFirestore(job), { merge: true });
      }
    } catch (e) {
      console.warn('Firestore save career jobs error:', e);
    }
  }
}

export async function addOrUpdateCareerJob(job: CareerJobPosting): Promise<void> {
  const current = getCareerJobs();
  const existingIdx = current.findIndex((j) => j.id === job.id);
  let updatedList: CareerJobPosting[];
  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = { ...job, updatedAt: new Date().toISOString() };
  } else {
    updatedList = [
      { ...job, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ...current,
    ];
  }
  await saveCareerJobs(updatedList);
}

export async function deleteCareerJob(jobId: string): Promise<void> {
  markFirestoreIdDeleted(jobId);
  const current = getCareerJobs();
  const filtered = current.filter((j) => j.id !== jobId);
  try {
    localStorage.setItem(CAREER_JOBS_STORAGE_KEY, JSON.stringify(filtered));
  } catch {}

  if (isFirebaseConfigured()) {
    try {
      const ref = doc(db, 'career_jobs', jobId);
      await deleteDoc(ref);
    } catch (e) {
      console.warn('Firestore delete career job error:', e);
    }
  }
}

export function subscribeToCareerJobs(
  callback: (jobs: CareerJobPosting[]) => void
): () => void {
  callback(getCareerJobs());

  if (!isFirebaseConfigured()) {
    return () => {};
  }

  try {
    const colRef = collection(db, 'career_jobs');
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: CareerJobPosting[] = [];
          snapshot.forEach((d) => list.push(d.data() as CareerJobPosting));
          try {
            localStorage.setItem(CAREER_JOBS_STORAGE_KEY, JSON.stringify(list));
          } catch {}
          callback(list);
        }
      },
      (error) => {
        console.warn('Career jobs snapshot listener error:', error);
      }
    );
  } catch (e) {
    console.warn('subscribeToCareerJobs failed:', e);
    return () => {};
  }
}

// =========================================================================
// CAREER CANDIDATE APPLICATIONS & CVs (PDF Max 1MB)
// =========================================================================

export function getCareerApplications(): CareerApplication[] {
  try {
    const local = localStorage.getItem(CAREER_APPLICATIONS_STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) return parsed.filter((a) => !isFirestoreIdDeleted(a.id));
    }
  } catch (e) {
    console.warn('Error reading local career applications:', e);
  }
  return [];
}

export async function saveCareerApplications(
  apps: CareerApplication[]
): Promise<void> {
  const clean = (apps || []).filter((a) => !isFirestoreIdDeleted(a.id));
  try {
    localStorage.setItem(CAREER_APPLICATIONS_STORAGE_KEY, JSON.stringify(clean));
  } catch (e) {
    console.warn('LocalStorage save career applications error:', e);
  }

  if (isFirebaseConfigured()) {
    try {
      for (const app of clean) {
        const ref = doc(db, 'career_applications', app.id);
        await setDoc(ref, sanitizeForFirestore(app), { merge: true });
      }
    } catch (e) {
      console.warn('Firestore save career applications error:', e);
    }
  }
}

export async function submitCareerApplication(
  app: CareerApplication
): Promise<void> {
  const current = getCareerApplications();
  const updated = [app, ...current];
  await saveCareerApplications(updated);
}

export async function updateApplicationStatus(
  appId: string,
  status: 'Pending' | 'Reviewed' | 'Interview' | 'Rejected'
): Promise<void> {
  const current = getCareerApplications();
  const updated = current.map((a) => (a.id === appId ? { ...a, status } : a));
  await saveCareerApplications(updated);
}

export async function deleteCareerApplication(appId: string): Promise<void> {
  markFirestoreIdDeleted(appId);
  const current = getCareerApplications();
  const filtered = current.filter((a) => a.id !== appId);
  try {
    localStorage.setItem(CAREER_APPLICATIONS_STORAGE_KEY, JSON.stringify(filtered));
  } catch {}

  if (isFirebaseConfigured()) {
    try {
      const ref = doc(db, 'career_applications', appId);
      await deleteDoc(ref);
    } catch (e) {
      console.warn('Firestore delete application error:', e);
    }
  }
}

export function subscribeToCareerApplications(
  callback: (apps: CareerApplication[]) => void
): () => void {
  callback(getCareerApplications());

  if (!isFirebaseConfigured()) {
    return () => {};
  }

  try {
    const colRef = collection(db, 'career_applications');
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: CareerApplication[] = [];
          snapshot.forEach((d) => list.push(d.data() as CareerApplication));
          try {
            localStorage.setItem(CAREER_APPLICATIONS_STORAGE_KEY, JSON.stringify(list));
          } catch {}
          callback(list);
        }
      },
      (error) => {
        console.warn('Career applications snapshot listener error:', error);
      }
    );
  } catch (e) {
    console.warn('subscribeToCareerApplications failed:', e);
    return () => {};
  }
}
