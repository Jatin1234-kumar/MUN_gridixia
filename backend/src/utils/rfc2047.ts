const RFC2822_ATOM = /^[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~]+$/;

export function encodeDisplayName(name: string): string {
  if (RFC2822_ATOM.test(name) && name.length <= 75) {
    return name;
  }
  const encoded = Buffer.from(name, 'utf-8').toString('base64');
  return `=?UTF-8?B?${encoded}?=`;
}
