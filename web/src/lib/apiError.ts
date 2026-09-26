import axios from "axios";

interface ApiErrorResponse {
  errors?: Array<{ message?: string }>;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) return fallback;

  return error.response?.data?.errors?.[0]?.message ?? fallback;
}

export function getApiErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}
