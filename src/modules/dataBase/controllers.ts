import db from './';

import { IIn } from '../../types';


import { Message as IMessage } from 'kafka-node';

import { contractRegister } from "../../api";

export const saveIn = async (message: IMessage) => {
  console.log('--> Message received');

  const { offset, value } = message;

  try {
    const messageData: IIn = JSON.parse(`${value}`);

    // await dataBase.one(`INSERT INTO public.in VALUES($1, $2) RETURNING ocid`, [messageData.context.ocid, value]);

    contractRegister(messageData);

  } catch (e) {
    console.log(e.message);
  }
};