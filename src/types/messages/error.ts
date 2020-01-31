export interface IErrorMessage {
  id: string;
  date: string;
  service: {
    id: string;
    name: string;
    version: string;
  };
  errors: IErrorInfo[];
}

export interface IErrorInfo {
  code: string;
  description: string;
  metaData?: { [key: string]: string };
}
