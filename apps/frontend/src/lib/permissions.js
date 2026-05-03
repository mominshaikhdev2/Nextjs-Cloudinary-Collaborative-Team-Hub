/**
 * Advanced RBAC — Permission Matrix
 * Defines default permissions per role and allows workspace-level overrides.
 */

export const PERMISSIONS = {
  createGoals:        'createGoals',
  editAnyGoal:        'editAnyGoal',
  deleteAnyGoal:      'deleteAnyGoal',
  postAnnouncements:  'postAnnouncements',
  pinAnnouncements:   'pinAnnouncements',
  inviteMembers:      'inviteMembers',
  manageMembers:      'manageMembers',
  viewAnalytics:      'viewAnalytics',
  exportData:         'exportData',
  manageWorkspace:    'manageWorkspace',
  createActionItems:  'createActionItems',
  editAnyActionItem:  'editAnyActionItem',
  deleteAnyActionItem:'deleteAnyActionItem',
};

/** Default permission matrix — applied when workspace has no custom overrides */
export const DEFAULT_MATRIX = {
  ADMIN: {
    createGoals:         true,
    editAnyGoal:         true,
    deleteAnyGoal:       true,
    postAnnouncements:   true,
    pinAnnouncements:    true,
    inviteMembers:       true,
    manageMembers:       true,
    viewAnalytics:       true,
    exportData:          true,
    manageWorkspace:     true,
    createActionItems:   true,
    editAnyActionItem:   true,
    deleteAnyActionItem: true,
  },
  MEMBER: {
    createGoals:         true,
    editAnyGoal:         false,
    deleteAnyGoal:       false,
    postAnnouncements:   false,
    pinAnnouncements:    false,
    inviteMembers:       false,
    manageMembers:       false,
    viewAnalytics:       true,
    exportData:          false,
    manageWorkspace:     false,
    createActionItems:   true,
    editAnyActionItem:   false,
    deleteAnyActionItem: false,
  },
};

export const PERMISSION_LABELS = {
  createGoals:         'Create Goals',
  editAnyGoal:         'Edit Any Goal',
  deleteAnyGoal:       'Delete Any Goal',
  postAnnouncements:   'Post Announcements',
  pinAnnouncements:    'Pin Announcements',
  inviteMembers:       'Invite Members',
  manageMembers:       'Manage Members',
  viewAnalytics:       'View Analytics',
  exportData:          'Export Data',
  manageWorkspace:     'Manage Workspace Settings',
  createActionItems:   'Create Action Items',
  editAnyActionItem:   'Edit Any Action Item',
  deleteAnyActionItem: 'Delete Any Action Item',
};

export const PERMISSION_GROUPS = {
  'Goals': ['createGoals', 'editAnyGoal', 'deleteAnyGoal'],
  'Announcements': ['postAnnouncements', 'pinAnnouncements'],
  'Members': ['inviteMembers', 'manageMembers'],
  'Analytics': ['viewAnalytics', 'exportData'],
  'Action Items': ['createActionItems', 'editAnyActionItem', 'deleteAnyActionItem'],
  'Workspace': ['manageWorkspace'],
};

/**
 * Resolve a single permission for a given role,
 * merging workspace-level overrides on top of defaults.
 *
 * @param {string} permission  - key from PERMISSIONS
 * @param {string} role        - 'ADMIN' | 'MEMBER'
 * @param {object} customMatrix - workspace.permissions from API (may be null)
 */
export function hasPermission(permission, role, customMatrix = null) {
  if (!role) return false;

  const defaults = DEFAULT_MATRIX[role] || DEFAULT_MATRIX.MEMBER;
  if (!customMatrix) return defaults[permission] ?? false;

  const roleOverrides = customMatrix[role] || {};
  // Override takes precedence; fall back to default
  return roleOverrides[permission] ?? defaults[permission] ?? false;
}

/**
 * Build the resolved matrix for both roles, merging defaults + overrides.
 */
export function resolveMatrix(customMatrix = null) {
  const resolved = {};
  for (const role of ['ADMIN', 'MEMBER']) {
    resolved[role] = {};
    for (const perm of Object.keys(PERMISSIONS)) {
      resolved[role][perm] = hasPermission(perm, role, customMatrix);
    }
  }
  return resolved;
}