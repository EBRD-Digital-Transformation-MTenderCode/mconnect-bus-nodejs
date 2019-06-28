import axois from 'axios';
import { request } from '../configs';

import logger from '../lib/logger';
// @TODO need add type for IRecord and for other entity
import { IAcRecord } from '../types';

export async function fetchEntityRecord(cpid: string, ocid: string): Promise<IAcRecord | undefined> {
  try {
    const { data } = await axois(request.getEntityRecordConfig(cpid, ocid));

    return data;
  } catch (error) {
    logger.error(`🗙 Error on fetch entity with ocid - ${ocid}: `, error);
  }
}