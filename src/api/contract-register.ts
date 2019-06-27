import axios from 'axios';
import { request } from '../configs';

import logger from '../modules/logger';

import { IContractRegisterPayload, IContractRegisterResponse } from '../types';

export async function fetchContractRegister(treasuryBody: IContractRegisterPayload): Promise<IContractRegisterResponse | undefined> {
  try {
    const { data } = await axios(request.postContractRegisterConfig(treasuryBody));

    return data;
  } catch (error) {
    logger.error('🗙 Error on fetch contract register: ', error);
  }
}