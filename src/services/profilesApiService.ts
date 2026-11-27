import { get, post, put, del } from "./api";
import type { ProfileStrategy } from "./profileStrategyService";

export interface Profile {
  name: string;
  displayName: string;
  active: boolean;
  modelCount: number;
  /** ISO-8601 timestamp of the last modification to this profile. */
  updatedAt: string;
  /** Active profile strategy detected from the config. */
  strategy?: ProfileStrategy;
  /** True when this generated profile is missing any of its ten phase agents. */
  incomplete?: boolean;
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

export interface ProfileDetail {
  name: string;
  assignments: Record<string, ProfileAssignment>;
}

export async function listProfiles(): Promise<{
  profiles: Profile[];
  strategy: ProfileStrategy;
}> {
  return get("/profiles");
}

export async function getProfileDetail(name: string): Promise<ProfileDetail> {
  const segment = name === "" ? "base" : encodeURIComponent(name);
  return get(`/profiles/${segment}`);
}

export async function createProfile(
  payload: CreateProfilePayload,
): Promise<unknown> {
  return post("/profiles", payload);
}

export async function switchProfile(name: string): Promise<unknown> {
  const segment = name === "" ? "base" : encodeURIComponent(name);
  return post(`/profiles/${segment}/switch`);
}

export async function deleteProfile(name: string): Promise<unknown> {
  return del(`/profiles/${encodeURIComponent(name)}`);
}

export async function updateProfile(
  name: string,
  assignments: Record<string, { provider: string; model: string; variant: string }>,
): Promise<unknown> {
  const segment = name === "" ? "base" : encodeURIComponent(name);
  return put(`/profiles/${segment}`, { assignments });
}

export async function repairProfile(name: string): Promise<unknown> {
  return post(`/profiles/${encodeURIComponent(name)}/repair`);
}
