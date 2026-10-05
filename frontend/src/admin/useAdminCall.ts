import { useCallback } from "react";
import { ApiError } from "../api/client";
import { useI18n } from "../i18n/LanguageContext";
import { useAdmin } from "../state/Admin";
import { useToast } from "../state/Toast";

/** Runs an admin API call; signs the owner out if the session has ended. */
export function useAdminCall() {
  const { expire } = useAdmin();
  const toast = useToast();
  const { t } = useI18n();
  return useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        expire();
        toast(t("session_expired"));
      }
      throw err;
    }
  }, [expire, toast, t]);
}
