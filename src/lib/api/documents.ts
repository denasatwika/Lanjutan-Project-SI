import { HttpError } from "../types/errors";
// import Cookies from "js-cookie";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8787";

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const message =
      (data as { error: string } | undefined)?.error ??
      response.statusText ??
      "Request failed";
    throw new HttpError(message, response.status);
  }

  return data as T;
}

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/users/login`,
  UPLOAD_DOCUMENTS: `${API_BASE_URL}/documents/upload`,
  GET_ALL_DOCUMENTS: `${API_BASE_URL}/documents`,
  GET_BATCH: (batchId: string) => `${API_BASE_URL}/documents/batch/${batchId}`,
  GET_DOCUMENT: (documentId: string) =>
    `${API_BASE_URL}/documents/${documentId}`,
  UPDATE_DOCUMENT: (documentId: string) =>
    `${API_BASE_URL}/documents/${documentId}`,
  GET_DOCUMENT_FILE: (filePath: string) =>
    `${API_BASE_URL}/documents/${filePath}`,
  VIEW_DOCUMENT: (filePath: string) =>
    `${API_BASE_URL}/documents/view/${filePath}`,
  // GET_CHIEF_DOCUMENTS: (userId: number) =>
  //   `${API_BASE_URL}/signers/documents?userId=${userId}`,
  GET_CHIEF_DOCUMENTS_2: `${API_BASE_URL}/signers/documents`,
  GET_DOCUMENT_TO_SIGN:(documentId: string) =>
    `${API_BASE_URL}/signers/documents/${documentId}/session`,
  SIGN_DOCUMENT: (documentId: string) => 
    `${API_BASE_URL}/signers/documents/${documentId}/sign`,
  GET_USER_SIGNATURE: `${API_BASE_URL}/signers/signature/me`,
  UPLOAD_SIGNATURE: `${API_BASE_URL}/signers/signature/upload`,
  SAVE_CANVAS_SIGNATURE: `${API_BASE_URL}/signers/signature/canvas`,
  GET_NOTIFICATIONS: `${API_BASE_URL}/signers/notifications`,
  REJECT_DOCUMENT: (documentId: string) =>
    `${API_BASE_URL}/signers/documents/${documentId}/reject`,
};

export type UploadResponse = {
  batchId: string;
};

export type Document = {
  id: string;
  title: string;
  filename: string;
  status: "draft" | "pending" | "signed" | "rejected";
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
};

export async function getAllDocuments(): Promise<Document[]> {
  const response = await fetch(API_ENDPOINTS.GET_ALL_DOCUMENTS, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return parseJson<Document[]>(response);
}

export async function getDocumentById(documentId: string): Promise<Document> {
  const response = await fetch(API_ENDPOINTS.GET_DOCUMENT(documentId), {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return parseJson<Document>(response);
}

export async function getDocumentsByBatchId(
  batchId: string,
): Promise<Document[]> {
  const response = await fetch(API_ENDPOINTS.GET_BATCH(batchId), {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return parseJson<Document[]>(response);
}

export async function uploadDocuments(
  formData: FormData,
): Promise<UploadResponse> {
  const response = await fetch(API_ENDPOINTS.UPLOAD_DOCUMENTS, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  return parseJson<UploadResponse>(response);
}

export async function getMyDocumentsToSign(): Promise<Document[]> {
  const response = await fetch(API_ENDPOINTS.GET_CHIEF_DOCUMENTS_2, {
    method: "GET",
    credentials: "include", 
    headers: {
      "Content-Type": "application/json",
    },
  });
  return parseJson<Document[]>(response);
}

export interface UpdateDocumentPayload {
  title?: string;
  signers?: {
    userId: string;
    position: {
      page: number;
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }[];
}

// 2. Fungsi Patch Sederhana
export async function updateDocument(
  documentId: string,
  payload: UpdateDocumentPayload,
) {
  const response = await fetch(API_ENDPOINTS.UPDATE_DOCUMENT(documentId), {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  // Mengembalikan hasil parseJson (apa adanya)
  return parseJson(response);
}
