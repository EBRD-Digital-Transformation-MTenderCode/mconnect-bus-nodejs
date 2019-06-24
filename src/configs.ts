import { AxiosRequestConfig } from 'axios';

import './lib/env';

import { IContractRegisterRequestBody, TStatusCode } from './types';

const ppBaseUrl = process.env.PP_BASE_URL || '';

const treasuryBaseUrl = process.env.TREASURY_BASE_URL || '';

export const kafkaClientConfig = {
  kafkaHost: process.env.KAFKA_HOST || '',
  connectTimeout: 10000,
  requestTimeout: 10000,
};

export const kafkaInConsumerConfig = {
  inTopic: process.env.IN_TOPIC || '',
  inPartition: +(process.env.IN_PARTITION || '0'),
  inGroupId: process.env.IN_GROUP_ID || '',
};

export const dbConfig = {
  host: process.env.DB_HOST || '',
  port: +(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || '',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  tables: {
    kafkaIn: process.env.DB_TABLE_KAFKA_IN || '',
    kafkaOut: process.env.DB_TABLE_KAFKA_OUT || '',
    treasuryOut: process.env.DB_TABLE_TREASURY_OUT || '',
    treasuryIn: process.env.DB_TABLE_TREASURY_IN || '',
  },
};

export const request = {
  getEntityRelease: (cpid: string, ocid: string): AxiosRequestConfig => ({
    method: 'get',
    url: `${ppBaseUrl}/tenders/${cpid}/${ocid}`,
  }),
  postContractRegister: (data: IContractRegisterRequestBody): AxiosRequestConfig => ({
    method: 'post',
    url: `${treasuryBaseUrl}/api/v1/contract/register`,
    data,
  }),
  getContractsQueue: (statusNumber: TStatusCode): AxiosRequestConfig => ({
    method: 'get',
    url: `${treasuryBaseUrl}/api/v1/contract/queue?status=${statusNumber}`,
  }),
  postCommitContract: (contractId: string): AxiosRequestConfig => ({
    method: 'post',
    url: `${treasuryBaseUrl}/api/v1/contract/confirm?id_dok=${contractId}`,
  }),
};