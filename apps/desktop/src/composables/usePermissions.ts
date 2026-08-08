import { computed } from "vue";
import { canWrite, isAdmin, type UserRole } from "@hesabyar/shared";
import { useAuth } from "./useAuth";

export function usePermissions() {
  const { user } = useAuth();

  const role = computed(() => user.value?.role ?? ("VIEWER" as UserRole));
  const canMutate = computed(() => canWrite(role.value));
  const admin = computed(() => isAdmin(role.value));

  return { role, canMutate, isAdmin: admin };
}
