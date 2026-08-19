import { get, post, put, del } from "./api";

export interface Profile {
  name: string;
  displayName: string;
  active: boolean;
  modelCount: number;
  /** ISO-8601 timestamp of the last modification to this profile. */
  updatedAt: string;
}

export interface ProfileAssignment {
  provider: string;
  model: string;
  variant: string;
}

export interface CreateProfilePayload {
  name: string;
  assignments: Record<string, ProfileAssignment>;
}

export async function listProfiles(): Promise<{ profiles: Profile[] }> {
  return get("/profiles");
}

export async function createProfile(
  payload: CreateProfilePayload,
): Promise<unknown> {
  return post("/profiles", payload);
}

export async function switchProfile(name: string): Promise<unknown> {
  return post(`/profiles/${encodeURIComponent(name)}/switch`);
}

export async function deleteProfile(name: string): Promise<unknown> {
  return del(`/profiles/${encodeURIComponent(name)}`);
}

export async function updateProfile(
  name: string,
  assignments: Record<string, { provider: string; model: string; variant: string }>,
): Promise<unknown> {
  return put(`/profiles/${encodeURIComponent(name)}`, { assignments });
}
