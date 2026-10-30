import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  type User,
} from '@firebase/auth';
import { auth } from './firebase.ts';
import type { Member, FinancialTransaction } from '../types/index.ts';

// Configured Workspace Scopes
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/documents.readonly',
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.body.readonly',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/tasks.readonly',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/presentations.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
];

// In-memory token storage (MANDATORY: Never in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const workspaceProvider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => workspaceProvider.addScope(scope));

// Init Auth Listener
export const initWorkspaceAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithWorkspace = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, workspaceProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan access token Google Workspace.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Workspace Sign In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getWorkspaceAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const disconnectWorkspace = async () => {
  cachedAccessToken = null;
  await auth.signOut();
};

/* =========================================================================
   1. GOOGLE FORMS API (forms.googleapis.com)
   ========================================================================= */
export interface ChurchFormQuestion {
  title: string;
  type: 'TEXT' | 'PARAGRAPH' | 'CHOICE';
  options?: string[];
  required?: boolean;
}

export async function createGoogleForm(
  token: string,
  title: string,
  description: string,
  questions: ChurchFormQuestion[]
) {
  // Step A: Create empty form
  const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      info: {
        title: title || 'Formulir Jemaat GMIT Betel Fuimelang',
        documentTitle: title || 'Formulir GMIT Betel Fuimelang',
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'Gagal membuat Google Form');
  }

  const formData = await createRes.json();
  const formId = formData.formId;

  // Step B: Batch update to add description and questions
  const requests: any[] = [];

  // Update description
  if (description) {
    requests.push({
      updateFormInfo: {
        info: {
          description,
        },
        updateMask: 'description',
      },
    });
  }

  // Add questions
  questions.forEach((q, idx) => {
    const questionItem: any = {
      title: q.title,
      question: {
        required: q.required ?? true,
      },
    };

    if (q.type === 'CHOICE' && q.options && q.options.length > 0) {
      questionItem.question.choiceQuestion = {
        type: 'RADIO',
        options: q.options.map((opt) => ({ value: opt })),
      };
    } else {
      questionItem.question.textQuestion = {
        paragraph: q.type === 'PARAGRAPH',
      };
    }

    requests.push({
      createItem: {
        item: {
          title: q.title,
          questionItem,
        },
        location: {
          index: idx,
        },
      },
    });
  });

  if (requests.length > 0) {
    const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });

    if (!updateRes.ok) {
      console.warn('Batch update question failed:', await updateRes.text());
    }
  }

  return {
    formId,
    responderUri: formData.responderUri,
    editUri: `https://docs.google.com/forms/d/${formId}/edit`,
    title,
  };
}

export async function fetchFormResponses(token: string, formId: string) {
  const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Gagal membaca respon form');
  }
  return res.json();
}

/* =========================================================================
   2. GOOGLE TASKS API (tasks.googleapis.com)
   ========================================================================= */
export interface ChurchTask {
  id?: string;
  title: string;
  notes?: string;
  due?: string; // RFC 3339 timestamp
  status?: 'needsAction' | 'completed';
}

export async function fetchTaskLists(token: string) {
  const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Gagal membaca daftar tugas');
  }
  return res.json();
}

export async function fetchTasks(token: string, taskListId: string = '@default') {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Gagal membaca tugas');
  }
  return res.json();
}

export async function createGoogleTask(
  token: string,
  taskListId: string = '@default',
  task: ChurchTask
) {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: task.title,
      notes: task.notes || '',
      due: task.due ? new Date(task.due).toISOString() : undefined,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Gagal membuat tugas di Google Tasks');
  }
  return res.json();
}

export async function updateGoogleTaskStatus(
  token: string,
  taskListId: string = '@default',
  taskId: string,
  completed: boolean
) {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: completed ? 'completed' : 'needsAction',
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Gagal memperbarui status tugas');
  }
  return res.json();
}

export async function deleteGoogleTask(
  token: string,
  taskListId: string = '@default',
  taskId: string
) {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Gagal menghapus tugas');
  }
  return true;
}

/* =========================================================================
   3. GOOGLE SHEETS API (sheets.googleapis.com)
   ========================================================================= */
export async function createSpreadsheetWithData(
  token: string,
  title: string,
  headers: string[],
  rows: (string | number)[][]
) {
  // Step 1: Create Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title || 'Data GMIT Betel Fuimelang',
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'Gagal membuat Google Spreadsheet');
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;

  // Step 2: Append rows
  const allValues = [headers, ...rows];
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: allValues,
      }),
    }
  );

  if (!appendRes.ok) {
    console.warn('Gagal append values ke sheet:', await appendRes.text());
  }

  return {
    spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    title,
  };
}

export async function exportMembersToGoogleSheets(token: string, members: Member[]) {
  const headers = [
    'No Anggota',
    'Nama Lengkap',
    'Peran Keluarga',
    'Jenis Kelamin',
    'Tanggal Lahir',
    'No HP',
    'Rayon Pelayanan',
    'Kategorial',
    'Status Anggota',
    'Baptis',
    'Sidi',
    'Nikah Gereja',
    'Alamat',
  ];

  const rows = members.map((m) => [
    m.memberNo,
    m.fullName,
    m.familyRole,
    m.gender,
    m.birthDate,
    m.phone,
    m.rayonName || m.rayonId,
    m.categorialGroupName || m.categorialGroupId,
    m.membershipStatus,
    m.baptismStatus,
    m.confirmationStatus,
    m.marriageChurchStatus,
    m.address,
  ]);

  const title = `Database Jemaat GMIT Betel Fuimelang — ${new Date().toISOString().substring(0, 10)}`;
  return createSpreadsheetWithData(token, title, headers, rows);
}

export async function exportFinanceToGoogleSheets(token: string, transactions: FinancialTransaction[]) {
  const headers = [
    'No Transaksi',
    'Tanggal',
    'Jenis (Pemasukan/Pengeluaran)',
    'Kategori Kas',
    'Nominal (Rp)',
    'Keterangan',
    'Dicatat Oleh',
  ];

  const rows = transactions.map((t) => [
    t.txNo,
    t.txDate,
    t.type,
    t.category,
    t.amount,
    t.description,
    t.recordedBy,
  ]);

  const title = `Buku Kas Keuangan GMIT Betel Fuimelang — ${new Date().toISOString().substring(0, 10)}`;
  return createSpreadsheetWithData(token, title, headers, rows);
}

/* =========================================================================
   4. GOOGLE DOCS API (docs.googleapis.com)
   ========================================================================= */
export interface GoogleDocFile {
  id: string;
  name: string;
  webViewLink?: string;
  createdTime?: string;
  modifiedTime?: string;
}

export async function createGoogleDoc(token: string, title: string, contentText: string) {
  // Step 1: Create Document
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: title || 'Dokumen Pelayanan GMIT Betel Fuimelang',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'Gagal membuat Google Doc');
  }

  const docData = await createRes.json();
  const documentId = docData.documentId;

  // Step 2: Insert text content
  if (contentText) {
    const insertRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: contentText + '\n\n— Dicetak dan disinkronkan dari SYSJEGER V2.1 Pro GMIT BETEL FUIMELANG\n',
            },
          },
        ],
      }),
    });

    if (!insertRes.ok) {
      console.warn('Batch update doc text failed:', await insertRes.text());
    }
  }

  return {
    documentId,
    url: `https://docs.google.com/document/d/${documentId}/edit`,
    title,
  };
}

export async function listGoogleDocs(token: string): Promise<GoogleDocFile[]> {
  const query = "trashed = false and mimeType = 'application/vnd.google-apps.document'";
  const url = `https://www.googleapis.com/drive/v3/files?pageSize=20&orderBy=modifiedTime desc&fields=files(id,name,mimeType,webViewLink,createdTime,modifiedTime)&q=${encodeURIComponent(query)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Gagal memuat daftar Google Docs');
  }

  const data = await res.json();
  return data.files || [];
}

export async function getGoogleDoc(token: string, documentId: string) {
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Gagal mengambil isi Google Doc');
  }

  return res.json();
}

/* =========================================================================
   5. GOOGLE SLIDES API (slides.googleapis.com)
   ========================================================================= */
export interface SlideOutlineItem {
  title: string;
  subtitle?: string;
  points: string[];
}

export async function createGooglePresentation(
  token: string,
  title: string,
  slides: SlideOutlineItem[]
) {
  // Step 1: Create presentation
  const createRes = await fetch('https://slides.googleapis.com/v1/presentations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: title || 'Liturgi & Ibadah GMIT Betel Fuimelang',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'Gagal membuat Google Slide');
  }

  const presData = await createRes.json();
  const presentationId = presData.presentationId;

  // Step 2: Add slides
  const requests: any[] = [];
  slides.forEach((slideItem, idx) => {
    const slideId = `slide_${idx}_${Date.now()}`;
    const textShapeId = `shape_${idx}_${Date.now()}`;

    // Create a blank slide
    requests.push({
      createSlide: {
        objectId: slideId,
        slideLayoutReference: {
          predefinedLayout: 'TITLE_AND_BODY',
        },
      },
    });
  });

  if (requests.length > 0) {
    await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });
  }

  return {
    presentationId,
    url: `https://docs.google.com/presentation/d/${presentationId}/edit`,
    title,
  };
}

/* =========================================================================
   6. GOOGLE DRIVE API (drive.googleapis.com) - List files
   ========================================================================= */
export async function listUserDriveFiles(token: string, mimeFilter?: string) {
  let q = "trashed = false and 'me' in owners";
  if (mimeFilter) {
    q += ` and mimeType = '${mimeFilter}'`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?pageSize=15&fields=files(id,name,mimeType,webViewLink,createdTime,modifiedTime)&q=${encodeURIComponent(
    q
  )}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Gagal memuat berkas Google Drive');
  }

  return res.json();
}
