import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { IParty, TRole } from './types/entity';

dayjs.extend(utc);

export const tsToPgTs = (ts: number): string => {
  const tsStr = `${ts}`;

  return `${tsStr.substr(0, 10)}.${tsStr.substr(-3)}`;
};

export const findOrganizationFromRole = (parties: IParty[], role: TRole) => {
  return parties.find(part => {
    return part.roles.some(organizationRole => organizationRole === role);
  });
};

export const dateIsValid = (date: unknown): boolean => {
  return typeof date === 'string' && dayjs(date).isValid();
};

export const formatDate = (localDate: string | Date): string => {
  return `${dayjs.utc(localDate).format('YYYY-MM-DDTHH:mm:ss')}Z`;
};

export const prepareFieldValue = (value: unknown): string | undefined => {
  if (value !== null && typeof value === 'object' && !Object.keys(value as Record<string, any>).length) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }
};

const datePattern = '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z';
const cpidPattern = '^ocds-([a-z]|[0-9]){6}-[A-Z]{2}-[0-9]{13}';
const ocidTenderPattern = `${cpidPattern}-(EV|NP)-[0-9]{13}`;
const ocidContractPattern = `${cpidPattern}-AC-[0-9]{13}`;
const contractIdPattern = `${ocidContractPattern}-${datePattern}$`;

export const patterns = {
  date: new RegExp(datePattern),
  cpid: new RegExp(cpidPattern),
  ocidTender: new RegExp(ocidTenderPattern),
  ocidContract: new RegExp(ocidContractPattern),
  contractId: new RegExp(contractIdPattern),
};
