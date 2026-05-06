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

export function hasPermission(permission, role, customMatrix = null) {
  if (!role) return false;

  const defaults = DEFAULT_MATRIX[role] || DEFAULT_MATRIX.MEMBER;
  if (!customMatrix) return defaults[permission] ?? false;

  const roleOverrides = customMatrix[role] || {};
  
  return roleOverrides[permission] ?? defaults[permission] ?? false;
}

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