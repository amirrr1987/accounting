import axios from "axios";

function messageFromData(data: unknown): string | undefined {
  if (!data || typeof data !== "object" || !("message" in data)) {
    return undefined;
  }
  const message = data.message;
  if (typeof message === "string" && message.length > 0) {
    return message;
  }
  if (
    Array.isArray(message) &&
    message.length > 0 &&
    message.every((item): item is string => typeof item === "string")
  ) {
    return message.join("، ");
  }
  return undefined;
}

/** Extract a user-facing message from an unknown API/thrown error. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return (
      messageFromData(error.response?.data) ?? (error.message || fallback)
    );
  }
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return fallback;
}

/** HTTP status from an Axios error, if any. */
export function apiErrorStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) {
    return error.response?.status;
  }
  return undefined;
}
