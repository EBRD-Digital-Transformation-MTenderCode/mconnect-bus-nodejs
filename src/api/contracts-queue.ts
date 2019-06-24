import axois from 'axios';
import { request } from '../configs';

import { IContractQueueResponseBody, TStatusCode } from '../types';

export async function fetchContractsQueue(statusCode: TStatusCode): Promise<IContractQueueResponseBody | undefined> {
  try {
    const { data } = await axois(request.getContractsQueue(statusCode));
    return data;
  } catch (e) {
    console.log('!!!ERROR', e);
  }
}