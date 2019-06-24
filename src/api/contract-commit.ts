import axois from 'axios';
import { request } from '../configs';

import { IContractCommitResponse } from '../types';

export async function fetchContractCommit(contractId: string): Promise<IContractCommitResponse | undefined> {
  try {
    const { data } = await axois(request.postCommitContract(contractId));
    return data;
  } catch (e) {
    console.log('!!!ERROR', e);
  }
}