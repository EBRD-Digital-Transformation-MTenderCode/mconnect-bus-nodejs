export interface IContractRegisterPayload {
  header: IHeader;
  benef: IBenef[];
  details: IDetail[];
}

export interface IHeader {
  id_dok: string;
  nr_dok: string;
  da_dok: string;

  suma: number;
  kd_val: string;

  pkd_fisk: string;
  pname: string;
  pkd_sdiv?: string;

  bkd_fisk: string;
  bname: string;
  bkd_sdiv?: string;

  desc: string;

  reg_nom?: string;
  reg_date?: string;

  achiz_nom: string;
  achiz_date: string;

  avans?: number;
  da_expire: string;
  c_link: string;
}

export interface IBenef {
  id_dok: string;
  bbic: string;
  biban: string;
}

export interface IDetail {
  id_dok: string;
  suma: number;
  piban: string;
  byear: number;
}
