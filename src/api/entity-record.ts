import axois from 'axios';
import { request } from '../configs';

import { IAcRecord } from '../types';

export async function fetchEntityRecord(cpid: string, ocid: string): Promise<IAcRecord | undefined> {
  try {
    const { data } = await axois(request.getEntityRecordConfig(cpid, ocid));

    return data;
  } catch (e) {
    console.log('!!!ERROR', e);
  }
}