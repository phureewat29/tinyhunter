export function bigIntJsonEncoder(key: any, value: any) {
  return typeof value === 'bigint' ? value.toString() : value;
}
