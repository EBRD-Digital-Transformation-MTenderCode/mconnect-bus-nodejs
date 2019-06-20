export interface IRequestBody {
  header: IHeader,
  benef: IBenef[],
  details: IDetail[]
}

export interface IHeader {
  id_dok: string,
  nr_dok: string,
  da_dok: string,

  suma: number,
  kd_val: string,

  pkd_fisk: string,
  pkd_sdiv: string,
  pname: string,

  bkd_fisk: string,
  bkd_sdiv: string,
  bname: string,

  desc: string,

  reg_nom?: string,
  reg_date?: string,

  achiz_nom: string,
  achiz_dat: string,

  avans: string,
  da_expire: string,
  c_link: string
}

export interface IBenef {
  id_dok: string,
  bbic: string,
  biban: string
}

export interface IDetail {
  id_dok: string,
  suma: number,
  piban: string,
  byear: number
}