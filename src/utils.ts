export const tsToPgTs = (ts: number): string => {
  const tsStr = `${ts}`;
  
  return `${tsStr.substr(0, 10)}.${tsStr.substr(-3)}`;
};