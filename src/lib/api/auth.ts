import { HttpError } from "../types/errors";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8787";

type ErrorPayload = { error: string };

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? safeParseJSON(text) : undefined;

  if (!response.ok) {
    const message =
      (data as ErrorPayload | undefined)?.error ??
      response.statusText ??
      "Request failed";
    throw new HttpError(message, response.status);
  }

  return data as T;
}

function safeParseJSON(input: string) {
  try {
    return JSON.parse(input);
  } catch {
    return undefined;
  }
}

type Role = "user" | "approver" | "admin";

type SessionPayload = {
  user: {
    id: string;
    address: string;
    roles: Role[];
    primaryRole: Role;
    name?: string;
    department?: string;
    departmentId?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string | null;
  };
};

export type LoginChallengeResponse = {
  stage: "CHALLENGE";
  address: string;
  nonce: string;
  message: string;
  expiresAt: string;
};

export type LoginSessionResponse = SessionPayload & {
  stage: "SESSION";
};

type LoginResponse = LoginChallengeResponse | LoginSessionResponse;

type LoginChallengeRequest = {
  address: string;
};

type LoginVerifyRequest = {
  address: string;
  nonce: string;
  signature: string;
};

type LoginRequestPayload = LoginChallengeRequest | LoginVerifyRequest;

export async function postLogin(
  payload: LoginRequestPayload,
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseJson<LoginResponse>(response);
}

export async function getSession(): Promise<SessionPayload | null> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    method: "GET",
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  return parseJson<SessionPayload>(response);
}

export async function postLogout(): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  await parseJson<{ ok: true }>(response);
}
