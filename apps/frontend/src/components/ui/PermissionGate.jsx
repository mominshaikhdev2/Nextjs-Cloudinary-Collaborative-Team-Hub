'use client';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { hasPermission } from '@/lib/permissions';

/**
 * PermissionGate
 * Renders children only if the current user has the given permission.
 *
 * Props:
 *   permission  - key from PERMISSIONS (e.g. 'createGoals')
 *   role        - override role (defaults to currentRole from store)
 *   fallback    - what to render when permission denied (default: null)
 *   invert      - show fallback when HAS permission (useful for lock icons)
 */
export default function PermissionGate({
  permission,
  role: roleProp,
  fallback = null,
  invert = false,
  children,
}) {
  const { currentRole, currentWorkspace } = useWorkspaceStore();
  const role = roleProp || currentRole;
  const customMatrix = currentWorkspace?.permissions || null;

  const allowed = hasPermission(permission, role, customMatrix);
  const shouldRender = invert ? !allowed : allowed;

  return shouldRender ? children : fallback;
}