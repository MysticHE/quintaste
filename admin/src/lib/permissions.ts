export const roles = ['owner', 'operator', 'support', 'reviewer', 'auditor'] as const;
export type Role = typeof roles[number];
export type Capability = 'accounts' | 'cases' | 'content' | 'sellers' | 'operations' | 'integrations' | 'staff' | 'audit' | 'identity';
const grants: Record<Role, readonly Capability[]> = {
  owner: ['accounts','cases','content','sellers','operations','integrations','staff','audit','identity'],
  operator: ['operations','cases','content','sellers'], support: ['accounts','cases'],
  reviewer: ['cases','content','sellers','identity'], auditor: ['audit'],
};
export const can = (role: Role, capability: Capability) => grants[role]?.includes(capability) ?? false;
