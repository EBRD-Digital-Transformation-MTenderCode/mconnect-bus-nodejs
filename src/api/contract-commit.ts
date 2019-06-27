import axois from 'axios';
import { request } from '../configs';

import logger from '../modules/logger';

import { IContractCommitResponse } from '../types';

export async function fetchContractCommit(contractId: string): Promise<IContractCommitResponse | undefined> {
  try {
    const { data } = await axois(request.postCommitContractConfig(contractId));

    return data;
  } catch (error) {
    logger.error('🗙 Error on fetch contract commit: ', error);
  }
}