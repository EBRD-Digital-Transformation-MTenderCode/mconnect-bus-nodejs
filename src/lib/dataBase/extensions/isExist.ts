import db from '../index';

export type TIsExist = (
  table: string,
  { field, value }: { field: string; value: string }
) => Promise<{ exists: boolean }>;

const isExist: TIsExist = (table, { field, value }) => {
  const query = `
    SELECT EXISTS
    (
      SELECT 1 FROM ${table}
      WHERE ${field} = ${typeof value === 'string' ? `'${value}'` : value}
      LIMIT 1
    )
  `;

  return db.one(query);
};

export default isExist;
