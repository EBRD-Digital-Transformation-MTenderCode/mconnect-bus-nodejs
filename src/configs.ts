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
  inGroupId: process.env.IN_GROUP_ID || '',
};

export const kafkaOutProducerConfig = {
  outTopic: process.env.OUT_TOPIC || '',
};

export const dbConfig = {
  host: process.env.DB_HOST || '',
  port: +(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || '',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  tables: {
    requests: process.env.DB_TABLE_REQUESTS || '',
    responses: process.env.db_table_RESPONSES || '',
    treasuryRequests: process.env.DB_TABLE_TREASURY_REQUESTS || '',
    treasuryResponses: process.env.DB_TABLE_TREASURY_RESPONSES || '',
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

export const loggerConfig = {
  maxFileSizeMb: process.env.LOG_FILE_SIZE_MB || '5',
  maxFilesSaveDays: process.env.LOG_FILES_SAVE_DAYS || '30',
};