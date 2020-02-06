import * as yup from 'yup';

import { patterns } from '../utils';

export const registrationPayloadSchema = yup.object().shape({
  header: yup
    .object()
    .shape({
      id_dok: yup
        .string()
        .matches(patterns.contractId)
        .required(),
      nr_dok: yup
        .string()
        .matches(patterns.ocidContract)
        .required(),
      da_dok: yup
        .string()
        .matches(patterns.date)
        .required(),
      suma: yup
        .number()
        .moreThan(0)
        .required(),
      kd_val: yup
        .string()
        .length(3)
        .required(),
      pkd_fisk: yup.string().required(),
      pkd_sdiv: yup.string(),
      pname: yup.string().required(),
      bkd_fisk: yup.string().required(),
      bkd_sdiv: yup.string(),
      bname: yup.string().required(),
      desc: yup.string().required(),
      achiz_nom: yup
        .string()
        .matches(patterns.ocidTender)
        .required(),
      achiz_date: yup
        .string()
        .matches(patterns.date)
        .required(),
      avans: yup
        .number()
        .moreThan(0)
        .lessThan(100),
      da_expire: yup
        .string()
        .matches(patterns.date)
        .required(),
      c_link: yup
        .string()
        .url()
        .required(),
    })
    .required(),
  benef: yup
    .array()
    .of(
      yup.object().shape({
        id_dok: yup
          .string()
          .matches(patterns.contractId)
          .required(),
        bbic: yup.string().required(),
        biban: yup.string().required(),
      })
    )
    .min(1)
    .required(),
  details: yup
    .array()
    .of(
      yup.object().shape({
        id_dok: yup
          .string()
          .matches(patterns.contractId)
          .required(),
        suma: yup
          .number()
          .moreThan(0)
          .required(),
        piban: yup.string().required(),
        byear: yup
          .number()
          .integer()
          .moreThan(2000)
          .lessThan(3000)
          .required(),
      })
    )
    .min(1)
    .required(),
});
