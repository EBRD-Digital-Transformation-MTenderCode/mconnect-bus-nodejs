import axois from 'axios';
import { request } from '../configs';

import { requestLogger } from '../modules/logger';

import { IContractQueueResponseBody, TStatusCode } from '../types';

export async function fetchContractsQueue(statusCode: TStatusCode): Promise<IContractQueueResponseBody | undefined> {
  try {
    const { data } = await axois(request.getContractsQueue(statusCode));
    return data;
  } catch (e) {
    requestLogger.error(e);
  }
}