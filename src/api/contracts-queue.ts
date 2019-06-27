import axois from 'axios';
import { request } from '../configs';

import logger from '../modules/logger';

import { IContractQueueResponseBody, TStatusCode } from '../types';

export async function fetchContractsQueue(statusCode: TStatusCode): Promise<IContractQueueResponseBody | undefined> {
  try {
    const { data } = await axois(request.getContractsQueueConfig(statusCode));
    return data;
  } catch (e) {
    logger.error(e);
  }
}