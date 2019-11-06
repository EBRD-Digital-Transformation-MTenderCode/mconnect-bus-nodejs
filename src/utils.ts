import { IParty, TRole } from './types/entity';

export const tsToPgTs = (ts: number): string => {
  const tsStr = `${ts}`;

  return `${tsStr.substr(0, 10)}.${tsStr.substr(-3)}`;
};

export const findOrganizationFromRole = (parties: IParty[], role: TRole) => {
  return parties.find(part => {
    return part.roles.some(organizationRole => organizationRole === role);
  });
};
