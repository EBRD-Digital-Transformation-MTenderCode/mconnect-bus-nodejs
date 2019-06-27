import axios from 'axios';
import { request } from '../configs';

import { IContractRegisterPayload, IContractRegisterResponse } from '../types';

export async function fetchContractRegister(treasuryBody: IContractRegisterPayload): Promise<IContractRegisterResponse | undefined> {
  try {
    const { data } = await axios(request.postContractRegisterConfig(treasuryBody));

    return data;
  } catch (e) {
    console.log(e);
  }
}