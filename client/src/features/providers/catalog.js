const PROVIDER_DETAILS = {
  github: { label: 'GitHub', icon: 'github' },
  leetcode: { label: 'LeetCode', icon: 'leetcode' },
  codeforces: { label: 'Codeforces', icon: 'codeforces' },
  gitlab: { label: 'GitLab', icon: 'gitlab' },
  manual: { label: 'Private activity', icon: 'activity' }
};

export function providerLabel(providerId) {
  return PROVIDER_DETAILS[providerId]?.label ||
    providerId.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function providerIcon(providerId) {
  return PROVIDER_DETAILS[providerId]?.icon || 'activity';
}
