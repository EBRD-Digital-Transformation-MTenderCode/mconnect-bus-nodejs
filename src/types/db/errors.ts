import { IErrorMessage } from '../messages';

export interface IErrorsRow {
  id: string; // "09ad2551-89c1-49ab-adaa-28d2a6a9eb74"
  hash: string; // "999948e6130d134a63a6431c3055f561"
  ts: number; // 1579706912
  data: string; // {...}
  message_kafka: IErrorMessage;
  ts_send?: number | null; // 1579706912
  fixed: boolean; // false
  fixed_ts?: number | null; // 1579706912
  fixed_desc?: string | null; // "..."
}
