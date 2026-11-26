import { axiosClient } from "@/api/axiosClient";
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  User,
} from "@/types/api";

/** Auth and profile endpoints. Each function only calls the API and returns `response.data`. */

export async function register(
  payload: RegisterPayload,
): Promise<AuthResponse> {
  const { data } = await axiosClient.post<AuthResponse>(
    "/auth/register",
    payload,
  );
  return data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await axiosClient.post<AuthResponse>(
    "/auth/login",
    payload,
  );
  return data;
}

export async function fetchMe(): Promise<User> {
  const { data } = await axiosClient.get<User>("/me");
  return data;
}

export async function updateMe(payload: UpdateProfilePayload): Promise<User> {
  const { data } = await axiosClient.patch<User>("/me", payload);
  return data;
}
